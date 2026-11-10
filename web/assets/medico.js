// Painel do médico. Login por e-mail e senha (Supabase Auth); só entra quem está em medicos_autorizados.
// O painel lê atendimentos por RLS (somente leitura) e muda o estado da fila apenas pelas funções
// chamar, devolver e encerrar. "Online" = painel aberto, com batimento a cada 30 s.

import {
  cfg, criarCliente, $, esc, PERGUNTAS, mascCpf, mascTel, mascCns, dataIsoParaBr, idade, horaBr, dataHoraBr,
  minutosDesde, msgErro, som, copiar, ICONE,
} from './comum.js';
import { Chamada, ROTULO_ESTADO } from './video.js';

const sb = criarCliente(true);
const COLS = 'id,senha,sala,nome,cpf,cns,nasc,tel,queixa,respostas,prioridade,status,chamadas,criado_em,paciente_visto_em,chamado_em,iniciado_em,finalizado_em,medico_id';
const ATIVOS = ['chamando', 'atendimento'];
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const DESFECHO = { finalizado: 'Atendido', encaminhado: 'Encaminhado ao presencial', desistiu: 'Saiu sem atendimento' };

const M = {
  sessao: null,
  acesso: null,          // resposta de meu_acesso()
  modo: 'login',         // login | cadastro | recuperar | confirme | novaSenha | perfil
  emailPendente: '',
  lista: [],
  medicos: [],
  autorizados: null,
  chamada: null,
  chamadaId: null,
  copiado: '',
  ocupado: false,
  idsFila: null,
  aberto: { encerrados: false, admin: false },
  rodando: false,
};
const cache = {};
let tPoll = null;
let tBate = null;
let tMsg = null;

// ---------- utilidades de tela ----------
function por(id, html) {
  if (cache[id] === html) return;
  cache[id] = html;
  $('#' + id).innerHTML = html;
}

function avisar(texto) {
  const el = $('#msg');
  el.textContent = texto || '';
  clearTimeout(tMsg);
  if (texto) tMsg = setTimeout(() => { el.textContent = ''; }, 8000);
}

const erroForm = (t) => { const e = $('#acesso .erro'); if (e) e.textContent = t || ''; const i = $('#acesso .info'); if (i && t) i.textContent = ''; };
const infoForm = (t) => { const i = $('#acesso .info'); if (i) i.textContent = t || ''; const e = $('#acesso .erro'); if (e && t) e.textContent = ''; };

