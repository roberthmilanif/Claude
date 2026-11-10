// Teste de ponta a ponta da fila, pelo navegador (Playwright + Chromium com câmera e microfone falsos).
//
//   E2E_BASE=https://<site>  E2E_MED1_EMAIL=... E2E_MED1_SENHA=... E2E_MED2_EMAIL=... E2E_MED2_SENHA=...  node tests/e2e.cjs
//
// Precisa de dois médicos de teste já autorizados (e com e-mail confirmado) no Supabase.
// Todos os pacientes criados têm o nome começando por "TESTE E2E": apagar depois (ver tests/README.md).
// Não usar nomes nem documentos de pessoas reais aqui.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');

const BASE = (process.env.E2E_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
const MED1 = { email: process.env.E2E_MED1_EMAIL, senha: process.env.E2E_MED1_SENHA, nome: 'Médica Teste Um', uf: 'BA', crm: '90001' };
const MED2 = { email: process.env.E2E_MED2_EMAIL, senha: process.env.E2E_MED2_SENHA, nome: 'Médico Teste Dois', uf: 'PI', crm: '90002' };
const FOTOS = process.env.E2E_FOTOS || '';
const RESP = { resp: 'Não', peito: 'Não', neuro: 'Não', febre: 'Não', dor: 'Não', cronica: 'Não', tempo: 'De 1 a 3 dias', escala: 'Leve' };
const ORDEM = ['resp', 'peito', 'neuro', 'febre', 'dor', 'cronica', 'tempo', 'escala'];

function cpfDe(n) {                       // CPF sintaticamente válido a partir de um número de 9 dígitos
  const b = String(n).padStart(9, '0');
  const dv = (s) => { let t = 0; for (let i = 0; i < s.length; i++) t += +s[i] * (s.length + 1 - i); return ((t * 10) % 11) % 10; };
  const d1 = dv(b);
  return b + d1 + dv(b + d1);
}
const semente = 900000000 + (Math.floor(Date.now() / 1000) % 90000) * 100;   // muda a cada execução
let seq = 0;
const novoCpf = () => cpfDe(semente + (seq++));

let passoAtual = '';
const erros = [];
async function passo(nome, fn) {
  passoAtual = nome;
  const t0 = Date.now();
  await fn();
  console.log(`ok    ${nome}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
async function foto(page, nome) {
  if (FOTOS) await page.screenshot({ path: path.join(FOTOS, nome + '.png'), fullPage: false }).catch(() => {});
}
function vigiar(page, rotulo) {
  page.on('pageerror', (e) => erros.push(`${rotulo} pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource/.test(t)) return;          // respostas 4xx esperadas nos testes de recusa
    erros.push(`${rotulo} console: ${t}`);
  });
  page.on('dialog', (d) => d.accept());
}

// ---------- paciente pela tela ----------
async function cadastrar(page, p) {
  await page.goto(BASE + '/');
  await page.waitForSelector('#f-cad');
  await page.fill('#i-nome', p.nome);
  await page.fill('#i-cpf', p.cpf);
  if (p.cns) await page.fill('#i-cns', p.cns);
  await page.fill('#i-nasc', p.nasc || '10051980');
  await page.fill('#i-tel', p.tel || '74999990001');
  await page.fill('#i-queixa', p.queixa || 'Teste automático da fila');
  await page.click('#f-cad button[type=submit]');
  await page.waitForSelector('[data-termo]');
  for (const c of await page.$$('[data-termo]')) await c.check();
  await page.click('[data-acao="aceitar-termos"]');
  const r = { ...RESP, ...(p.respostas || {}) };
  for (let i = 0; i < ORDEM.length; i++) {
    await page.waitForFunction((n) => document.querySelector('.qnum')?.textContent.includes(`Pergunta ${n} de`), i + 1);
    await page.click(`.opcoes button[data-valor="${r[ORDEM[i]]}"]`);
    if (i < 3 && r[ORDEM[i]] === 'Sim') { await page.waitForSelector('.alerta'); return 'alerta'; }
  }
  await page.waitForSelector('body[data-tela="fila"] .ticket .pos', { timeout: 20000 });
  return 'fila';
}
const posicao = (page, n) => page.waitForFunction(
  (alvo) => document.body.dataset.tela === 'fila' && document.querySelector('.ticket .pos')?.textContent.trim() === alvo + 'º',
  n, { timeout: 20000 });
