# Teleatendimento - passagem de trabalho para o Claude Code

Projeto do Dr. Roberth (tratar por "Doutor", PT-BR, respostas curtas). É o **aplicativo real**,
não protótipo. Este arquivo registra o que foi decidido e o estado em 10/11/2026.

## O que é

Pronto atendimento por telemedicina com fila, inspirado em um app usado em parceria com
prefeitura no Piauí. Fluxo: paciente informa dados -> termos -> triagem de 8 perguntas -> fila ->
o médico liga dentro do app (toca na tela do paciente, com nome e CRM do médico).

- Paciente informa nome completo, CPF, Cartão do SUS (opcional), nascimento, telefone e queixa.
- Fila organizada: prioridade primeiro, depois ordem de chegada.
- Prontuário, receita digital e controle dos atendimentos ficam no **Amigo** (AmigoOne/AmigoClinic).
  O painel entrega a ficha pronta para copiar (inteira ou campo a campo).
- Custo baixo: Supabase gratuito + Vercel Hobby.

## Decisões já tomadas pelo Doutor (não reabrir)

| Tema | Decisão |
|---|---|
| Formato | App web instalável no celular (PWA). Loja de aplicativos fica para depois. |
| Vídeo | Chamada dentro do app (toca na tela do paciente, ele atende). WhatsApp como reserva. |
| Pagamento | Sem cobrança no app nesta versão. |
| Banco | Projeto Supabase novo e separado. |
| Login do médico | E-mail roberth-milanif@hotmail.com (com hífen). Colegas ele cadastra depois. |
| Prontuário/receita | Continuam no Amigo. O painel entrega a ficha pronta para copiar. |

## Onde está cada coisa

| Caminho | O que é |
|---|---|
| `web/` | O site (raiz do projeto na Vercel). Estático, sem build. |
| `web/index.html` + `web/assets/paciente.js` | App do paciente. |
| `web/medico/index.html` + `web/assets/medico.js` | Painel do médico (`/medico`). |
| `web/assets/video.js` | Chamada WebRTC e sinalização. |
| `web/assets/comum.js` | Utilidades e as perguntas da triagem. |
| `web/config.js` | URL e chave pública do Supabase, nome do serviço, servidores ICE. |
| `web/vercel.json` | Cabeçalhos de segurança (CSP) e o agendamento do keep-alive. |
| `web/api/keepalive.js` | Rota chamada 1x/dia pela Vercel para o Supabase gratuito não pausar. |
| `supabase/migrations/` | Esquema do banco, exatamente como aplicado. |
| `tests/` | Teste do banco (SQL) e teste de ponta a ponta (Playwright). Ver `tests/README.md`. |
| `referencia/prototipo.html` | Protótipo antigo. Só referência de fluxo e visual. |

## Estado atual

- **Supabase**: projeto `teleatendimento`, ref `lwxdvwsqswwgmzolqdit`, sa-east-1, organização
  `zpujhvxulnkmkpzqrgsi`, plano gratuito. Migrações `0001_init` e `0002_menos_superficie` aplicadas.
- **Advisors de segurança**: nenhum erro. Restam avisos 0028/0029 ("função security definer
  executável por anon/authenticated"): são o próprio desenho (paciente sem conta só fala com o
  banco por 4 funções) e estão aceitos. Desempenho: só um índice ainda sem uso (banco novo).
- **Vercel**: ver seção "Publicação" abaixo.
- **Testes**: `tests/sql/teste_esquema.sql` passa (26 blocos). E2E: ver "Publicação".

## Arquitetura (como foi construído)

- **Front**: páginas estáticas, sem build e sem framework. `supabase-js` 2.119.0 e as fontes
  (Figtree, Bricolage Grotesque, licença OFL) estão copiadas em `web/assets/`: o site não carrega
  nada de terceiros além do Supabase. CSP estrita: nada de script ou estilo em linha (não usar
  atributo `style=""` nem `<script>` solto no HTML).
- **Paciente não tem conta e não lê tabela nenhuma.** Usa só `entrar_na_fila`, `minha_situacao`,
  `atender` e `sair_da_fila` (security definer, liberadas para `anon`). Recebe `id` + `token`,
  guarda no aparelho (localStorage) e consulta a situação a cada 5 s (3 s durante chamada).
- **Médico**: usuário do Supabase Auth com e-mail confirmado **e** e-mail em `medicos_autorizados`.
  A linha em `medicos` nasce em `meu_acesso()`, no primeiro login (não há gatilho em `auth.users`).
  Tirar o e-mail da lista corta o acesso na hora. Lê `atendimentos` por RLS (sem a coluna `token`)
  e **só escreve por funções**: `chamar`, `devolver`, `encerrar`, `salvar_perfil`, `batimento`.
  Só o admin autoriza/remove colegas (`autorizar_medico`, `desautorizar_medico`).
- **Privilégios padrão revogados**: função ou tabela nova em `public` não fica exposta na API.
  Toda migração nova precisa de `grant` explícito.
