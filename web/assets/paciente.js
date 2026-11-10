// App do paciente: cadastro -> termos -> triagem -> fila -> chamada de vídeo.
// O paciente não tem conta e não lê tabela nenhuma: fala com o banco só pelas funções
// entrar_na_fila, minha_situacao, atender e sair_da_fila. O par id+token fica guardado no aparelho.

import {
  cfg, criarCliente, $, esc, PERGUNTAS, cpfOk, mascCpf, mascTel, mascCns, mascData, dataBrParaIso,
  soDigitos, msgErro, som, tela, ICONE,
} from './comum.js';
import { Chamada, ROTULO_ESTADO } from './video.js';

const sb = criarCliente(false);
const CHAVE = 'tele.atendimento';
const FINAIS = ['finalizado', 'encaminhado', 'desistiu'];
const TERMOS = [
  'Estou em um lugar silencioso, com boa internet e câmera funcionando.',
  'Sei que este atendimento não substitui urgência e emergência.',
  'Autorizo o uso dos meus dados para este atendimento e o registro em prontuário.',
];
const formVazio = () => ({ nome: '', cpf: '', cns: '', nasc: '', tel: '', queixa: '' });

const E = {
  tela: 'carregando',
  form: formVazio(),
  termos: [false, false, false],
  qi: 0,
  resp: {},
  at: null,        // { id, token, senha }
  sit: null,       // última resposta de minha_situacao
  erro: '',
  aviso: '',
  semRede: false,
  chamada: null,
};
let promptInstalar = null;
let ultimoHtml = '';
let ultimaTela = '';
let tPoll = null;

// ---------- armazenamento no aparelho ----------
function guardar(at) { try { localStorage.setItem(CHAVE, JSON.stringify({ ...at, em: Date.now() })); } catch { /* modo privado */ } }
function recuperar() {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE));
    if (v?.id && v?.token) return v;
  } catch { /* vazio ou corrompido */ }
  return null;
}
function esquecer() { try { localStorage.removeItem(CHAVE); } catch { /* modo privado */ } }