function msgAuth(e) {
  const c = e?.code || '';
  const m = String(e?.message || '');
  if (c === 'invalid_credentials' || /invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (c === 'email_not_confirmed' || /email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (c === 'email_address_not_authorized' || /address not authorized/i.test(m)) return 'O Supabase não enviou o e-mail de confirmação para este endereço: falta configurar o envio de e-mails do projeto. Avise o responsável técnico.';
  if (c === 'over_email_send_rate_limit' || /rate limit/i.test(m)) return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.';
  if (c === 'weak_password' || /password should/i.test(m)) return 'Senha fraca. Use pelo menos 8 caracteres.';
  if (c === 'user_already_exists' || /already registered/i.test(m)) return 'Este e-mail já tem cadastro. Use "Entrar" ou "Esqueci a senha".';
  if (c === 'same_password') return 'A nova senha precisa ser diferente da anterior.';
  if (c === 'signup_disabled') return 'O cadastro de novos usuários está desativado no projeto.';
  if (/fetch|network/i.test(m)) return 'Sem conexão com a internet.';
  return m || 'Não foi possível concluir. Tente de novo.';
}

// ---------- telas de acesso ----------
function vLogin() {
  return `<div class="cartao">
    <h1>Entrar no painel</h1>
    <form id="f-login" novalidate>
      <label for="l-email">E-mail<input id="l-email" type="email" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
      <label for="l-senha">Senha<input id="l-senha" type="password" autocomplete="current-password"></label>
      <div class="erro" role="alert"></div><div class="info" role="status"></div>
      <button class="primario" type="submit">Entrar</button>
    </form>
    <div class="pilha">
      <button class="link" data-acao="modo" data-modo="cadastro">Primeiro acesso: criar minha senha</button>
      <button class="link" data-acao="modo" data-modo="recuperar">Esqueci a senha</button>
    </div>
  </div>`;
}

function vCadastro() {
  return `<div class="cartao">
    <h1>Primeiro acesso</h1>
    <p class="muted">Use o e-mail que o responsável pelo serviço autorizou. Você recebe um link para confirmar o endereço.</p>
    <form id="f-cadastro" novalidate>
      <label for="c-email">E-mail<input id="c-email" type="email" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
      <label for="c-senha">Crie uma senha <small>pelo menos 8 caracteres</small><input id="c-senha" type="password" autocomplete="new-password"></label>
      <label for="c-senha2">Repita a senha<input id="c-senha2" type="password" autocomplete="new-password"></label>
      <div class="erro" role="alert"></div><div class="info" role="status"></div>
      <button class="primario" type="submit">Criar acesso</button>
    </form>
    <div class="pilha"><button class="link" data-acao="modo" data-modo="login">Já tenho senha: entrar</button></div>
  </div>`;
}

function vRecuperar() {
  return `<div class="cartao">
    <h1>Criar nova senha</h1>
    <p class="muted">Enviamos um link para o seu e-mail. Abra o link neste aparelho para definir a nova senha.</p>
    <form id="f-recuperar" novalidate>
      <label for="r-email">E-mail<input id="r-email" type="email" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
      <div class="erro" role="alert"></div><div class="info" role="status"></div>
      <button class="primario" type="submit">Enviar link</button>
    </form>
    <div class="pilha"><button class="link" data-acao="modo" data-modo="login">Voltar</button></div>
  </div>`;
}

function vConfirme() {
  return `<div class="cartao">
    <h1>Confirme seu e-mail</h1>
    <p>Enviamos um link de confirmação para <b>${esc(M.emailPendente)}</b>. Abra o e-mail, toque no link e depois volte aqui para entrar.</p>
    <p class="muted">Não chegou? Veja a caixa de spam. O envio pode levar alguns minutos.</p>
    <div class="pilha"><button class="primario" data-acao="modo" data-modo="login">Já confirmei: entrar</button></div>
  </div>`;
}

function vNovaSenha() {
  return `<div class="cartao">
    <h1>Definir nova senha</h1>
    <form id="f-nova-senha" novalidate>
      <label for="n-senha">Nova senha <small>pelo menos 8 caracteres</small><input id="n-senha" type="password" autocomplete="new-password"></label>
      <label for="n-senha2">Repita a senha<input id="n-senha2" type="password" autocomplete="new-password"></label>
      <div class="erro" role="alert"></div><div class="info" role="status"></div>
      <button class="primario" type="submit">Salvar senha</button>
    </form>
  </div>`;
}

function vNegado() {
  return `<div class="cartao">
    <h1>Acesso não autorizado</h1>
    <p>O e-mail <b>${esc(M.acesso?.email || M.sessao?.user?.email || '')}</b> não está na lista de médicos autorizados.</p>
    <p class="muted">Peça ao responsável pelo serviço para incluir este e-mail e entre de novo.</p>
    <div class="pilha"><button data-acao="recarregar-acesso">Tentar de novo</button><button class="fantasma" data-acao="sair">Sair</button></div>
  </div>`;
}

function vPerfil() {
  const a = M.acesso || {};
  const m = /^CRM-([A-Z]{2}) (\d+)$/.exec(a.crm || '') || [];
  return `<div class="cartao">
    <h1>Seus dados</h1>
    <p class="muted">O paciente vê seu nome e CRM na tela quando você chama (identificação exigida pela Resolução CFM 2.314/2022).</p>
    <form id="f-perfil" novalidate>
      <label for="p-nome">Nome completo<input id="p-nome" type="text" autocomplete="name" maxlength="120" value="${esc(a.nome || '')}"></label>
      <div class="linha2">
        <label for="p-uf">UF do CRM<select id="p-uf"><option value=""></option>${UFS.map((u) => `<option ${u === m[1] ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
        <label for="p-crm">Número do CRM<input id="p-crm" type="text" inputmode="numeric" maxlength="8" value="${esc(m[2] || '')}"></label>
      </div>
      <div class="erro" role="alert"></div><div class="info" role="status"></div>
      <button class="primario" type="submit">Salvar e abrir o painel</button>
    </form>
    <div class="pilha"><button class="fantasma" data-acao="sair">Sair</button></div>
  </div>`;
}

function qualTela() {
  if (!M.sessao) return ['cadastro', 'recuperar', 'confirme'].includes(M.modo) ? M.modo : 'login';
  if (M.modo === 'novaSenha') return 'novaSenha';
  if (!M.acesso) return 'carregando';
  if (!M.acesso.autorizado) return 'negado';
  if (!M.acesso.nome || !M.acesso.crm || M.modo === 'perfil') return 'perfil';
  return 'painel';
}

const ACESSO = {
  login: vLogin, cadastro: vCadastro, recuperar: vRecuperar, confirme: vConfirme, novaSenha: vNovaSenha,
  negado: vNegado, perfil: vPerfil, carregando: () => '<p class="muted">Carregando…</p>',
};

function decidir() {
  const t = qualTela();
  const noPainel = t === 'painel';
  $('#painel').hidden = !noPainel;
  $('#acesso').hidden = noPainel;
  $('#quem').hidden = !noPainel;
  if (noPainel) {
    por('acesso', '');            // não deixa e-mail/senha digitados guardados na página
    $('#quem-nome').textContent = M.acesso.nome;
    if (!M.rodando) iniciarPainel();
  } else {
    if (M.rodando) pararPainel();
    por('acesso', ACESSO[t]());
  }
}

async function carregarAcesso() {
  const { data, error } = await sb.rpc('meu_acesso');
  if (error) {
    M.acesso = null;
    por('acesso', `<div class="cartao"><h1>Não foi possível carregar</h1><p class="erro">${esc(msgErro(error))}</p>
      <div class="pilha"><button data-acao="recarregar-acesso">Tentar de novo</button><button class="fantasma" data-acao="sair">Sair</button></div></div>`);
    return;
  }
  M.acesso = data;
  decidir();
}

// ---------- dados do painel ----------
const pacienteOnline = (p) => Date.now() - new Date(p.paciente_visto_em).getTime() < 25000;
const medicoOnline = (m) => m?.visto_em && Date.now() - new Date(m.visto_em).getTime() < 120000;
const ordemFila = (a, b) => (b.prioridade - a.prioridade) || (new Date(a.criado_em) - new Date(b.criado_em)) || (a.senha - b.senha);

function triagemTexto(p) {
  const r = p.respostas || {};
  return PERGUNTAS.filter((q) => r[q.id]).map((q) => `${q.chip || q.rotulo}: ${r[q.id]}`).join('; ');
}

function fichaCampos(p) {
  return [
    ['Nome', p.nome],
    ['CPF', mascCpf(p.cpf)],
    ['CNS', p.cns ? mascCns(p.cns) : ''],
    ['Nascimento', dataIsoParaBr(p.nasc)],
    ['Telefone', mascTel(p.tel)],
    ['Queixa', p.queixa],
    ['Triagem', triagemTexto(p)],
  ];
}

function fichaTexto(p) {
  return [
    `Nome: ${p.nome}`,
    `CPF: ${mascCpf(p.cpf)}`,
    `CNS: ${p.cns ? mascCns(p.cns) : 'não informado'}`,
    `Nascimento: ${dataIsoParaBr(p.nasc)} (${idade(p.nasc)})`,
    `Telefone: ${mascTel(p.tel)}`,
    `Queixa principal: ${p.queixa}`,
    `Triagem: ${triagemTexto(p)}`,
    `Teleatendimento: senha ${p.senha}, entrada em ${dataHoraBr(p.criado_em)}`,
  ].join('\n');
}

function chips(p) {
  const r = p.respostas || {};
  return (p.prioridade ? '<span class="chip w">Prioridade</span>' : '')
    + PERGUNTAS.filter((q) => q.chip && r[q.id] === 'Sim').map((q) => `<span class="chip w">${esc(q.chip)}</span>`).join('')
    + (r.tempo ? `<span class="chip">${esc(r.tempo)}</span>` : '')
    + (r.escala ? `<span class="chip">Dor: ${esc(String(r.escala).toLowerCase())}</span>` : '');
}

function linkWhats(p, chamando) {
  const texto = chamando
    ? 'Olá! Aqui é do teleatendimento. Chegou a sua vez: abra o aplicativo para atender a chamada de vídeo.'
    : 'Olá! Aqui é do teleatendimento. O vídeo pelo aplicativo não conectou. Posso ligar por vídeo aqui pelo WhatsApp agora?';
  return `https://wa.me/55${encodeURIComponent(p.tel)}?text=${encodeURIComponent(texto)}`;
}

const titulo = (p) => `${esc(p.senha)} · ${esc(p.nome)}, ${esc(idade(p.nasc))}`;

function vFicha(p) {
  return `<div class="ficha">${fichaCampos(p).map(([k, v], i) => {
    const chave = `${p.id}:${i}`;
    const extra = k === 'Nascimento' ? ` (${esc(idade(p.nasc))})` : '';
    return `<span class="k">${k}</span><span class="v">${v ? esc(v) + extra : '<span class="muted">não informado</span>'}</span>${
      v ? `<button class="${M.copiado === chave ? 'feito' : ''}" data-acao="copiar-campo" data-id="${p.id}" data-i="${i}" aria-label="Copiar ${k}" title="Copiar ${k}">${ICONE.copiar}</button>` : '<span></span>'}`;
  }).join('')}</div>`;
}

function vAtivo(p) {
  const chamando = p.status === 'chamando';
  let faixa;
  if (chamando) {
    faixa = pacienteOnline(p)
      ? '<div class="faixa">Tocando no celular do paciente. Aguardando ele atender…</div>'
      : '<div class="faixa">O aparelho do paciente está sem sinal (tela fechada ou sem internet). Avise pelo WhatsApp.</div>';
  } else {
    faixa = M.chamada ? '' : '<div class="faixa ok">O paciente atendeu e está esperando no vídeo.</div>';
  }
  return `<div class="pt att ${p.prioridade ? 'pri' : ''}">
      <div class="top"><span class="nm">${titulo(p)}</span><span class="wt">${chamando ? 'chamando' : `em atendimento há ${minutosDesde(p.iniciado_em || p.chamado_em)} min`}</span></div>
      ${faixa}
      <div class="chips">${chips(p)}</div>
      ${vFicha(p)}
      <div class="acts">
        <button class="${M.copiado === p.id + ':tudo' ? 'feito' : ''}" data-acao="copiar-ficha" data-id="${p.id}">${M.copiado === p.id + ':tudo' ? 'Ficha copiada' : 'Copiar ficha para o Amigo'}</button>
        <a class="btn" href="${linkWhats(p, chamando)}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>
        ${M.chamada ? '' : '<button data-acao="abrir-video">Abrir vídeo</button>'}
      </div>
      <div class="acts">
        <button class="primario" data-acao="encerrar" data-desfecho="finalizado" data-id="${p.id}">Finalizar atendimento</button>
        <button data-acao="encerrar" data-desfecho="encaminhado" data-id="${p.id}">Encaminhar ao presencial</button>
      </div>
      ${chamando ? `<div class="acts sec">
        <button class="mini" data-acao="devolver" data-id="${p.id}">Não atendeu: devolver à fila</button>
        <button class="mini perigo" data-acao="encerrar" data-desfecho="desistiu" data-id="${p.id}">Não compareceu: tirar da fila</button>
      </div>` : ''}
    </div>`;
}

function vCardFila(p, podeChamar) {
  return `<div class="pt ${p.prioridade ? 'pri' : ''}">
      <div class="top"><span class="nm">${titulo(p)}</span><span class="wt">há ${minutosDesde(p.criado_em)} min</span></div>
      <div class="qx">${esc(p.queixa)}</div>
      <div class="chips">${chips(p)}${pacienteOnline(p) ? '' : '<span class="chip x">aparelho sem sinal</span>'}${p.chamadas ? `<span class="chip x">já chamado ${esc(p.chamadas)}x</span>` : ''}</div>
      <div class="acts"><button class="primario" data-acao="chamar" data-id="${p.id}" ${podeChamar ? '' : 'disabled'}>Chamar</button></div>
      <div class="acts sec">
        <a class="btn mini" href="${linkWhats(p, true)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <button class="mini" data-acao="encerrar" data-desfecho="desistiu" data-id="${p.id}">Tirar da fila</button>
      </div>
    </div>`;
}

function pintarPainel() {
  const eu = M.acesso.id;
  const fila = M.lista.filter((p) => p.status === 'aguardando').sort(ordemFila);
  const meu = M.lista.find((p) => ATIVOS.includes(p.status) && p.medico_id === eu) || null;
  const outros = M.lista.filter((p) => ATIVOS.includes(p.status) && p.medico_id !== eu);
  const encerrados = M.lista.filter((p) => DESFECHO[p.status]).sort((a, b) => new Date(b.finalizado_em) - new Date(a.finalizado_em));
  const atendidos = encerrados.filter((p) => p.status !== 'desistiu').length;
  const online = M.medicos.filter(medicoOnline).length;
  const maior = fila.length ? Math.max(...fila.map((p) => minutosDesde(p.criado_em))) : 0;
  const nomeMedico = (id) => M.medicos.find((m) => m.id === id)?.nome || 'outro médico';

  // aviso sonoro quando entra paciente novo
  const ids = new Set(fila.map((p) => p.id));
  if (M.idsFila && [...ids].some((id) => !M.idsFila.has(id))) som.aviso();
  M.idsFila = ids;
  document.title = `${fila.length ? `(${fila.length}) ` : ''}Painel do plantão`;

  // a chamada de vídeo acompanha o paciente ativo
  if (M.chamada && (!meu || meu.id !== M.chamadaId)) {
    fecharVideo();
    const foi = M.lista.find((p) => p.id === M.chamadaId);
    if (foi?.status === 'desistiu') avisar('O paciente saiu da fila antes do atendimento.');
    else if (foi?.status === 'aguardando') avisar('O paciente voltou para a fila.');
  }

  por('tiles', `<div class="tiles">
      <div class="tile"><b>${fila.length}</b><span>na fila</span></div>
      <div class="tile"><b>${maior} min</b><span>maior espera</span></div>
      <div class="tile"><b>${atendidos}</b><span>atendidos hoje</span></div>
      <div class="tile"><b>${online}</b><span>médico${online === 1 ? '' : 's'} online</span></div>
    </div>`);

  $('#col-ativo').hidden = !meu;
  $('#colunas').classList.toggle('tem-ativo', !!meu);
  por('ativo', meu ? vAtivo(meu) : '');

  por('fila', `<h2>Aguardando <small>${fila.length}</small></h2>
    ${meu ? '<p class="muted">Finalize o atendimento em andamento para chamar o próximo.</p>' : ''}
    <div class="lista">${fila.length ? fila.map((p) => vCardFila(p, !meu && !M.ocupado)).join('') : '<div class="vazio">Fila vazia.</div>'}</div>`);

  por('outros', outros.length ? `<h2>Com outros médicos <small>${outros.length}</small></h2>
    <div class="lista">${outros.map((p) => {
      const parado = !medicoOnline(M.medicos.find((m) => m.id === p.medico_id));
      return `<div class="pt att">
        <div class="top"><span class="nm">${titulo(p)}</span><span class="wt">${p.status === 'chamando' ? 'chamando' : 'em atendimento'} · ${esc(nomeMedico(p.medico_id))}</span></div>
        ${parado ? `<div class="acts sec"><span class="chip x">médico offline</span>
          ${p.status === 'chamando' ? `<button class="mini" data-acao="devolver" data-id="${p.id}">Devolver à fila</button>` : `<button class="mini" data-acao="encerrar" data-desfecho="finalizado" data-id="${p.id}">Finalizar</button>`}</div>` : ''}
      </div>`;
    }).join('')}</div>` : '');

  por('encerrados', `<details class="bloco" id="d-encerrados" ${M.aberto.encerrados ? 'open' : ''}>
      <summary>Encerrados hoje (${encerrados.length})</summary>
      ${encerrados.length ? `<div class="rolagem"><table>
        <tr><th>Senha</th><th>Paciente</th><th>Desfecho</th><th>Hora</th><th>Médico</th><th></th></tr>
        ${encerrados.map((p) => `<tr><td>${esc(p.senha)}</td><td>${esc(p.nome)}</td><td>${DESFECHO[p.status]}</td><td>${horaBr(p.finalizado_em)}</td><td>${p.medico_id ? esc(nomeMedico(p.medico_id)) : ''}</td>
          <td><button class="mini ${M.copiado === p.id + ':tudo' ? 'feito' : ''}" data-acao="copiar-ficha" data-id="${p.id}">${M.copiado === p.id + ':tudo' ? 'Copiada' : 'Copiar ficha'}</button></td></tr>`).join('')}
      </table></div>` : '<p class="muted">Nenhum atendimento encerrado hoje.</p>'}
    </details>`);

  pintarAdmin();
}

function pintarAdmin() {
  if (!M.acesso.admin) { por('admin', ''); return; }
  const lista = M.autorizados || [];
  por('admin', `<details class="bloco" id="d-admin" ${M.aberto.admin ? 'open' : ''}>
      <summary>Médicos autorizados (${lista.length})</summary>
      <p class="muted">Quem está nesta lista cria a própria senha em "Primeiro acesso", com o mesmo e-mail. Remover o e-mail corta o acesso na hora.</p>
      <div class="rolagem"><table>
        <tr><th>E-mail</th><th>Situação</th><th></th></tr>
        ${lista.map((a) => {
          const m = M.medicos.find((x) => x.email === a.email);
          const meu = a.email === M.acesso.email;
          return `<tr><td>${esc(a.email)}${a.admin ? ' <span class="chip">admin</span>' : ''}</td>
            <td>${m ? esc(m.nome || 'entrou, falta preencher os dados') + (m.crm ? ' · ' + esc(m.crm) : '') : '<span class="muted">ainda não entrou</span>'}</td>
            <td>${meu ? '' : `<button class="mini perigo" data-acao="desautorizar" data-email="${esc(a.email)}">Remover</button>`}</td></tr>`;
        }).join('')}
      </table></div>
      <form id="f-autorizar" class="em-linha" novalidate>
        <label for="a-email">Autorizar novo e-mail<input id="a-email" type="email" autocapitalize="none" spellcheck="false" placeholder="colega@exemplo.com"></label>
        <button type="submit">Autorizar</button>
      </form>
    </details>`);
}

async function atualizar() {
  if (!M.rodando) return;
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const [a, m] = await Promise.all([
    sb.from('atendimentos').select(COLS)
      .or(`status.in.(aguardando,chamando,atendimento),finalizado_em.gte."${inicio.toISOString()}"`)
      .order('criado_em').limit(1000),
    sb.from('medicos').select('id,email,nome,crm,visto_em'),
  ]);
  if (!M.rodando) return;
  if (a.error || m.error) { avisar(msgErro(a.error || m.error)); return; }
  M.lista = a.data;
  M.medicos = m.data;
  pintarPainel();
}

async function carregarAutorizados() {
  if (!M.acesso?.admin) return;
  const { data, error } = await sb.from('medicos_autorizados').select('email,admin,criado_em').order('criado_em');
  if (!error) { M.autorizados = data; if (M.rodando) pintarAdmin(); }
}

async function bater() {
  const { error } = await sb.rpc('batimento', { p_online: true });
  if (error && /Acesso negado/.test(error.message || '')) carregarAcesso();   // autorização removida
}

function iniciarPainel() {
  M.rodando = true;
  M.idsFila = null;
  for (const k of Object.keys(cache)) delete cache[k];
  bater();
  atualizar();
  carregarAutorizados();
  tBate = setInterval(bater, 30000);
  tPoll = setInterval(atualizar, 4000);
}

function pararPainel() {
  M.rodando = false;
  clearInterval(tBate);
  clearInterval(tPoll);
  fecharVideo();
}

// ---------- vídeo ----------
function pintarVideo(estado, c) {
  const el = $('#ch-estado');
  el.textContent = ROTULO_ESTADO[estado] || '';
  el.dataset.estado = estado;
  let msg = '';
  if (c.semMidia) msg = 'Câmera e microfone bloqueados neste navegador. Libere o acesso no cadeado da barra de endereço e abra o vídeo de novo.';
  else if (c.semCamera) msg = 'Sua câmera não abriu. A chamada segue só com áudio.';
  if (estado === 'falhou') msg = 'O vídeo não conectou (comum em rede 4G sem servidor TURN). Use o botão "Abrir WhatsApp"; o aplicativo continua tentando.';
  if (c.somBloqueado) msg = 'Clique aqui para ativar o som.';
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
  $('#v-local').hidden = c.semCamera || c.semMidia;
}

function abrirVideo() {
  const meu = M.lista.find((p) => ATIVOS.includes(p.status) && p.medico_id === M.acesso.id);
  if (!meu || M.chamada) return;
  $('#video').hidden = false;
  $('[data-acao="fechar-video"]').innerHTML = ICONE.sair;
  const c = new Chamada({
    sb,
    sala: meu.sala,
    papel: 'medico',
    elLocal: $('#v-local'),
    elRemoto: $('#v-remoto'),
    iceServers: cfg.iceServers,
    aoMudar: pintarVideo,
  });
  M.chamada = c;
  M.chamadaId = meu.id;
  pintarVideo('preparando', c);
  c.iniciar().then(() => { if (M.chamada === c) pintarVideo(c.estado, c); }).catch((e) => console.warn('chamada', e));
  pintarPainel();
}

function fecharVideo() {
  const c = M.chamada;
  M.chamada = null;
  M.chamadaId = null;
  c?.encerrar();
  $('#video').hidden = true;
}

// ---------- ações ----------
const achar = (id) => M.lista.find((p) => p.id === id);

function marcarCopiado(chave) {
  M.copiado = chave;
  pintarPainel();
  setTimeout(() => { if (M.copiado === chave) { M.copiado = ''; if (M.rodando) pintarPainel(); } }, 2500);
}

const CONFIRMA = {
  finalizado: 'Finalizar este atendimento? Confira se a ficha já foi copiada para o Amigo.',
  encaminhado: 'Encerrar e orientar o paciente a procurar atendimento presencial?',
  desistiu: 'Tirar este paciente da fila sem atendimento?',
};

const ACOES = {
  modo: (b) => { M.modo = b.dataset.modo; decidir(); },
  perfil: () => { M.modo = 'perfil'; decidir(); },
  'recarregar-acesso': () => carregarAcesso(),
  sair: async () => {
    if (M.rodando) await sb.rpc('batimento', { p_online: false }).then(() => {}, () => {});
    await sb.auth.signOut();
  },
  chamar: async (b) => {
    if (M.ocupado) return;
    M.ocupado = true;
    const { error } = await sb.rpc('chamar', { p_id: b.dataset.id });
    M.ocupado = false;
    if (error) avisar(msgErro(error)); else avisar('');
    await atualizar();
    if (!error) abrirVideo();
  },
  'abrir-video': () => abrirVideo(),
  'fechar-video': () => { fecharVideo(); pintarPainel(); },
  devolver: async (b) => {
    if (!confirm('Devolver o paciente à fila? Ele mantém o lugar e pode ser chamado de novo.')) return;
    const { error } = await sb.rpc('devolver', { p_id: b.dataset.id });
    if (error) avisar(msgErro(error));
    await atualizar();
  },
  encerrar: async (b) => {
    if (!confirm(CONFIRMA[b.dataset.desfecho])) return;
    const { error } = await sb.rpc('encerrar', { p_id: b.dataset.id, p_desfecho: b.dataset.desfecho });
    if (error) avisar(msgErro(error));
    await atualizar();
  },
  'copiar-campo': async (b) => {
    const p = achar(b.dataset.id);
    if (p && await copiar(fichaCampos(p)[+b.dataset.i][1])) marcarCopiado(`${p.id}:${b.dataset.i}`);
  },
  'copiar-ficha': async (b) => {
    const p = achar(b.dataset.id);
    if (p && await copiar(fichaTexto(p))) marcarCopiado(`${p.id}:tudo`);
  },
  desautorizar: async (b) => {
    if (!confirm(`Remover ${b.dataset.email}? Essa pessoa perde o acesso ao painel na hora.`)) return;
    const { error } = await sb.rpc('desautorizar_medico', { p_email: b.dataset.email });
    if (error) avisar(msgErro(error));
    await carregarAutorizados();
  },
  mic: () => { const c = M.chamada; if (c) { c.alternarMic(); pintarVideo(c.estado, c); } },
  cam: () => { const c = M.chamada; if (c) { c.alternarCam(); pintarVideo(c.estado, c); } },
  'som-chamada': () => { const c = M.chamada; if (c) { c.destravarSom(); pintarVideo(c.estado, c); } },
};

document.addEventListener('click', (e) => {
  som.destravar();
  const b = e.target.closest('[data-acao]');
  if (!b || b.disabled) return;
  ACOES[b.dataset.acao]?.(b);
});

const FORMS = {
  'f-login': async () => {
    const email = $('#l-email').value.trim().toLowerCase();
    const senha = $('#l-senha').value;
    if (!email || !senha) { erroForm('Informe e-mail e senha.'); return; }
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) erroForm(msgAuth(error));
  },
  'f-cadastro': async () => {
    const email = $('#c-email').value.trim().toLowerCase();
    const senha = $('#c-senha').value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { erroForm('Informe um e-mail válido.'); return; }
    if (senha.length < 8) { erroForm('A senha precisa ter pelo menos 8 caracteres.'); return; }
    if (senha !== $('#c-senha2').value) { erroForm('As duas senhas não são iguais.'); return; }
    const { data, error } = await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: location.origin + '/medico' } });
    if (error) { erroForm(msgAuth(error)); return; }
    if (data.session) return;                                   // projeto sem confirmação de e-mail: já entrou
    if (data.user && data.user.identities?.length === 0) { erroForm('Este e-mail já tem cadastro. Use "Entrar" ou "Esqueci a senha".'); return; }
    M.emailPendente = email;
    M.modo = 'confirme';
    decidir();
  },
  'f-recuperar': async () => {
    const email = $('#r-email').value.trim().toLowerCase();
    if (!email) { erroForm('Informe o e-mail.'); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/medico' });
    if (error) erroForm(msgAuth(error)); else infoForm('Se este e-mail tiver cadastro, o link chega em alguns minutos.');
  },
  'f-nova-senha': async () => {
    const senha = $('#n-senha').value;
    if (senha.length < 8) { erroForm('A senha precisa ter pelo menos 8 caracteres.'); return; }
    if (senha !== $('#n-senha2').value) { erroForm('As duas senhas não são iguais.'); return; }
    const { error } = await sb.auth.updateUser({ password: senha });
    if (error) { erroForm(msgAuth(error)); return; }
    M.modo = 'login';
    await carregarAcesso();
  },
  'f-perfil': async () => {
    const { error } = await sb.rpc('salvar_perfil', { p_nome: $('#p-nome').value, p_uf: $('#p-uf').value, p_numero: $('#p-crm').value });
    if (error) { erroForm(msgErro(error)); return; }
    M.modo = 'login';
    await carregarAcesso();
  },
  'f-autorizar': async () => {
    const campo = $('#a-email');
    const { error } = await sb.rpc('autorizar_medico', { p_email: campo.value, p_admin: false });
    if (error) { avisar(msgErro(error)); return; }
    campo.value = '';
    avisar('');
    await carregarAutorizados();
  },
};

