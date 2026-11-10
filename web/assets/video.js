// Chamada de vídeo ponto a ponto (WebRTC). A sinalização passa pelo Supabase Realtime (broadcast)
// em um canal cujo nome é a "sala" do atendimento (uuid aleatório que só o paciente e os médicos recebem).
//
// Papéis fixos: o MÉDICO sempre faz a oferta; o PACIENTE sempre responde. Isso evita colisão de ofertas.
// Mensagens (evento "sig"): oi | oferta | resposta | ice | tchau. Cada lado tem um id de sessão (muda a cada
// carregamento de página) e cada oferta tem um número "n": mensagens de negociações antigas são ignoradas.
//
// Sem servidor TURN: em parte das redes 4G a conexão não fecha. Depois de 30 s sem conectar, o estado vira
// "falhou" (a tela oferece o WhatsApp) e a chamada continua tentando em segundo plano.

const VIDEO = { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } };
const AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

export class Chamada {
  constructor({ sb, sala, papel, elLocal, elRemoto, iceServers, aoMudar }) {
    this.sb = sb;
    this.sala = sala;
    this.papel = papel;                 // 'medico' | 'paciente'
    this.elLocal = elLocal;
    this.elRemoto = elRemoto;
    this.iceServers = iceServers || [];
    this.aoMudar = aoMudar || (() => {});
    this.eu = crypto.randomUUID();
    this.par = null;
    this.pc = null;
    this.n = 0;
    this.pendentes = [];
    this.estado = 'preparando';         // preparando | aguardando | conectando | conectado | reconectando | falhou | encerrada
    this.ativa = true;
    this.micLigado = true;
    this.camLigada = true;
    this.frontal = true;
    this.semCamera = false;
    this.semMidia = false;
    this.erroMidia = '';
    this.jaConectou = false;
    this.ultimaOferta = 0;
    this.ultimoOi = 0;
  }

  conectado() { return this.pc?.connectionState === 'connected'; }

  mudar(estado) {
    if (!this.ativa) return;
    this.estado = estado;
    this.aoMudar(estado, this);
  }

  async iniciar() {
    await this.abrirMidia();
    if (!this.ativa) return;
    this.canal = this.sb.channel('sala:' + this.sala, { config: { broadcast: { self: false, ack: false } } });
    this.canal.on('broadcast', { event: 'sig' }, ({ payload }) => {
      this.receber(payload).catch((e) => console.warn('sinalização', e));
    });
    this.canal.subscribe((status) => {
      if (!this.ativa) return;
      if (status === 'SUBSCRIBED') {
        if (!this.pc) this.mudar('aguardando');
        this.oi();
      }
    });
    this.tOi = setInterval(() => { if (!this.conectado()) this.oi(); }, 2500);
    this.armarFalha();
  }

  armarFalha() {
    clearTimeout(this.tFalha);
    this.tFalha = setTimeout(() => { if (!this.conectado()) this.mudar('falhou'); }, 30000);
  }