// ---------- telas ----------
const passos = (n) => `<div class="passos" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
const medicoLinha = (s) => `${esc(s.medico_especialidade || 'Médico(a)')}${s.medico_crm ? ' · ' + esc(s.medico_crm) : ''}`;

function vCadastro() {
  const f = E.form;
  return `${passos(0)}
    <h1 tabindex="-1">Fale com um médico sem sair de casa</h1>
    <p class="muted">Preencha os dados de quem vai ser atendido, responda algumas perguntas e entre na fila. O médico liga por vídeo aqui mesmo, nesta tela.</p>
    <form id="f-cad" novalidate>
      <label for="i-nome">Nome completo<input id="i-nome" type="text" autocomplete="name" autocapitalize="words" maxlength="120" value="${esc(f.nome)}"></label>
      <label for="i-cpf">CPF<input id="i-cpf" type="text" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00" value="${esc(f.cpf)}"></label>
      <label for="i-cns">Cartão do SUS <small>opcional</small><input id="i-cns" type="text" inputmode="numeric" autocomplete="off" placeholder="15 números" value="${esc(f.cns)}"></label>
      <label for="i-nasc">Data de nascimento<input id="i-nasc" type="text" inputmode="numeric" autocomplete="bday" placeholder="dd/mm/aaaa" value="${esc(f.nasc)}"></label>
      <label for="i-tel">Celular com DDD <small>de preferência o do WhatsApp</small><input id="i-tel" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="(00) 00000-0000" value="${esc(f.tel)}"></label>
      <label for="i-queixa">O que você está sentindo?<textarea id="i-queixa" maxlength="1000">${esc(f.queixa)}</textarea></label>
      <div class="erro" id="cad-erro" role="alert">${esc(E.erro)}</div>
      <button class="primario" type="submit">Continuar</button>
    </form>
    <p class="muted pequeno">Falta de ar, dor forte no peito ou desmaio são emergência: não espere, ligue 192.</p>`;
}

function vTermos() {
  return `${passos(1)}
    <h1 tabindex="-1">Antes de entrar na fila</h1>
    <div class="pilha">
      ${TERMOS.map((t, i) => `<label class="check" for="t${i}"><input type="checkbox" id="t${i}" data-termo="${i}" ${E.termos[i] ? 'checked' : ''}><span>${t}</span></label>`).join('')}
      <details class="sobre">
        <summary>Como usamos seus dados</summary>
        <p>Nome, CPF, Cartão do SUS, data de nascimento, telefone, o que você está sentindo e as respostas da triagem são usados só para este atendimento: organizar a fila, identificar você para o médico e abrir o seu prontuário. Só os médicos do serviço veem esses dados.</p>
      </details>
      <button class="primario" data-acao="aceitar-termos" ${E.termos.every(Boolean) ? '' : 'disabled'}>Responder triagem</button>
      <button class="fantasma" data-acao="ir" data-tela="cadastro">Voltar</button>
    </div>`;
}

function vTriagem() {
  const q = PERGUNTAS[E.qi];
  const ops = q.opcoes || ['Sim', 'Não'];
  return `${passos(2)}
    <div class="qnum">Pergunta ${E.qi + 1} de ${PERGUNTAS.length}</div>
    <h1 class="q" tabindex="-1">${esc(q.t)}</h1>
    <div class="opcoes">${ops.map((x) => `<button data-acao="opcao" data-valor="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <button class="fantasma" data-acao="voltar-triagem">Voltar</button>`;
}

function vAlerta() {
  return `<div class="alerta">
      <h1 tabindex="-1">Procure atendimento presencial agora</h1>
      <p>Pelo que você respondeu, o seu caso precisa de avaliação presencial imediata. A consulta por vídeo não é segura para isso.</p>
      <p>Ligue para o SAMU ou vá à UPA ou emergência mais próxima.</p>
      <a class="tel192" href="tel:192">${ICONE.fone} Ligar 192</a>
    </div>
    <button class="fantasma" data-acao="refazer">Refazer o cadastro</button>`;
}

function vEnviando() {
  return `${passos(3)}<div class="ticket"><div class="girando" aria-hidden="true"></div><p>Entrando na fila…</p></div>`;
}

function vErroEnvio() {
  return `${passos(3)}
    <h1 tabindex="-1">Não foi possível entrar na fila</h1>
    <div class="nota atencao" role="alert">${esc(E.erro)}</div>
    <div class="pilha">
      <button class="primario" data-acao="tentar-envio">Tentar de novo</button>
      <button data-acao="ir" data-tela="cadastro">Corrigir meus dados</button>
    </div>`;
}

function vFila() {
  const s = E.sit || {};
  let espera = '';
  if (s.posicao === 1 && s.espera_min === 0) espera = 'Você é o próximo. O médico deve chamar em instantes.';
  else if (s.espera_min === 0) espera = 'O médico deve chamar em instantes.';
  else if (s.espera_min != null) espera = `Espera estimada: cerca de <b>${esc(s.espera_min)} min</b>`;
  else if (s.posicao === 1) espera = 'Você é o próximo.';
  return `${passos(3)}
    <h1 class="sr" tabindex="-1">Você está na fila</h1>
    ${E.aviso ? `<div class="nota atencao" role="status">${esc(E.aviso)}</div>` : ''}
    <div class="ticket">
      <div class="muted">Sua posição na fila</div>
      <div class="pos">${s.posicao ? esc(s.posicao) + 'º' : '…'}</div>
      <p>${espera}</p>
      <div class="senha">Senha ${esc(s.senha ?? E.at?.senha ?? '')}${s.prioridade ? ' · prioridade' : ''}</div>
    </div>
    ${s.medicos_online === 0 ? '<div class="nota">Nenhum médico está online neste momento. Você continua na fila e será chamado assim que o atendimento começar.</div>' : ''}
    ${E.semRede ? '<div class="nota atencao" role="status">Sem conexão com a internet. Tentando de novo…</div>' : ''}
    ${som.pronto() ? '' : '<button class="nota botao" data-acao="ativar-som">Toque aqui para ativar o som da chamada</button>'}
    <div class="nota"><b>Deixe esta tela aberta.</b> Quando chegar a sua vez, o médico liga aqui e o celular toca.</div>
    <p class="muted">Se piorar enquanto espera, ligue 192.</p>
    <div class="pilha">
      ${promptInstalar ? '<button data-acao="instalar">Instalar o aplicativo no celular</button>' : ''}
      <button class="fantasma" data-acao="sair-fila">Sair da fila</button>
    </div>`;
}

function vChamando() {
  const s = E.sit || {};
  return `<section class="toca">
      <div class="toca-pulso" aria-hidden="true">${ICONE.cam}</div>
      <p class="toca-rotulo">Chegou a sua vez</p>
      <h1 tabindex="-1">${esc(s.medico_nome || 'Médico')}</h1>
      <p class="toca-crm">${medicoLinha(s)}</p>
      <p class="toca-rotulo">está chamando para a consulta por vídeo</p>
      <button class="atender" data-acao="atender">${ICONE.cam}<span>Atender</span></button>
      <button class="recusar" data-acao="recusar">Não posso atender agora</button>
    </section>`;
}

function vVideo() {
  const s = E.sit || {};
  if (!E.chamada) {
    return `<div class="ticket agora">
        <div class="pos">Você está em atendimento</div>
        <p><b>${esc(s.medico_nome || 'O médico')}</b><br>${medicoLinha(s)}</p>
      </div>
      <div class="pilha">
        <button class="primario" data-acao="entrar-chamada">Entrar na chamada de vídeo</button>
      </div>
      <p class="muted">Se o vídeo não funcionar, o médico pode ligar pelo WhatsApp no número que você informou.</p>`;
  }
  return `<section class="chamada">
      <video id="v-remoto" autoplay playsinline></video>
      <video id="v-local" class="espelho" autoplay playsinline muted></video>
      <div class="ch-topo"><b>${esc(s.medico_nome || 'Médico')}</b><span>${medicoLinha(s)}</span></div>
      <div class="ch-estado" id="ch-estado">${ROTULO_ESTADO.preparando}</div>
      <button class="ch-aviso" id="ch-aviso" data-acao="som-chamada" hidden></button>
      <div class="ch-botoes">
        <button data-acao="mic" id="b-mic" aria-label="Desligar microfone">${ICONE.mic}</button>
        <button data-acao="cam" id="b-cam" aria-label="Desligar câmera">${ICONE.cam}</button>
        <button data-acao="virar" id="b-virar" aria-label="Trocar de câmera">${ICONE.virar}</button>
        <button data-acao="sair-chamada" class="vermelho" aria-label="Sair da chamada">${ICONE.sair}</button>
      </div>
    </section>`;
}

function vFim() {
  const st = E.sit?.status;
  let corpo;
  if (st === 'finalizado') {
    corpo = `<h1 tabindex="-1">Atendimento encerrado</h1>
      <p>A receita e os documentos, quando houver, chegam pelo WhatsApp informado.</p>
      <p class="muted">Se piorar, procure atendimento presencial ou ligue 192.</p>`;
  } else if (st === 'encaminhado') {
    corpo = `<div class="alerta">
        <h1 tabindex="-1">Procure atendimento presencial</h1>
        <p>O médico orientou que você seja avaliado presencialmente. Vá à unidade de saúde, UPA ou emergência, como combinado na consulta.</p>
        <p>Se piorar no caminho, ligue 192.</p>
        <a class="tel192" href="tel:192">${ICONE.fone} Ligar 192</a>
      </div>`;
  } else {
    corpo = `<h1 tabindex="-1">Pedido encerrado</h1>
      <p>Seu pedido saiu da fila sem atendimento. Se ainda precisar, peça um novo atendimento.</p>`;
  }
  return `${corpo}<div class="pilha"><button class="${st === 'encaminhado' ? '' : 'primario'}" data-acao="novo">Novo atendimento</button></div>`;
}

const TELAS = {
  carregando: () => `<p class="muted">${E.semRede ? 'Sem conexão com a internet. Tentando de novo…' : 'Carregando…'}</p>`,
  cadastro: vCadastro, termos: vTermos, triagem: vTriagem, alerta: vAlerta, enviando: vEnviando,
  erroEnvio: vErroEnvio, fila: vFila, chamando: vChamando, video: vVideo, fim: vFim,
};

function pintar() {
  const html = TELAS[E.tela]();
  const mudouTela = E.tela !== ultimaTela;
  if (html !== ultimoHtml) {
    $('#app').innerHTML = html;
    ultimoHtml = html;
  }
  document.body.dataset.tela = E.tela;
  document.title = E.tela === 'chamando' ? 'Médico chamando…' : cfg.nome;
  if (mudouTela) {
    ultimaTela = E.tela;
    scrollTo(0, 0);
    $('#app h1')?.focus({ preventScroll: true });
  }
}

function ir(nome) {
  if (nome !== 'fila') E.aviso = E.tela === 'fila' ? '' : E.aviso;
  E.tela = nome;
  pintar();
}

// ---------- fila ----------
function agendar(ms) { clearTimeout(tPoll); tPoll = setTimeout(ciclo, ms); }

async function ciclo() {
  clearTimeout(tPoll);
  if (!E.at) return;
  await consultar();
  if (!E.at || FINAIS.includes(E.sit?.status)) return;
  agendar(['chamando', 'atendimento'].includes(E.sit?.status) ? 3000 : 5000);
}

async function consultar() {
  const at = E.at;
  const { data, error } = await sb.rpc('minha_situacao', { p_id: at.id, p_token: at.token });
  if (E.at !== at) return;
  if (error) { E.semRede = true; pintar(); return; }
  E.semRede = false;
  if (data === null) {          // pedido não existe mais (id/token não conferem)
    esquecer();
    E.at = null;
    E.sit = null;
    ir('cadastro');
    return;
  }
  aplicar(data);
}

function aplicar(sit) {
  const antes = E.sit?.status;
  E.sit = sit;
  if (sit.status === 'aguardando') {
    if (antes === 'chamando') E.aviso = 'Você não atendeu a chamada. Continue com esta tela aberta: o médico vai chamar de novo.';
    som.parar();
    fecharChamada();
    tela.manter();
    ir('fila');
  } else if (sit.status === 'chamando') {
    tela.manter();
    if (E.tela !== 'chamando') som.tocar();
    ir('chamando');
  } else if (sit.status === 'atendimento') {
    som.parar();
    tela.manter();
    ir('video');
  } else {
    som.parar();
    fecharChamada();
    tela.soltar();
    ir('fim');
  }
}

async function enviar() {
  ir('enviando');
  const f = E.form;
  const { data, error } = await sb.rpc('entrar_na_fila', {
    p_nome: f.nome,
    p_cpf: soDigitos(f.cpf),
    p_cns: soDigitos(f.cns),
    p_nasc: dataBrParaIso(f.nasc),
    p_tel: soDigitos(f.tel),
    p_queixa: f.queixa,
    p_respostas: E.resp,
    p_termos: cfg.termosVersao,
  });
  if (error || !data?.id) {
    E.erro = msgErro(error);
    ir('erroEnvio');
    return;
  }
  E.at = { id: data.id, token: data.token, senha: data.senha };
  guardar(E.at);
  // os dados pessoais já estão no banco: não ficam guardados na página
  E.form = formVazio();
  E.resp = {};
  E.termos = [false, false, false];
  E.qi = 0;
  E.erro = '';
  E.sit = { status: 'aguardando', senha: data.senha };
  tela.manter();
  ir('fila');
  ciclo();
}

function recomecar() {
  clearTimeout(tPoll);
  som.parar();
  fecharChamada();
  tela.soltar();
  esquecer();
  Object.assign(E, { form: formVazio(), termos: [false, false, false], qi: 0, resp: {}, at: null, sit: null, erro: '', aviso: '' });
  ir('cadastro');
}

// ---------- chamada de vídeo ----------
function pintarChamada(estado, c) {
  const el = $('#ch-estado');
  if (!el) return;
  el.textContent = ROTULO_ESTADO[estado] || '';
  el.dataset.estado = estado;
  let msg = '';
  if (c.semMidia) msg = 'Não conseguimos usar sua câmera e seu microfone. Permita o acesso quando o navegador pedir ou abra este link no Chrome ou no Safari. O médico também pode ligar pelo WhatsApp.';
  else if (c.semCamera) msg = 'Sua câmera não abriu. A chamada segue só com áudio.';
  if (estado === 'falhou') msg = 'O vídeo não conectou nesta rede. Continue com esta tela aberta: o médico vai ligar pelo WhatsApp no número que você informou.';
  if (c.somBloqueado) msg = 'Toque aqui para ativar o som.';
  const av = $('#ch-aviso');
  av.hidden = !msg;
  av.textContent = msg;
  const mic = $('#b-mic');
  mic.innerHTML = c.micLigado ? ICONE.mic : ICONE.micOff;
  mic.classList.toggle('off', !c.micLigado);
  mic.setAttribute('aria-label', c.micLigado ? 'Desligar microfone' : 'Ligar microfone');
  const cam = $('#b-cam');
  cam.innerHTML = c.camLigada ? ICONE.cam : ICONE.camOff;
  cam.classList.toggle('off', !c.camLigada);
  cam.setAttribute('aria-label', c.camLigada ? 'Desligar câmera' : 'Ligar câmera');
  $('#b-virar').hidden = c.semCamera || c.semMidia;
  $('#v-local').classList.toggle('espelho', c.frontal);
  $('#v-local').hidden = c.semCamera || c.semMidia;
}

function abrirChamada() {
  if (E.chamada || !E.sit?.sala) return;
  E.chamada = { preparando: true };   // faz vVideo desenhar a tela da chamada
  pintar();
  const c = new Chamada({
    sb,
    sala: E.sit.sala,
    papel: 'paciente',
    elLocal: $('#v-local'),
    elRemoto: $('#v-remoto'),
    iceServers: cfg.iceServers,
    aoMudar: pintarChamada,
  });
  E.chamada = c;
  c.iniciar().then(() => { if (E.chamada === c) pintarChamada(c.estado, c); })
    .catch((e) => console.warn('chamada', e));
}

function fecharChamada() {
  const c = E.chamada;
  E.chamada = null;
  if (c?.encerrar) c.encerrar();
}

// ---------- eventos ----------
const ACOES = {
  ir: (b) => ir(b.dataset.tela),
  'aceitar-termos': () => { E.qi = 0; E.resp = {}; ir('triagem'); },
  'voltar-triagem': () => { if (E.qi > 0) { E.qi -= 1; pintar(); } else ir('termos'); },
  opcao: (b) => {
    const q = PERGUNTAS[E.qi];
    E.resp[q.id] = b.dataset.valor;
    if (q.alarme && b.dataset.valor === 'Sim') { ir('alerta'); return; }
    if (E.qi + 1 < PERGUNTAS.length) { E.qi += 1; pintar(); $('#app h1')?.focus({ preventScroll: true }); } else enviar();
  },
  'tentar-envio': () => enviar(),
  refazer: () => recomecar(),
  novo: () => recomecar(),
  'ativar-som': () => { som.destravar(); setTimeout(pintar, 150); },
  instalar: async () => {
    const p = promptInstalar;
    promptInstalar = null;
    try { await p?.prompt(); } catch { /* usuário fechou */ }
    pintar();
  },
  'sair-fila': async () => {
    if (!confirm('Sair da fila? Você perde o seu lugar.')) return;
    await sb.rpc('sair_da_fila', { p_id: E.at.id, p_token: E.at.token });
    ciclo();
  },
  atender: () => {
    som.parar();
    const at = E.at;
    E.sit = { ...E.sit, status: 'atendimento' };
    ir('video');
    abrirChamada();                       // abre câmera já no toque do paciente
    sb.rpc('atender', { p_id: at.id, p_token: at.token }).then(() => ciclo());
  },
  recusar: async () => {
    if (!confirm('Se você não atender agora, sai da fila. Confirmar?')) return;
    som.parar();
    await sb.rpc('sair_da_fila', { p_id: E.at.id, p_token: E.at.token });
    ciclo();
  },
  'entrar-chamada': () => abrirChamada(),
  mic: () => { E.chamada?.alternarMic?.(); if (E.chamada?.estado) pintarChamada(E.chamada.estado, E.chamada); },
  cam: () => { E.chamada?.alternarCam?.(); if (E.chamada?.estado) pintarChamada(E.chamada.estado, E.chamada); },
  virar: async () => { await E.chamada?.trocarCamera?.(); if (E.chamada?.estado) pintarChamada(E.chamada.estado, E.chamada); },
  'som-chamada': () => { E.chamada?.destravarSom?.(); if (E.chamada?.estado) pintarChamada(E.chamada.estado, E.chamada); },
  'sair-chamada': () => {
    if (!confirm('Sair da chamada de vídeo? O atendimento continua aberto até o médico encerrar.')) return;
    fecharChamada();
    pintar();
  },
};

document.addEventListener('click', (e) => {
  som.destravar();
  const b = e.target.closest('[data-acao]');
  if (!b || b.disabled) return;
  ACOES[b.dataset.acao]?.(b);
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'i-cpf') t.value = mascCpf(t.value);
  else if (t.id === 'i-tel') t.value = mascTel(t.value);
  else if (t.id === 'i-cns') t.value = mascCns(t.value);
  else if (t.id === 'i-nasc') t.value = mascData(t.value);
  if (t.id?.startsWith('i-')) E.form[t.id.slice(2)] = t.value;
  if (t.dataset.termo) {
    E.termos[+t.dataset.termo] = t.checked;
    const b = $('[data-acao="aceitar-termos"]');
    if (b) b.disabled = !E.termos.every(Boolean);
  }
});

