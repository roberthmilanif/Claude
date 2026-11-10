-- Teste do esquema (regras de acesso + maquina de estados da fila).
-- Rodar inteiro de uma vez (SQL Editor do Supabase ou execute_sql). O bloco SEMPRE termina com uma
-- excecao: e de proposito, para o Postgres desfazer tudo o que o teste criou.
--   Sucesso  = mensagem "TESTES_OK ..."
--   Problema = mensagem "FALHA ..."
-- Pressupoe fila vazia (sem pacientes aguardando). Gasta alguns numeros de senha (a sequencia nao volta atras).

do $teste$
declare
  v_adm uuid := gen_random_uuid();
  v_col uuid := gen_random_uuid();
  v_intruso uuid := gen_random_uuid();
  ok jsonb := '{"resp":"Não","peito":"Não","neuro":"Não","febre":"Não","dor":"Não","cronica":"Não","tempo":"De 1 a 3 dias","escala":"Leve"}';
  p1 jsonb; p2 jsonb; p3 jsonb; p1b jsonb; s jsonb;
  n int; b boolean; err text; passou int := 0;
begin
  -- ---------- preparo (como postgres) ----------
  insert into auth.users (id, email, email_confirmed_at) values
    (v_adm, 'adm-teste@teste.invalid', now()),
    (v_col, 'colega-teste@teste.invalid', now()),
    (v_intruso, 'intruso-teste@teste.invalid', now());
  insert into public.medicos_autorizados (email, admin) values ('adm-teste@teste.invalid', true);
  update public.medicos set visto_em = null;   -- médico de verdade não conta como online durante o teste

  if not public.cpf_valido('52998224725') or public.cpf_valido('52998224724')
     or public.cpf_valido('11111111111') or public.cpf_valido('123') then
    raise exception 'FALHA cpf_valido';
  end if;
  passou := passou + 1;

  -- ---------- paciente (anon) ----------
  set local role anon;

  begin
    select count(*) into n from public.atendimentos;
    raise exception 'FALHA anon leu atendimentos';
  exception when insufficient_privilege then passou := passou + 1;
  end;
  begin
    select count(*) into n from public.medicos;
    raise exception 'FALHA anon leu medicos';
  exception when insufficient_privilege then passou := passou + 1;
  end;
  begin
    perform public.chamar(gen_random_uuid());
    raise exception 'FALHA anon executou chamar';
  exception when insufficient_privilege then passou := passou + 1;
  end;
  begin
    perform public.is_medico();
    raise exception 'FALHA anon executou is_medico';
  exception when insufficient_privilege then passou := passou + 1;
  end;
  begin
    perform public.cpf_valido('52998224725');
    raise exception 'FALHA anon executou cpf_valido';
  exception when insufficient_privilege then passou := passou + 1;
  end;

  -- entradas recusadas
  begin
    perform public.entrar_na_fila('Paciente Teste Um', '52998224724', '', '1980-05-10', '74999990001', 'Tosse', ok, '2026-11-10');
    raise exception 'FALHA aceitou CPF invalido';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'CPF inválido%' then raise exception 'FALHA cpf: %', err; end if;
    passou := passou + 1;
  end;
  begin
    perform public.entrar_na_fila('Paciente Teste Um', '52998224725', '', '1980-05-10', '74999990001', 'Tosse',
      ok || '{"peito":"Sim"}', '2026-11-10');
    raise exception 'FALHA aceitou sinal de alarme';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Sinal de alarme%' then raise exception 'FALHA alarme: %', err; end if;
    passou := passou + 1;
  end;
  begin
    perform public.entrar_na_fila('Paciente Teste Um', '52998224725', '', '1980-05-10', '74999990001', 'Tosse',
      ok - 'neuro', '2026-11-10');
    raise exception 'FALHA aceitou triagem incompleta';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Responda todas%' then raise exception 'FALHA triagem incompleta: %', err; end if;
    passou := passou + 1;
  end;
  begin
    perform public.entrar_na_fila('Paciente Teste Um', '52998224725', '', '1980-05-10', '74999990001', 'Tosse',
      ok || '{"escala":"<b>x</b>"}', '2026-11-10');
    raise exception 'FALHA aceitou valor fora da lista';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Responda todas%' then raise exception 'FALHA valor fora da lista: %', err; end if;
    passou := passou + 1;
  end;
  begin
    perform public.entrar_na_fila('Paciente Teste Um', '52998224725', '123', '1980-05-10', '74999990001', 'Tosse', ok, '2026-11-10');
    raise exception 'FALHA aceitou CNS curto';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'O Cartão do SUS%' then raise exception 'FALHA cns: %', err; end if;
    passou := passou + 1;
  end;
  begin
    perform public.entrar_na_fila('Paciente Teste Um', '52998224725', '', '1980-05-10', '74999990001', 'Tosse', ok, 'versao-velha');
    raise exception 'FALHA aceitou termo desatualizado';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Atualize a página%' then raise exception 'FALHA termos: %', err; end if;
    passou := passou + 1;
  end;
  begin
    perform public.entrar_na_fila('Paciente Teste Um', '52998224725', '', '2999-01-01', '74999990001', 'Tosse', ok, '2026-11-10');
    raise exception 'FALHA aceitou nascimento no futuro';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Data de nascimento%' then raise exception 'FALHA nasc: %', err; end if;
    passou := passou + 1;
  end;

  -- p1 comum, p2 prioridade (febre), p3 comum
  p1 := public.entrar_na_fila('  Paciente   Teste Um ', '529.982.247-25', '', '1980-05-10', '(74) 99999-0001', 'Tosse há 2 dias', ok, '2026-11-10');
  p2 := public.entrar_na_fila('Paciente Teste Dois', '11144477735', '898001160660006', '1955-01-20', '74999990002', 'Febre alta', ok || '{"febre":"Sim"}', '2026-11-10');
  p3 := public.entrar_na_fila('Paciente Teste Três', '12345678909', null, '2019-03-03', '7433330003', 'Dor de garganta', ok, '2026-11-10');
  if p1->>'token' is null or p1->>'senha' is null then raise exception 'FALHA entrar_na_fila sem token/senha'; end if;

  s := public.minha_situacao((p1->>'id')::uuid, (p1->>'token')::uuid);
  if (s->>'posicao')::int <> 2 or s->>'status' <> 'aguardando' or (s->>'medicos_online')::int <> 0
     or s->>'espera_min' is not null or s ? 'sala' then
    raise exception 'FALHA situacao p1: %', s;
  end if;
  s := public.minha_situacao((p2->>'id')::uuid, (p2->>'token')::uuid);
  if (s->>'posicao')::int <> 1 or not (s->>'prioridade')::boolean then raise exception 'FALHA situacao p2: %', s; end if;
  s := public.minha_situacao((p3->>'id')::uuid, (p3->>'token')::uuid);
  if (s->>'posicao')::int <> 3 then raise exception 'FALHA situacao p3: %', s; end if;
  if public.minha_situacao((p1->>'id')::uuid, gen_random_uuid()) is not null then
    raise exception 'FALHA situacao com token errado';
  end if;
  passou := passou + 1;

  -- mesmo CPF de novo: substitui o pedido e volta para o fim da fila
  p1b := public.entrar_na_fila('Paciente Teste Um', '52998224725', '', '1980-05-10', '74999990001', 'Tosse há 2 dias', ok, '2026-11-10');
  s := public.minha_situacao((p1->>'id')::uuid, (p1->>'token')::uuid);
  if s->>'status' <> 'desistiu' then raise exception 'FALHA pedido antigo nao virou desistiu: %', s; end if;
  s := public.minha_situacao((p1b->>'id')::uuid, (p1b->>'token')::uuid);
  if (s->>'posicao')::int <> 3 then raise exception 'FALHA novo pedido nao foi para o fim: %', s; end if;
  s := public.minha_situacao((p3->>'id')::uuid, (p3->>'token')::uuid);
  if (s->>'posicao')::int <> 2 then raise exception 'FALHA p3 nao subiu: %', s; end if;
  passou := passou + 1;

  -- ---------- usuario logado que NAO e medico ----------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_intruso, 'role', 'authenticated')::text, true);
  s := public.meu_acesso();
  if (s->>'autorizado')::boolean then raise exception 'FALHA intruso autorizado: %', s; end if;
  select count(*) into n from public.atendimentos;
  if n <> 0 then raise exception 'FALHA intruso leu % atendimentos', n; end if;
  select count(*) into n from public.medicos_autorizados;
  if n <> 0 then raise exception 'FALHA intruso leu autorizados'; end if;
  begin
    perform public.chamar((p2->>'id')::uuid);
    raise exception 'FALHA intruso chamou paciente';
  exception when others then
    get stacked diagnostics err = message_text;
    if err <> 'Acesso negado' then raise exception 'FALHA intruso chamar: %', err; end if;
  end;
  begin
    perform public.autorizar_medico('intruso-teste@teste.invalid', true);
    raise exception 'FALHA intruso se autorizou';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Só o administrador%' then raise exception 'FALHA intruso autorizar: %', err; end if;
  end;
  begin
    perform public.entrar_na_fila('Paciente Teste Quatro', '52998224725', '', '1980-05-10', '74999990001', 'Tosse', ok, '2026-11-10');
    raise exception 'FALHA usuario logado executou funcao do paciente';
  exception when insufficient_privilege then null;
  end;
  passou := passou + 1;

  -- ---------- medico administrador ----------
  perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
  if public.is_medico() then raise exception 'FALHA is_medico antes de meu_acesso'; end if;
  s := public.meu_acesso();
  if not (s->>'autorizado')::boolean or not (s->>'admin')::boolean then raise exception 'FALHA meu_acesso adm: %', s; end if;
  if not public.is_medico() or not public.is_admin() then raise exception 'FALHA is_medico/is_admin'; end if;

  begin
    perform public.chamar((p2->>'id')::uuid);
    raise exception 'FALHA chamou sem perfil';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Preencha seu nome e CRM%' then raise exception 'FALHA chamar sem perfil: %', err; end if;
  end;
  perform public.salvar_perfil('  Médica   Teste Admin ', 'ba', '12.345');
  select count(*) into n from public.medicos where nome = 'Médica Teste Admin' and crm = 'CRM-BA 12345';
  if n <> 1 then raise exception 'FALHA salvar_perfil'; end if;
  perform public.batimento();
  passou := passou + 1;

  select count(*) into n from public.atendimentos where status = 'aguardando';
  if n <> 3 then raise exception 'FALHA medico ve % aguardando (esperava 3)', n; end if;
  begin
    execute 'select token from public.atendimentos limit 1';
    raise exception 'FALHA medico leu token do paciente';
  exception when insufficient_privilege then passou := passou + 1;
  end;
  begin
    update public.atendimentos set nome = 'Alterado Direto';
    raise exception 'FALHA medico fez update direto';
  exception when insufficient_privilege then passou := passou + 1;
  end;
  begin
    insert into public.medicos_autorizados (email) values ('direto@teste.invalid');
    raise exception 'FALHA medico fez insert direto em autorizados';
  exception when insufficient_privilege then passou := passou + 1;
  end;

  -- chama p2 (prioridade); nao pode chamar outro ao mesmo tempo
  perform public.chamar((p2->>'id')::uuid);
  begin
    perform public.chamar((p3->>'id')::uuid);
    raise exception 'FALHA chamou dois ao mesmo tempo';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Encerre o atendimento em andamento%' then raise exception 'FALHA dois ao mesmo tempo: %', err; end if;
  end;
  passou := passou + 1;

  -- colega: autorizado pelo admin, entra, tenta chamar o mesmo paciente
  perform public.autorizar_medico(' Colega-Teste@teste.invalid ');
  begin
    perform public.autorizar_medico('adm-teste@teste.invalid', false);
    raise exception 'FALHA admin alterou a propria autorizacao';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Você não pode alterar%' then raise exception 'FALHA auto-alteracao: %', err; end if;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', v_col, 'role', 'authenticated')::text, true);
  s := public.meu_acesso();
  if not (s->>'autorizado')::boolean or (s->>'admin')::boolean then raise exception 'FALHA meu_acesso colega: %', s; end if;
  perform public.salvar_perfil('Médico Teste Colega', 'PI', '6789');
  perform public.batimento();
  begin
    perform public.chamar((p2->>'id')::uuid);
    raise exception 'FALHA dois medicos chamaram o mesmo paciente';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Este paciente já foi chamado%' then raise exception 'FALHA mesmo paciente: %', err; end if;
  end;
  begin
    perform public.autorizar_medico('outro@teste.invalid');
    raise exception 'FALHA colega (nao admin) autorizou';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Só o administrador%' then raise exception 'FALHA colega autorizar: %', err; end if;
  end;
  select count(*) into n from public.medicos_autorizados;
  if n <> 0 then raise exception 'FALHA colega leu lista de autorizados'; end if;
  passou := passou + 1;

  -- ---------- paciente atende ----------
  set local role anon;
  perform set_config('request.jwt.claims', '', true);
  s := public.minha_situacao((p2->>'id')::uuid, (p2->>'token')::uuid);
  if s->>'status' <> 'chamando' or s->>'sala' is null or s->>'medico_nome' <> 'Médica Teste Admin'
     or s->>'medico_crm' <> 'CRM-BA 12345' or s->>'medico_especialidade' is not null then
    raise exception 'FALHA situacao chamando: %', s;
  end if;
  if public.atender((p2->>'id')::uuid, gen_random_uuid()) then raise exception 'FALHA atendeu com token errado'; end if;
  if not public.atender((p2->>'id')::uuid, (p2->>'token')::uuid) then raise exception 'FALHA atender'; end if;
  if public.sair_da_fila((p2->>'id')::uuid, (p2->>'token')::uuid) then raise exception 'FALHA saiu da fila em atendimento'; end if;
  s := public.minha_situacao((p2->>'id')::uuid, (p2->>'token')::uuid);
  if s->>'status' <> 'atendimento' then raise exception 'FALHA status atendimento: %', s; end if;
  -- espera estimada: 2 medicos online, 1 ocupado, 1 livre -> o primeiro da fila tem espera 0
  s := public.minha_situacao((p3->>'id')::uuid, (p3->>'token')::uuid);
  if (s->>'posicao')::int <> 1 or (s->>'medicos_online')::int <> 2 or (s->>'espera_min')::int <> 0 then
    raise exception 'FALHA espera p3: %', s;
  end if;
  s := public.minha_situacao((p1b->>'id')::uuid, (p1b->>'token')::uuid);
  if (s->>'posicao')::int <> 2 or (s->>'espera_min')::int <> 2 then  -- (1 - 1 + 0,5) * 8 / 2 = 2
    raise exception 'FALHA espera p1b: %', s;
  end if;
  begin
    perform public.entrar_na_fila('Paciente Teste Dois', '11144477735', '', '1955-01-20', '74999990002', 'Febre alta', ok, '2026-11-10');
    raise exception 'FALHA aceitou novo pedido com atendimento em andamento';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Já existe um atendimento em andamento%' then raise exception 'FALHA cpf em andamento: %', err; end if;
  end;
  passou := passou + 1;

  -- ---------- medico encerra; nao atendeu; desistencia ----------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
  begin
    perform public.encerrar((p3->>'id')::uuid, 'finalizado');
    raise exception 'FALHA finalizou quem nao foi chamado';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Este atendimento já foi encerrado%' then raise exception 'FALHA encerrar aguardando: %', err; end if;
  end;
  perform public.encerrar((p2->>'id')::uuid, 'finalizado');
  begin
    perform public.encerrar((p2->>'id')::uuid, 'finalizado');
    raise exception 'FALHA encerrou duas vezes';
  exception when others then
    get stacked diagnostics err = message_text;
    if err not like 'Este atendimento já foi encerrado%' then raise exception 'FALHA encerrar 2x: %', err; end if;
  end;
  perform public.chamar((p3->>'id')::uuid);
  perform public.devolver((p3->>'id')::uuid);
  select count(*) into n from public.atendimentos where id = (p3->>'id')::uuid and status = 'aguardando' and medico_id is null and chamadas = 1;
  if n <> 1 then raise exception 'FALHA devolver'; end if;
  perform public.chamar((p3->>'id')::uuid);
  passou := passou + 1;

  set local role anon;
  perform set_config('request.jwt.claims', '', true);
  if not public.sair_da_fila((p3->>'id')::uuid, (p3->>'token')::uuid) then raise exception 'FALHA paciente recusar chamada'; end if;
  s := public.minha_situacao((p3->>'id')::uuid, (p3->>'token')::uuid);
  if s->>'status' <> 'desistiu' then raise exception 'FALHA status desistiu: %', s; end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_adm, 'role', 'authenticated')::text, true);
  perform public.chamar((p1b->>'id')::uuid);       -- o medico ficou livre depois que p3 recusou
  perform public.encerrar((p1b->>'id')::uuid, 'encaminhado');   -- encaminha direto de "chamando"
  select count(*) into n from public.atendimentos where status in ('aguardando','chamando','atendimento');
  if n <> 0 then raise exception 'FALHA sobrou % ativo', n; end if;
  passou := passou + 1;

  -- ---------- tirar a autorizacao corta o acesso na hora ----------
  perform public.desautorizar_medico('colega-teste@teste.invalid');
  perform set_config('request.jwt.claims', json_build_object('sub', v_col, 'role', 'authenticated')::text, true);
  if public.is_medico() then raise exception 'FALHA colega continua medico apos remocao'; end if;
  select count(*) into n from public.atendimentos;
  if n <> 0 then raise exception 'FALHA colega removido ainda le atendimentos'; end if;
  begin
    perform public.batimento();
    raise exception 'FALHA colega removido bateu ponto';
  exception when others then
    get stacked diagnostics err = message_text;
    if err <> 'Acesso negado' then raise exception 'FALHA batimento removido: %', err; end if;
  end;
  passou := passou + 1;

  raise exception 'TESTES_OK % blocos passaram', passou;
end
$teste$;
