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
| `supabase/migrations/` | Esquema do banco, na ordem do histórico remoto (0003 e 0004 são só marcadores de migrações de outra sessão). |
| `tests/` | Teste do banco (SQL) e teste de ponta a ponta (Playwright). Ver `tests/README.md`. |
| `referencia/prototipo.html` | Protótipo antigo. Só referência de fluxo e visual. |

## Estado atual

- **No ar**: https://teleatendimento-brown.vercel.app (paciente) e `/medico` (painel).
- **Supabase**: projeto `teleatendimento`, ref `lwxdvwsqswwgmzolqdit`, sa-east-1, organização
  `zpujhvxulnkmkpzqrgsi`, plano gratuito. Seis migrações no histórico remoto (ver "O que aconteceu
  em 10/11" abaixo); o esquema em vigor é o de `0001` + `0002`, recriado pela `0005`.
  O Doutor já tem usuário (e-mail confirmado), perfil preenchido e é o admin.
- **Advisors de segurança**: nenhum erro. Avisos aceitos: 0028/0029 ("função security definer
  executável por anon/authenticated": é o próprio desenho, o paciente sem conta só fala com o banco
  por 4 funções) e "leaked password protection" desligada (liga-se no painel do Supabase Auth).
  Desempenho: só um índice ainda sem uso (banco novo).
- **Testes** (10/11/2026): `tests/sql/teste_esquema.sql` passa (26 blocos) e `tests/e2e.cjs` passa
  inteiro contra o site publicado (23 passos). Os dados e os médicos de teste foram apagados.

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
(texto em vigor: migração 0005, que recria a da 0001). Mudou um, mude o outro, em migração nova.

## Publicação

- **Vercel**: conta pessoal do Doutor (escopo `roberths-projects-885b6f07`, id
  `team_ZThoAaL5UJwlghNBpI8EYXbB`), projeto `teleatendimento`
  (`prj_ib7pcRdHpkKg8hyxiH59zQbxdE6F`), sem framework, raiz `web`. O conector da Vercel pede
  autorização do escopo a cada sessão nova (`authorize_team_access`; o Doutor aprova por um link).
- **Como publicar**: `create_deployment` com `target: production` e
  `gitSource: { type: github, org: roberthmilanif, repo: Claude, ref: <branch>, sha: <commit> }`.
  Não há publicação automática a cada push confirmada; publicar de propósito depois de testar.
- **Depois de publicar**: rodar `tests/e2e.cjs` contra a URL (precisa de dois médicos de teste;
  ver `tests/README.md`) e apagar os dados de teste.
- **Rede da sessão de nuvem**: o ambiente "Claude (teleatendimento)" libera só
  `teleatendimento-brown.vercel.app` e `lwxdvwsqswwgmzolqdit.supabase.co`, o suficiente para o E2E.
- O que o E2E **não** prova: os dois lados rodam na mesma máquina, com câmera falsa. Ele confirma
  sinalização, fluxo e telas, mas não confirma conexão em 4G/CGNAT nem câmera, microfone e toque em
  celular de verdade (em especial iPhone/Safari). Isso é teste manual do Doutor.

## O que aconteceu em 10/11 (duas sessões no mesmo banco)

Enquanto esta sessão trabalhava, outra sessão (fora do Claude Code na nuvem) recebeu o mesmo pedido
e mexeu no mesmo Supabase e na mesma Vercel:

- aplicou `endurecer_fila_e_sinalizacao` (0003) e `retencao_e_aviso_privacidade` (0004) direto no
  banco, apagando as funções da 0001 e pondo outra API (fila só por ordem de chegada, sem bloqueio
  de sinal de alarme, médico só podia chamar o primeiro, sinalização de vídeo por tabela, limpeza
  agendada com pg_cron);
- publicou outro app (Vite) no projeto `teleatendimento` da Vercel.

O Doutor escolheu a versão deste repositório e encerrou a outra sessão. A `0005` desfez a 0003 e
recriou a API; a `0006` tirou os restos da 0004. Ficou de lá só o hook opcional
`teleatendimento_private.bloquear_cadastro_nao_autorizado` (barra cadastro de e-mail não autorizado;
liga-se em Authentication > Hooks > Before User Created) e a extensão pg_cron instalada, sem tarefas.
Os dois deploys antigos do outro app continuam listados no projeto da Vercel: não promover.

**Lição**: antes de aplicar migração, conferir `list_migrations`. Se aparecer migração que não está
em `supabase/migrations/`, parar e avisar o Doutor: há outra sessão ou alguém mexendo.

## Pendências e riscos

1. **E-mail do Supabase Auth**: o serviço de e-mail embutido só entrega para endereços que são
   membros da organização no Supabase (o do Doutor chegou). Colega de fora não recebe o link de
   confirmação: é preciso configurar SMTP próprio (Authentication > SMTP) ou criar um fluxo de
   cadastro pelo admin. Conferir Authentication > URL Configuration: Site URL
   `https://teleatendimento-brown.vercel.app` e Redirect URL `https://teleatendimento-brown.vercel.app/medico`.
   **Nunca desligar "Confirm email"**: sem ela, quem se cadastrar primeiro com um e-mail
   autorizado vira médico.
2. Plano gratuito do Supabase pausa após 7 dias sem atividade. Mitigação: rota `/api/keepalive`
   chamada 1x/dia pela Vercel. Antes de divulgar para pacientes, considerar o plano pago
   (sem pausa e com backup).
3. `entrar_na_fila` é pública. Há validação forte e um freio global (300 pedidos em 10 min),
   mas não há captcha nem limite por IP. Avaliar Turnstile antes de divulgar o link.
4. LGPD: CPF e queixa são dado sensível. O consentimento fica registrado (`consentimento_em`,
   `termos_versao`). Falta definir prazo de retenção, quem é o controlador e o texto do aviso
   de privacidade com esses nomes. Hoje nada é apagado sozinho: as fichas ficam no banco.
   (A outra sessão tinha posto 7 dias por conta própria; foi removido por não ser decisão do Doutor.)
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
