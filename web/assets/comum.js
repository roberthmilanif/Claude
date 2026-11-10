// Utilidades compartilhadas pelo app do paciente e pelo painel do médico.

export const cfg = window.TELE;

export function criarCliente(comLogin) {
  return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: comLogin
      ? { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'tele.medico' }
      : { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
}

export const $ = (s, raiz = document) => raiz.querySelector(s);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// ---------- triagem (RASCUNHO, não validado; precisa bater com entrar_na_fila no banco) ----------
export const PERGUNTAS = [
  { id: 'resp', t: 'Você está com dificuldade para respirar?', alarme: true, chip: 'Dispneia' },
  { id: 'peito', t: 'Você está com dor forte no peito?', alarme: true, chip: 'Dor torácica' },
  { id: 'neuro', t: 'Teve desmaio, confusão ou perda de força em um lado do corpo?', alarme: true, chip: 'Sinal neurológico' },
  { id: 'febre', t: 'Você tem febre alta (acima de 39 °C)?', chip: 'Febre > 39 °C' },
  { id: 'dor', t: 'Você está com dor intensa que não melhora?', chip: 'Dor intensa' },
  { id: 'cronica', t: 'Você tem alguma doença (diabetes, pressão alta, problema no coração ou pulmão) e os sintomas pioraram hoje?', chip: 'Crônico descompensando' },
  { id: 'tempo', t: 'Há quanto tempo os sintomas começaram?', rotulo: 'Início', opcoes: ['Não tive sintomas', 'Menos de 24 horas', 'De 1 a 3 dias', 'Mais de 3 dias'] },
  { id: 'escala', t: 'Como você classifica sua dor agora?', rotulo: 'Dor', opcoes: ['Nenhuma', 'Leve', 'Moderada', 'Forte'] },
];

// ---------- documentos, datas, telefone ----------
export const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

export function cpfOk(v) {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let s = 0;
    for (let i = 0; i < t; i++) s += +c[i] * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== +c[t]) return false;
  }
  return true;
}

export const mascCpf = (v) => soDigitos(v).slice(0, 11)
  .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');

export function mascTel(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length < 3) return d;
  if (d.length < 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length < 11) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const mascCns = (v) => soDigitos(v).slice(0, 15)
  .replace(/(\d{3})(\d)/, '$1 $2').replace(/(\d{3} \d{4})(\d)/, '$1 $2').replace(/(\d{3} \d{4} \d{4})(\d)/, '$1 $2');

export const mascData = (v) => soDigitos(v).slice(0, 8)
  .replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2}\/\d{2})(\d)/, '$1/$2');

// "10/05/1980" -> "1980-05-10" (ou null se a data não existir, estiver no futuro ou for antes de 1900)
export function dataBrParaIso(v) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v ?? '').trim());
  if (!m) return null;
  const [d, mes, a] = [+m[1], +m[2], +m[3]];
  const dt = new Date(a, mes - 1, d);
  if (dt.getFullYear() !== a || dt.getMonth() !== mes - 1 || dt.getDate() !== d) return null;
  if (a < 1900 || dt > new Date()) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export const dataIsoParaBr = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

export function idade(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const h = new Date();
  let i = h.getFullYear() - a;
  if (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d)) i--;
  if (i >= 2) return `${i} anos`;
  const meses = (h.getFullYear() - a) * 12 + (h.getMonth() + 1 - m) - (h.getDate() < d ? 1 : 0);
  return meses <= 1 ? `${Math.max(meses, 0)} mês` : `${meses} meses`;
}

export const horaBr = (ts) => (ts ? new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' }) : '');
export const dataHoraBr = (ts) => (ts ? new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' }) : '');
export const minutosDesde = (ts) => (ts ? Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000)) : 0);

// ---------- mensagens de erro ----------
// As funções do banco já devolvem mensagens em português (raise exception); o resto é rede ou permissão.
export function msgErro(erro) {
  const m = String(erro?.message ?? erro ?? '');
  if (!m || /failed to fetch|networkerror|load failed|fetch/i.test(m)) return 'Sem conexão com a internet. Confira o sinal e tente de novo.';
  if (/permission denied|not authorized|jwt/i.test(m)) return 'Acesso negado. Entre de novo no sistema.';
  return m;
}

// ---------- som (toque de chamada e aviso de fila) ----------
// O navegador só libera áudio depois de um toque na tela: chame som.destravar() em qualquer clique.
export const som = {
  ctx: null,
  laco: null,
  destravar() {
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      this.ctx = this.ctx || new C();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { /* sem áudio neste aparelho */ }
  },
  pronto() { return !!this.ctx && this.ctx.state === 'running'; },
  nota(freq, inicio, dur, vol = 0.22) {
    if (!this.pronto()) return;
    const t = this.ctx.currentTime + inicio;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
  tocar() {
    if (this.laco) return;
    const ciclo = () => {
      this.destravar();
      for (const i of [0, 0.5]) { this.nota(784, i, 0.35); this.nota(988, i + 0.12, 0.35); }
      try { navigator.vibrate?.([350, 150, 350]); } catch { /* sem vibração */ }
    };
    ciclo();
    this.laco = setInterval(ciclo, 2200);
  },
  parar() {
    clearInterval(this.laco);
    this.laco = null;
    try { navigator.vibrate?.(0); } catch { /* sem vibração */ }
  },
  aviso() { this.nota(660, 0, 0.18, 0.18); this.nota(880, 0.2, 0.25, 0.18); },
};

// ---------- manter a tela do celular ligada enquanto espera ----------
export const tela = {
  trava: null,
  querer: false,
  async manter() {
    this.querer = true;
    try {
      if ('wakeLock' in navigator && !this.trava && document.visibilityState === 'visible') {
        this.trava = await navigator.wakeLock.request('screen');
        this.trava.addEventListener('release', () => { this.trava = null; });
      }
    } catch { /* economia de bateria ou navegador sem suporte */ }
  },
  soltar() {
    this.querer = false;
    try { this.trava?.release(); } catch { /* já solta */ }
    this.trava = null;
  },
};
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && tela.querer) tela.manter();
});

export async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const t = document.createElement('textarea');
    t.value = texto;
    t.className = 'fora-da-tela';
    document.body.appendChild(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    t.remove();
    return ok;
  }
}

// ---------- ícones (SVG em linha, herdam a cor do texto) ----------
const svg = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICONE = {
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  micOff: svg('<path d="M9 9v2a3 3 0 0 0 5 2.2M15 9.5V6a3 3 0 0 0-5.7-1.3M5 11a7 7 0 0 0 11 5.7M19 11a7 7 0 0 1-.4 2.3M12 18v3M4 4l16 16"/>'),
  cam: svg('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>'),
  camOff: svg('<path d="M16 16.5V18H5a2 2 0 0 1-2-2V8a2 2 0 0 1 1.2-1.8M9.5 6H14a2 2 0 0 1 2 2v2l5-3v10M4 4l16 16"/>'),
  virar: svg('<path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4"/>'),
  sair: svg('<path d="M3 13c5-5 13-5 18 0l-2.5 2.5-3.5-1.5v-2.5a9 9 0 0 0-6 0V14l-3.5 1.5z"/>'),
  fone: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  copiar: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
};

// ---------- PWA ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