  async abrirMidia() {
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) {
      this.stream = new MediaStream();
      this.semMidia = true;
      this.erroMidia = 'SemSuporte';
    } else {
      try {
        this.stream = await md.getUserMedia({ audio: AUDIO, video: VIDEO });
      } catch (e1) {
        try {
          this.stream = await md.getUserMedia({ audio: AUDIO });
          this.semCamera = true;
          this.erroMidia = e1.name;
        } catch (e2) {
          this.stream = new MediaStream();
          this.semMidia = true;
          this.erroMidia = e2.name;
        }
      }
    }
    if (!this.ativa) { this.stream.getTracks().forEach((t) => t.stop()); return; }
    this.camLigada = this.stream.getVideoTracks().length > 0;
    this.micLigado = this.stream.getAudioTracks().length > 0;
    this.elLocal.srcObject = this.stream;
    this.elLocal.play?.().catch(() => {});
  }

  enviar(tipo, dados = {}) {
    if (!this.canal || this.canal.state !== 'joined') return;
    this.canal.send({ type: 'broadcast', event: 'sig', payload: { de: this.papel, s: this.eu, tipo, ...dados } })
      .catch?.(() => {});
  }

  oi(refazer = false) {
    this.ultimoOi = Date.now();
    this.enviar('oi', refazer ? { refazer: true } : {});
  }

  async receber(p) {
    if (!this.ativa || !p || p.de === this.papel) return;

    if (p.tipo === 'tchau') {
      if (p.s === this.par) { this.fecharPc(); this.mudar('aguardando'); }
      return;
    }

    if (this.papel === 'medico') {
      if (p.tipo === 'oi') {
        const novoPar = p.s !== this.par;
        const parado = !this.pc || ['failed', 'closed'].includes(this.pc.connectionState);
        const demorou = !this.conectado() && Date.now() - this.ultimaOferta > 12000;
        const pediu = p.refazer && Date.now() - this.ultimaOferta > 3000;
        if (novoPar || parado || demorou || pediu) { this.par = p.s; await this.ofertar(); }
      } else if (p.tipo === 'resposta') {
        if (p.para !== this.eu || p.n !== this.n || this.pc?.signalingState !== 'have-local-offer') return;
        await this.pc.setRemoteDescription({ type: 'answer', sdp: p.sdp });
        await this.despejarPendentes();
      } else if (p.tipo === 'ice') {
        await this.candidato(p);
      }
      return;
    }

    // paciente
    if (p.tipo === 'oi') {
      if (!this.conectado() && Date.now() - this.ultimoOi > 1000) this.oi();
    } else if (p.tipo === 'oferta') {
      if (p.para !== this.eu) return;
      this.par = p.s;
      this.fecharPc();
      this.n = p.n;
      const pc = this.novoPc();
      await pc.setRemoteDescription({ type: 'offer', sdp: p.sdp });
      this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream));
      const resposta = await pc.createAnswer();
      await pc.setLocalDescription(resposta);
      this.enviar('resposta', { n: this.n, para: this.par, sdp: pc.localDescription.sdp });
      await this.despejarPendentes();
      this.mudar(this.jaConectou ? 'reconectando' : 'conectando');
    } else if (p.tipo === 'ice') {
      await this.candidato(p);
    }
  }

  async candidato(p) {
    if (p.para !== this.eu) return;
    if (p.n === this.n && this.pc?.remoteDescription) {
      try { await this.pc.addIceCandidate(p.c); } catch (e) { console.warn('candidato', e); }
    } else if (p.n >= this.n) {
      this.pendentes.push(p);
    }
  }

  async despejarPendentes() {
    const fila = this.pendentes.filter((p) => p.n === this.n);
    this.pendentes = this.pendentes.filter((p) => p.n > this.n);
    for (const p of fila) {
      try { await this.pc.addIceCandidate(p.c); } catch (e) { console.warn('candidato', e); }
    }
  }

  novoPc() {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const n = this.n;
    this.pc = pc;
    pc.onicecandidate = (e) => {
      if (e.candidate && pc === this.pc) this.enviar('ice', { n, para: this.par, c: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      if (pc !== this.pc) return;
      const fluxo = e.streams[0] || new MediaStream([e.track]);
      if (this.elRemoto.srcObject !== fluxo) this.elRemoto.srcObject = fluxo;
      this.elRemoto.play?.().catch(() => { this.somBloqueado = true; this.aoMudar(this.estado, this); });
    };
    pc.onconnectionstatechange = () => {
      if (pc !== this.pc || !this.ativa) return;
      const s = pc.connectionState;
      if (s === 'connected') {
        this.jaConectou = true;
        clearTimeout(this.tFalha);
        clearTimeout(this.tQueda);
        this.mudar('conectado');
      } else if (s === 'failed') {
        this.refazer();
      } else if (s === 'disconnected') {
        this.mudar('reconectando');
        clearTimeout(this.tQueda);
        this.tQueda = setTimeout(() => {
          if (pc === this.pc && pc.connectionState !== 'connected') this.refazer();
        }, 6000);
      }
    };
    return pc;
  }

  refazer() {
    if (!this.ativa) return;
    this.mudar('reconectando');
    this.armarFalha();
    if (this.papel === 'medico') {
      if (this.par) this.ofertar().catch((e) => console.warn('oferta', e));
    } else {
      this.oi(true);
    }
  }

  async ofertar() {
    this.fecharPc();
    this.n += 1;
    this.ultimaOferta = Date.now();
    const pc = this.novoPc();
    this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream));
    for (const tipo of ['audio', 'video']) {
      const tem = tipo === 'audio' ? this.stream.getAudioTracks().length : this.stream.getVideoTracks().length;
      if (!tem) pc.addTransceiver(tipo, { direction: 'recvonly' });
    }
    const oferta = await pc.createOffer();
    await pc.setLocalDescription(oferta);
    if (pc !== this.pc) return;
    this.enviar('oferta', { n: this.n, para: this.par, sdp: pc.localDescription.sdp });
    this.mudar(this.jaConectou ? 'reconectando' : 'conectando');
  }

  fecharPc() {
    clearTimeout(this.tQueda);
    if (!this.pc) return;
    const pc = this.pc;
    this.pc = null;
    pc.onicecandidate = pc.ontrack = pc.onconnectionstatechange = null;
    try { pc.close(); } catch { /* já fechada */ }
  }

  alternarMic() {
    const faixas = this.stream?.getAudioTracks() || [];
    if (!faixas.length) return false;
    this.micLigado = !this.micLigado;
    faixas.forEach((t) => { t.enabled = this.micLigado; });
    return this.micLigado;
  }

  alternarCam() {
    const faixas = this.stream?.getVideoTracks() || [];
    if (!faixas.length) return false;
    this.camLigada = !this.camLigada;
    faixas.forEach((t) => { t.enabled = this.camLigada; });
    return this.camLigada;
  }

  // Troca entre câmera frontal e traseira (útil para mostrar lesão, garganta, receita antiga).
  async trocarCamera() {
    const antiga = this.stream?.getVideoTracks()[0];
    if (!antiga) return false;
    const querFrontal = !this.frontal;
    antiga.stop();
    this.stream.removeTrack(antiga);
    let nova;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { ...VIDEO, facingMode: querFrontal ? 'user' : 'environment' } });
      nova = s.getVideoTracks()[0];
      this.frontal = querFrontal;
    } catch {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { ...VIDEO, facingMode: this.frontal ? 'user' : 'environment' } });
        nova = s.getVideoTracks()[0];
      } catch { return false; }
    }
    nova.enabled = this.camLigada;
    this.stream.addTrack(nova);
    const remetente = this.pc?.getSenders().find((s) => s.track === antiga || s.track?.kind === 'video');
    if (remetente) await remetente.replaceTrack(nova).catch(() => {});
    this.elLocal.srcObject = this.stream;
    return true;
  }

  destravarSom() {
    this.somBloqueado = false;
    this.elRemoto.play?.().catch(() => {});
  }

  encerrar() {
    if (!this.ativa) return;
    this.enviar('tchau');
    this.ativa = false;
    this.estado = 'encerrada';
    clearInterval(this.tOi);
    clearTimeout(this.tFalha);
    this.fecharPc();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.elLocal) this.elLocal.srcObject = null;
    if (this.elRemoto) this.elRemoto.srcObject = null;
    const canal = this.canal;
    this.canal = null;
    if (canal) setTimeout(() => { this.sb.removeChannel(canal).catch?.(() => {}); }, 300);
  }
}

export const ROTULO_ESTADO = {
  preparando: 'Abrindo câmera e microfone…',
  aguardando: 'Aguardando o outro lado entrar…',
  conectando: 'Conectando o vídeo…',
  conectado: 'Em chamada',
  reconectando: 'Reconectando…',
  falhou: 'O vídeo não conectou',
  encerrada: 'Chamada encerrada',
};