document.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.id !== 'f-cad') return;
  const f = E.form;
  const cns = soDigitos(f.cns);
  let er = '';
  if (f.nome.trim().split(/\s+/).length < 2 || f.nome.trim().length < 5) er = 'Informe nome e sobrenome.';
  else if (!cpfOk(f.cpf)) er = 'CPF inválido. Confira os números.';
  else if (cns && cns.length !== 15) er = 'O Cartão do SUS tem 15 números. Confira ou deixe em branco.';
  else if (!dataBrParaIso(f.nasc)) er = 'Informe a data de nascimento no formato dia/mês/ano.';
  else if (!/^[1-9]{2}\d{8,9}$/.test(soDigitos(f.tel))) er = 'Informe o celular com DDD.';
  else if (f.queixa.trim().length < 3) er = 'Conte em poucas palavras o que está sentindo.';
  E.erro = er;
  if (er) {
    $('#cad-erro').textContent = er;
    return;
  }
  ir('termos');
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && E.at && !FINAIS.includes(E.sit?.status)) ciclo();
});
addEventListener('online', () => { if (E.at) ciclo(); });
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptInstalar = e;
  if (E.tela === 'fila') pintar();
});

// ---------- início ----------
$('#marca-nome').textContent = cfg.nome;
const salvo = recuperar();
if (salvo && Date.now() - (salvo.em || 0) < 24 * 3600 * 1000) {
  E.at = { id: salvo.id, token: salvo.token, senha: salvo.senha };
  pintar();
  ciclo();
} else {
  esquecer();
  ir('cadastro');
}