const tela = (page, nome, ms = 20000) => page.waitForFunction((n) => document.body.dataset.tela === n, nome, { timeout: ms });

// ---------- médico pela tela ----------
async function entrarMedico(page, m) {
  await page.goto(BASE + '/medico');
  await page.waitForSelector('#f-login');
  await page.fill('#l-email', m.email);
  await page.fill('#l-senha', m.senha);
  await page.click('#f-login button[type=submit]');
  await page.waitForSelector('#f-perfil, #painel:not([hidden]) .tiles', { timeout: 30000 });
  if (await page.$('#f-perfil')) {
    await page.fill('#p-nome', m.nome);
    await page.selectOption('#p-uf', m.uf);
    await page.fill('#p-crm', m.crm);
    await page.click('#f-perfil button[type=submit]');
  }
  await page.waitForSelector('#painel:not([hidden]) .tiles', { timeout: 30000 });
}
const cartaoFila = (page, nome) => page.locator('#fila .pt', { hasText: nome });
const azulejo = async (page, i) => (await page.locator('#tiles .tile b').nth(i).textContent()).trim();

// chamada direta às funções do banco, com a sessão do médico que está logado na página
const comoMedico = (page, fn, arg) => page.evaluate(async ({ fn, arg }) => {
  const sb = window.__sbTeste || (window.__sbTeste = window.supabase.createClient(window.TELE.supabaseUrl, window.TELE.supabaseKey,
    { auth: { storageKey: 'tele.medico', autoRefreshToken: false, detectSessionInUrl: false } }));
  if (fn === 'buscar') {
    const { data, error } = await sb.from('atendimentos').select('id,nome,status,senha,medico_id,chamadas').like('nome', arg).order('senha');
    return error ? { erro: error.message } : data;
  }
  const { error } = await sb.rpc(fn, arg);
  return error ? error.message : 'ok';
}, { fn, arg });

async function videoConectado(page, quem) {
  await page.waitForSelector('#ch-estado[data-estado="conectado"]', { state: 'attached', timeout: 60000 });
  // a imagem do outro lado precisa estar chegando E avançando (não vale quadro congelado de conexão antiga)
  await page.waitForFunction(() => {
    const v = document.querySelector('#v-remoto');
    if (!v || !v.videoWidth || v.readyState < 2) return false;
    const agora = v.currentTime;
    const antes = window.__tempoVideo;
    window.__tempoVideo = agora;
    return antes !== undefined && agora > antes + 0.2;
  }, null, { timeout: 25000, polling: 700 }).catch(() => { throw new Error(`${quem}: vídeo remoto sem imagem`); });
  await page.evaluate(() => { delete window.__tempoVideo; });
}

function anos(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const h = new Date();
  return h.getFullYear() - a - (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d) ? 1 : 0);
}