- **Fila**: prioridade primeiro, depois chegada. `chamar(id)` é atômico (dois médicos não chamam
  o mesmo paciente; um médico não chama dois ao mesmo tempo, garantido por índice único).
  Espera estimada = (pessoas na frente - médicos livres + 0,5) x duração típica / médicos online.
  Duração típica = mediana dos últimos 50 atendimentos (3 a 30 min); sem dados suficientes, 8 min.
- **Estados**: aguardando -> chamando -> atendimento -> finalizado; também desistiu e encaminhado.
  "Não atendeu" devolve para aguardando (mantém o lugar). Novo pedido com o mesmo CPF substitui
  o que estava aguardando e vai para o fim da fila.
- **Online**: médico = painel aberto (batimento a cada 30 s, vale 2 min). Paciente =
  `paciente_visto_em` atualizado pela consulta de situação; o painel mostra "aparelho sem sinal".
- **Vídeo**: WebRTC ponto a ponto. Sinalização por Supabase Realtime (broadcast) no canal
  `sala:<uuid>`; a sala é um uuid separado do token e só chega ao paciente quando ele é chamado.
  O médico sempre faz a oferta; o paciente responde. STUN público, **sem TURN**: parte das redes
  4G (CGNAT) não conecta. Depois de 30 s sem conectar, as duas telas avisam e o painel oferece
  "Abrir WhatsApp" (`https://wa.me/55<telefone>`). Para contratar TURN: `iceServers` em `web/config.js`.
- **O celular só toca com a página aberta.** O app pede para manter a tela ligada (wake lock) e
  orienta o paciente a não fechar. Aviso com o app fechado exigiria push (fora desta versão).

## Triagem

Perguntas lidas no app de referência: 1 dificuldade para respirar; 2 dor forte no peito;
3 ilegível no vídeo; 4 febre alta (acima de 39 °C); 5 dor intensa que não melhora; 6 doença
crônica com piora hoje; 7 há quanto tempo os sintomas começaram; 8 como classifica a dor.

Regras propostas pelo Claude e **ainda não validadas pelo Doutor**:
- Pergunta 3 = "desmaio, confusão ou perda de força em um lado do corpo".
- Sim em 1, 2 ou 3 não entra na fila: tela manda ligar 192 ou ir à UPA. O banco também recusa.
- Sim em 4, 5 ou 6, ou dor "forte", marca prioridade.
- Não é protocolo validado (não é Manchester). Tratar como rascunho.

As perguntas ficam em `web/assets/comum.js` (`PERGUNTAS`) e as regras em `entrar_na_fila`
(migração 0001). Mudou um, mude o outro.

## Publicação

(preenchido ao final da sessão de 10/11/2026; ver abaixo)

## Pendências e riscos

1. **E-mail do Supabase Auth**: o serviço de e-mail embutido só entrega para endereços que são
   membros da organização no Supabase. Colega de fora não recebe o link de confirmação: é preciso
   configurar SMTP próprio (Authentication > SMTP) ou criar um fluxo de cadastro pelo admin.
   Configurar também Authentication > URL Configuration (Site URL e Redirect URLs com a URL do
   site), senão o link do e-mail volta para localhost (a confirmação vale mesmo assim).
   **Nunca desligar "Confirm email"**: sem ela, quem se cadastrar primeiro com um e-mail
   autorizado vira médico.
2. Plano gratuito do Supabase pausa após 7 dias sem atividade. Mitigação: rota `/api/keepalive`
   chamada 1x/dia pela Vercel. Antes de divulgar para pacientes, considerar o plano pago
   (sem pausa e com backup).
3. `entrar_na_fila` é pública. Há validação forte e um freio global (300 pedidos em 10 min),
   mas não há captcha nem limite por IP. Avaliar Turnstile antes de divulgar o link.
4. LGPD: CPF e queixa são dado sensível. O consentimento fica registrado (`consentimento_em`,
   `termos_versao`). Falta definir prazo de retenção, quem é o controlador e o texto do aviso
   de privacidade com esses nomes.
5. CFM 2.314/2022: consentimento registrado, prontuário (no Amigo) e responsável técnico do
   serviço. O Doutor não tem RQE: a coluna `medicos.especialidade` fica nula e o app mostra só
   "Médico(a)" + CRM. Não anunciar especialidade.
6. Fora de escopo desta versão: envio de exames, aviso automático por WhatsApp/push, integração
   direta com o Amigo (perguntar ao suporte se há API), pagamento, TURN.
7. Perguntas ainda abertas: nome do serviço (`web/config.js` e `manifest.webmanifest`), horário
   de funcionamento e escala, texto definitivo para quando não há médico online.
8. O site está com `noindex` (cabeçalho em `vercel.json` e `robots.txt`) até o serviço ser lançado.

## Dados pessoais

Os vídeos de origem mostram nome de médica e de paciente reais. Não copiar esses nomes para
código, exemplos ou testes. Usar dados fictícios (os testes usam o prefixo "TESTE E2E").