document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = FORMS[e.target.id];
  if (!f) return;
  const botao = e.target.querySelector('button[type=submit]');
  if (botao) botao.disabled = true;
  try { await f(); } finally { if (botao?.isConnected) botao.disabled = false; }
});

document.addEventListener('toggle', (e) => {
  if (e.target.id === 'd-encerrados') M.aberto.encerrados = e.target.open;
  if (e.target.id === 'd-admin') M.aberto.admin = e.target.open;
}, true);

// Fechou a aba: marca offline na hora (se não der tempo, o batimento expira sozinho em 2 min).
addEventListener('pagehide', () => {
  const t = M.sessao?.access_token;
  if (!t || !M.rodando) return;
  try {
    fetch(cfg.supabaseUrl + '/rest/v1/rpc/batimento', {
      method: 'POST',
      keepalive: true,
      headers: { apikey: cfg.supabaseKey, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      body: '{"p_online":false}',
    }).catch(() => {});
  } catch { /* navegador sem keepalive */ }
});
addEventListener('pageshow', (e) => { if (e.persisted && M.rodando) { bater(); atualizar(); } });

// ---------- sessão ----------
sb.auth.onAuthStateChange((evento, sessao) => {
  // adia para fora do callback: chamar o Supabase aqui dentro pode travar a biblioteca
  setTimeout(() => {
    const antes = M.sessao?.user?.id || null;
    const agora = sessao?.user?.id || null;
    M.sessao = sessao;
    if (evento === 'PASSWORD_RECOVERY') { M.modo = 'novaSenha'; decidir(); return; }
    if (!sessao) {
      M.acesso = null;
      if (!['cadastro', 'recuperar', 'confirme'].includes(M.modo)) M.modo = 'login';
      decidir();
      return;
    }
    if (agora !== antes || !M.acesso) {
      M.acesso = null;
      if (M.modo !== 'novaSenha') M.modo = 'login';
      decidir();
      carregarAcesso();
    }
  }, 0);
});