(async () => {
  assert.ok(MED1.email && MED1.senha && MED2.email && MED2.senha, 'defina E2E_MED1_EMAIL/SENHA e E2E_MED2_EMAIL/SENHA');
  if (FOTOS) fs.mkdirSync(FOTOS, { recursive: true });
  const navegador = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined,
  });
  const ctxMedico = () => navegador.newContext({ viewport: { width: 1280, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Bahia', permissions: ['clipboard-read', 'clipboard-write'] });
  const ctxPaciente = () => navegador.newContext({ ...devices['Pixel 7'], locale: 'pt-BR', timezoneId: 'America/Bahia' });
  const abrir = async (ctx, rotulo) => { const p = await (await ctx).newPage(); vigiar(p, rotulo); return p; };

  const med1 = await abrir(ctxMedico(), 'med1');
  const med2 = await abrir(ctxMedico(), 'med2');
  const pA = await abrir(ctxPaciente(), 'pacA');
  const pB = await abrir(ctxPaciente(), 'pacB');
  const pD = await abrir(ctxPaciente(), 'pacD');
  const pE = await abrir(ctxPaciente(), 'pacE');
  const A = { nome: 'TESTE E2E Paciente Alfa', cpf: novoCpf(), tel: '74999990001', queixa: 'Dor de garganta desde ontem' };
  const B = { nome: 'TESTE E2E Paciente Beta', cpf: novoCpf(), cns: '898001160660006', tel: '74999990002', queixa: 'Febre alta e tosse', respostas: { febre: 'Sim' } };
  const D = { nome: 'TESTE E2E Paciente Delta', cpf: novoCpf(), tel: '74999990004', queixa: 'Dor abdominal' };
  let rajada = [];

  try {
    await passo('painel: dois médicos entram com e-mail e senha', async () => {
      await entrarMedico(med1, MED1);
      await entrarMedico(med2, MED2);
      await foto(med1, '01-painel-vazio');
    });

    await passo('anônimo não lê tabela nem chama paciente', async () => {
      await pE.goto(BASE + '/');
      await pE.waitForSelector('#f-cad');
      const r = await pE.evaluate(async () => {
        const sb = window.supabase.createClient(window.TELE.supabaseUrl, window.TELE.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        const t1 = await sb.from('atendimentos').select('id').limit(1);
        const t2 = await sb.from('medicos').select('id').limit(1);
        const t3 = await sb.rpc('chamar', { p_id: '00000000-0000-0000-0000-000000000000' });
        const t4 = await sb.rpc('minha_situacao', { p_id: '00000000-0000-0000-0000-000000000000', p_token: '00000000-0000-0000-0000-000000000000' });
        return { t1: t1.error?.code || 'LEU', t2: t2.error?.code || 'LEU', t3: t3.error?.code || 'EXECUTOU', t4: t4.error ? 'ERRO ' + t4.error.message : t4.data };
      });
      assert.equal(r.t1, '42501', 'anon leu atendimentos: ' + r.t1);
      assert.equal(r.t2, '42501', 'anon leu medicos: ' + r.t2);
      assert.notEqual(r.t3, 'EXECUTOU', 'anon executou chamar');
      assert.equal(r.t4, null, 'minha_situacao com token inválido devia devolver null');
    });

    await passo('paciente A entra pela tela: posição 1, médico online', async () => {
      assert.equal(await cadastrar(pA, A), 'fila');
      await posicao(pA, 1);
      const txt = await pA.textContent('#app');
      assert.ok(!/Nenhum médico está online/.test(txt), 'devia haver médico online');
      await foto(pA, '02-paciente-fila');
    });

    await passo('paciente B (febre alta) entra com prioridade: B vira 1º, A vira 2º', async () => {
      assert.equal(await cadastrar(pB, B), 'fila');
      await posicao(pB, 1);
      assert.match(await pB.textContent('.ticket .senha'), /prioridade/);
      await posicao(pA, 2);
    });

    await passo('15 pessoas entram ao mesmo tempo: 15 senhas diferentes, posições 3 a 17 sem repetição', async () => {
      const lista = Array.from({ length: 15 }, (_, i) => ({ nome: `TESTE E2E Rajada ${String(i + 1).padStart(2, '0')}`, cpf: novoCpf() }));
      rajada = await pE.evaluate(async ({ lista, RESP }) => {
        const sb = window.supabase.createClient(window.TELE.supabaseUrl, window.TELE.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        const ent = await Promise.all(lista.map((p) => sb.rpc('entrar_na_fila', {
          p_nome: p.nome, p_cpf: p.cpf, p_cns: '', p_nasc: '1990-01-01', p_tel: '74999990099', p_queixa: 'Teste de carga da fila', p_respostas: RESP, p_termos: window.TELE.termosVersao,
        })));
        const falhou = ent.find((e) => e.error);
        if (falhou) return { erro: falhou.error.message };
        const sit = await Promise.all(ent.map((e) => sb.rpc('minha_situacao', { p_id: e.data.id, p_token: e.data.token })));
        return ent.map((e, i) => ({ id: e.data.id, token: e.data.token, senha: e.data.senha, posicao: sit[i].data?.posicao, nome: lista[i].nome }));
      }, { lista, RESP });
      assert.ok(!rajada.erro, 'erro na rajada: ' + rajada.erro);
      assert.equal(new Set(rajada.map((r) => r.senha)).size, 15, 'senhas repetidas');
      assert.deepEqual(rajada.map((r) => r.posicao).sort((a, b) => a - b), Array.from({ length: 15 }, (_, i) => i + 3));
    });

    await passo('mesmo CPF duas vezes ao mesmo tempo: sobra um pedido só', async () => {
      const cpf = novoCpf();
      const r = await pE.evaluate(async ({ cpf, RESP }) => {
        const sb = window.supabase.createClient(window.TELE.supabaseUrl, window.TELE.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        const um = () => sb.rpc('entrar_na_fila', { p_nome: 'TESTE E2E Duplicado', p_cpf: cpf, p_cns: '', p_nasc: '1990-01-01', p_tel: '74999990098', p_queixa: 'Toque duplo no botão', p_respostas: RESP, p_termos: window.TELE.termosVersao });
        const ent = await Promise.all([um(), um()]);
        if (ent.some((e) => e.error)) return { erro: ent.map((e) => e.error?.message).join(' | ') };
        const sit = await Promise.all(ent.map((e) => sb.rpc('minha_situacao', { p_id: e.data.id, p_token: e.data.token })));
        return sit.map((s) => s.data.status).sort();
      }, { cpf, RESP });
      assert.deepEqual(r, ['aguardando', 'desistiu'], JSON.stringify(r));
    });

    await passo('painel mostra 18 na fila, com o paciente prioritário no topo', async () => {
      await med1.waitForFunction(() => document.querySelector('#tiles .tile b')?.textContent.trim() === '18', null, { timeout: 15000 });
      assert.match(await med1.locator('#fila .pt').first().textContent(), /TESTE E2E Paciente Beta/);
      assert.match(await cartaoFila(med1, B.nome).textContent(), /Prioridade/);
      assert.equal(await azulejo(med1, 3), '2', 'médicos online');
      await foto(med1, '03-painel-fila-cheia');
    });

    let idA; let idB;
    await passo('dois médicos chamam o mesmo paciente no mesmo instante: só um consegue', async () => {
      const achados = await comoMedico(med1, 'buscar', 'TESTE E2E Paciente%');
      idA = achados.find((x) => x.nome === A.nome && x.status === 'aguardando').id;
      idB = achados.find((x) => x.nome === B.nome && x.status === 'aguardando').id;
      const r = await Promise.all([comoMedico(med1, 'chamar', { p_id: idB }), comoMedico(med2, 'chamar', { p_id: idB })]);
      assert.equal(r.filter((x) => x === 'ok').length, 1, JSON.stringify(r));
      assert.match(r.find((x) => x !== 'ok'), /já foi chamado por outro médico/);
      await tela(pB, 'chamando');                                   // o celular do paciente toca
      assert.equal(await comoMedico(r[0] === 'ok' ? med1 : med2, 'devolver', { p_id: idB }), 'ok');
      await tela(pB, 'fila');
      assert.match(await pB.textContent('#app'), /Você não atendeu a chamada/);
    });

    await passo('um médico tenta chamar dois pacientes ao mesmo tempo: só um é chamado', async () => {
      const r = await Promise.all([comoMedico(med2, 'chamar', { p_id: idA }), comoMedico(med2, 'chamar', { p_id: idB })]);
      assert.equal(r.filter((x) => x === 'ok').length, 1, JSON.stringify(r));
      assert.match(r.find((x) => x !== 'ok'), /Encerre o atendimento em andamento/);
      assert.equal(await comoMedico(med2, 'devolver', { p_id: r[0] === 'ok' ? idA : idB }), 'ok');
      await posicao(pB, 1);
      await posicao(pA, 2);
    });

    await passo('médico 1 chama B pela tela; o celular de B toca com nome e CRM do médico', async () => {
      await cartaoFila(med1, B.nome).locator('[data-acao="chamar"]').click();
      await tela(pB, 'chamando');
      const txt = await pB.textContent('.toca');
      assert.match(txt, /Médica Teste Um/);
      assert.match(txt, /CRM-BA 90001/);
      await foto(pB, '04-paciente-tocando');
      await med1.waitForSelector('#col-ativo:not([hidden]) .ficha');
      assert.match(await med1.textContent('#ativo'), /Tocando no celular do paciente/);
    });

    await passo('B atende: vídeo conecta nos dois lados, com imagem', async () => {
      await pB.click('[data-acao="atender"]');
      await tela(pB, 'video');
      await Promise.all([videoConectado(pB, 'paciente'), videoConectado(med1, 'médico')]);
      await foto(pB, '05-paciente-video');
      await foto(med1, '06-painel-video');
    });

    await passo('microfone e câmera do paciente ligam e desligam', async () => {
      await pB.click('#b-mic');
      assert.equal(await pB.getAttribute('#b-mic', 'aria-label'), 'Ligar microfone');
      await pB.click('#b-mic');
      assert.equal(await pB.getAttribute('#b-mic', 'aria-label'), 'Desligar microfone');
      await pB.click('#b-cam');
      assert.equal(await pB.getAttribute('#b-cam', 'aria-label'), 'Ligar câmera');
      await pB.click('#b-cam');
    });

    await passo('paciente recarrega a página no meio da consulta e volta para a chamada', async () => {
      await pB.reload();
      await tela(pB, 'video');
      await pB.click('[data-acao="entrar-chamada"]');
      await Promise.all([videoConectado(pB, 'paciente'), videoConectado(med1, 'médico')]);
    });

    await passo('ficha pronta para o Amigo: copiar inteira, copiar campo, link do WhatsApp', async () => {
      await med1.click('#ativo [data-acao="copiar-ficha"]');
      await med1.waitForFunction(() => /Ficha copiada/.test(document.querySelector('#ativo')?.textContent || ''));
      const ficha = await med1.evaluate(() => navigator.clipboard.readText());
      const cpfMasc = B.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      for (const trecho of [`Nome: ${B.nome}`, `CPF: ${cpfMasc}`, 'CNS: 898 0011 6066 0006', `Nascimento: 10/05/1980 (${anos('1980-05-10')} anos)`, 'Telefone: (74) 99999-0002', 'Queixa principal: Febre alta e tosse', 'Febre > 39 °C: Sim', 'Dispneia: Não']) {
        assert.ok(ficha.includes(trecho), `ficha sem "${trecho}":\n${ficha}`);
      }
      await med1.click('#ativo [data-acao="copiar-campo"][data-i="1"]');
      await med1.waitForSelector('#ativo [data-acao="copiar-campo"][data-i="1"].feito');
      assert.equal(await med1.evaluate(() => navigator.clipboard.readText()), cpfMasc);
      assert.match(await med1.getAttribute('#ativo a[href^="https://wa.me/"]', 'href'), /^https:\/\/wa\.me\/5574999990002\?text=/);
    });

    await passo('médico finaliza: paciente vê "Atendimento encerrado"; contador de atendidos sobe', async () => {
      await med1.click('#ativo [data-acao="encerrar"][data-desfecho="finalizado"]');
      await tela(pB, 'fim');
      assert.match(await pB.textContent('#app'), /Atendimento encerrado/);
      await med1.waitForFunction(() => document.querySelectorAll('#tiles .tile b')[2]?.textContent.trim() === '1', null, { timeout: 15000 });
      await med1.waitForSelector('#col-ativo', { state: 'hidden' });
      await posicao(pA, 1);
    });

    await passo('A é chamado e não atende: médico devolve à fila e A mantém o lugar', async () => {
      await cartaoFila(med1, A.nome).locator('[data-acao="chamar"]').click();
      await tela(pA, 'chamando');
      await med1.click('#ativo [data-acao="devolver"]');
      await posicao(pA, 1);
      assert.match(await pA.textContent('#app'), /Você não atendeu a chamada/);
      await med1.waitForFunction((n) => [...document.querySelectorAll('#fila .pt')].some((c) => c.textContent.includes(n) && /já chamado/.test(c.textContent)), A.nome);
    });

    await passo('A é chamado de novo e recusa: sai da fila, painel fica livre', async () => {
      await cartaoFila(med1, A.nome).locator('[data-acao="chamar"]').click();
      await tela(pA, 'chamando');
      await pA.click('[data-acao="recusar"]');
      await tela(pA, 'fim');
      assert.match(await pA.textContent('#app'), /Pedido encerrado/);
      await med1.waitForSelector('#col-ativo', { state: 'hidden', timeout: 15000 });
      assert.match(await med1.textContent('#msg'), /saiu da fila antes do atendimento/);
    });

    await passo('D entra, fecha e reabre a página: continua na fila com a mesma senha', async () => {
      assert.equal(await cadastrar(pD, D), 'fila');
      const senha = (await pD.textContent('.ticket .senha')).trim();
      await pD.reload();
      await tela(pD, 'fila');
      await pD.waitForFunction((s) => document.querySelector('.ticket .senha')?.textContent.trim() === s, senha);
      await posicao(pD, 17);       // 15 da rajada + 1 duplicado na frente
    });

    await passo('médico 2 chama D fora da ordem, D atende, médico encaminha ao presencial', async () => {
      await cartaoFila(med2, D.nome).locator('[data-acao="chamar"]').click();
      await tela(pD, 'chamando');
      assert.match(await pD.textContent('.toca'), /Médico Teste Dois/);
      await pD.click('[data-acao="atender"]');
      await Promise.all([videoConectado(pD, 'paciente'), videoConectado(med2, 'médico 2')]);
      await med1.waitForFunction(() => /Com outros médicos/.test(document.querySelector('#outros')?.textContent || ''), null, { timeout: 15000 });
      await med2.click('#ativo [data-acao="encerrar"][data-desfecho="encaminhado"]');
      await tela(pD, 'fim');
      assert.match(await pD.textContent('#app'), /Procure atendimento presencial/);
    });

    await passo('sinal de alarme na triagem: não entra na fila, manda ligar 192', async () => {
      const p = await abrir(ctxPaciente(), 'pacAlarme');
      assert.equal(await cadastrar(p, { nome: 'TESTE E2E Alarme', cpf: novoCpf(), respostas: { peito: 'Sim' } }), 'alerta');
      assert.equal(await p.getAttribute('.alerta a.tel192', 'href'), 'tel:192');
      const r = await comoMedico(med1, 'buscar', 'TESTE E2E Alarme%');
      assert.equal(r.length, 0, 'paciente com sinal de alarme entrou na fila');
      await foto(p, '07-paciente-alarme');
      await p.context().close();
    });

    await passo('paciente sai da fila por conta própria', async () => {
      const p = await abrir(ctxPaciente(), 'pacSai');
      assert.equal(await cadastrar(p, { nome: 'TESTE E2E Desistente', cpf: novoCpf() }), 'fila');
      await p.click('[data-acao="sair-fila"]');
      await tela(p, 'fim');
      assert.match(await p.textContent('#app'), /Pedido encerrado/);
      await p.context().close();
    });

    await passo('painel: lista de encerrados do dia e saída do médico', async () => {
      await med1.click('#d-encerrados summary');
      const txt = await med1.textContent('#d-encerrados');
      assert.match(txt, /TESTE E2E Paciente Beta/);
      assert.match(txt, /Encaminhado ao presencial/);
      await foto(med1, '08-painel-final');
      await med2.click('[data-acao="sair"]');
      await med2.waitForSelector('#f-login');
      await med1.waitForFunction(() => document.querySelectorAll('#tiles .tile b')[3]?.textContent.trim() === '1', null, { timeout: 15000 });
    });

    await passo('nenhum erro de JavaScript nem violação de CSP nas páginas', async () => {
      assert.deepEqual(erros, []);
    });

    console.log('\nE2E_OK: todos os passos passaram em ' + BASE);
  } catch (e) {
    console.log(`FALHA ${passoAtual}\n      ${String(e.message).split('\n').slice(0, 12).join('\n      ')}`);
    for (const [nome, pg] of Object.entries({ med1, med2, pA, pB, pD })) await foto(pg, 'falha-' + nome);
    if (erros.length) console.log('erros de página:', JSON.stringify(erros, null, 1));
    process.exitCode = 1;
  } finally {
    await navegador.close();
  }
})();
