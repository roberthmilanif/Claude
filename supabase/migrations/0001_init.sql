-- Teleatendimento: esquema inicial.
-- Revisado, testado e aplicado em 10/11/2026 no projeto lwxdvwsqswwgmzolqdit.
--
-- Regras do modelo de acesso:
--   * Paciente (anon) nao le nem escreve tabela nenhuma: so chama funcoes security definer.
--   * Medico (authenticated) le por RLS e escreve SOMENTE por funcoes (sem insert/update/delete direto).
--   * Funcao nova nasce sem EXECUTE para anon/authenticated: conceder explicitamente no fim do arquivo.

-- ---------- privilegios padrao: nada fica exposto na API sem concessao explicita ----------
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;

-- ---------- tabelas ----------
create table public.medicos_autorizados (
  email text primary key
    check (email = lower(email) and length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  admin boolean not null default false,          -- admin autoriza e remove colegas
  criado_em timestamptz not null default now()
);

create table public.medicos (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nome text check (length(nome) between 5 and 120),
  crm text check (length(crm) between 8 and 20),             -- "CRM-UF 12345", montado por salvar_perfil
  especialidade text check (length(especialidade) between 3 and 60),
    -- so preencher com RQE registrado (CFM); nulo = a tela do paciente mostra apenas "Médico(a)"
  visto_em timestamptz,                                      -- batimento do painel; online = ultimos 2 min
  criado_em timestamptz not null default now()
);

create table public.atendimentos (
  id uuid primary key default gen_random_uuid(),
  senha bigint generated always as identity (start with 100),
  token uuid not null default gen_random_uuid(),   -- segredo do paciente; nunca sai do banco para o medico
  sala uuid not null default gen_random_uuid(),    -- nome do canal de sinalizacao do video
  nome text not null check (length(nome) between 5 and 120),
  cpf text not null check (cpf ~ '^\d{11}$'),
  cns text check (cns ~ '^\d{15}$'),
  nasc date not null,
  tel text not null check (tel ~ '^\d{10,11}$'),
  queixa text not null check (length(queixa) between 3 and 1000),
  respostas jsonb not null,
  prioridade boolean not null default false,
  status text not null default 'aguardando'
    check (status in ('aguardando','chamando','atendimento','finalizado','desistiu','encaminhado')),
  chamadas smallint not null default 0,            -- quantas vezes o medico ja chamou
  termos_versao text not null,                     -- versao do termo aceito (LGPD / CFM 2.314)
  consentimento_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  paciente_visto_em timestamptz not null default now(),  -- ultima consulta de situacao feita pelo aparelho do paciente
  chamado_em timestamptz,
  iniciado_em timestamptz,
  finalizado_em timestamptz,
  medico_id uuid references public.medicos (id)
);

create index atendimentos_fila on public.atendimentos (prioridade desc, criado_em, senha)
  where status = 'aguardando';
create index atendimentos_criado_em on public.atendimentos (criado_em);
create index atendimentos_medico on public.atendimentos (medico_id);
-- um CPF so tem um pedido ativo por vez
create unique index atendimento_ativo_por_cpf on public.atendimentos (cpf)
  where status in ('aguardando','chamando','atendimento');
-- um medico so tem um paciente em chamada/atendimento por vez
create unique index atendimento_ativo_por_medico on public.atendimentos (medico_id)
  where status in ('chamando','atendimento');

-- ---------- quem e medico ----------
-- Medico = usuario com e-mail confirmado + e-mail na lista de autorizados + linha em medicos.
-- Tirar o e-mail de medicos_autorizados corta o acesso na hora.
create function public.is_medico() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.medicos m
    join auth.users u on u.id = m.id
    join public.medicos_autorizados a on a.email = lower(u.email)
    where m.id = (select auth.uid()) and u.email_confirmed_at is not null);
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.medicos m
    join auth.users u on u.id = m.id
    join public.medicos_autorizados a on a.email = lower(u.email)
    where m.id = (select auth.uid()) and u.email_confirmed_at is not null and a.admin);
$$;

-- ---------- RLS: so leitura, so para medico ----------
alter table public.medicos_autorizados enable row level security;
alter table public.medicos enable row level security;
alter table public.atendimentos enable row level security;

create policy admin_le_autorizados on public.medicos_autorizados
  for select to authenticated using ((select public.is_admin()));
create policy medico_le_medicos on public.medicos
  for select to authenticated using ((select public.is_medico()));
create policy medico_le_atendimentos on public.atendimentos
  for select to authenticated using ((select public.is_medico()));

revoke all on public.medicos_autorizados, public.medicos, public.atendimentos from public, anon, authenticated;
grant select on public.medicos_autorizados, public.medicos to authenticated;
-- sem a coluna token (segredo do paciente) e sem termos/consentimento (nao sao usados no painel)
grant select (id, senha, sala, nome, cpf, cns, nasc, tel, queixa, respostas, prioridade, status, chamadas,
              criado_em, paciente_visto_em, chamado_em, iniciado_em, finalizado_em, medico_id)
  on public.atendimentos to authenticated;

-- ---------- utilitarios ----------
create function public.cpf_valido(p text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare s int; t int; i int;
begin
  if p is null or p !~ '^\d{11}$' or p ~ '^(\d)\1{10}$' then return false; end if;
  for t in 9..10 loop
    s := 0;
    for i in 1..t loop s := s + substr(p, i, 1)::int * (t + 2 - i); end loop;
    if ((s * 10) % 11) % 10 <> substr(p, t + 1, 1)::int then return false; end if;
  end loop;
  return true;
end $$;

-- Duracao tipica de um atendimento (chamada ate encerramento), em minutos.
-- Mediana dos ultimos 50 finalizados em 30 dias, limitada a 3-30 min. Sem dados suficientes: 8 min (chute inicial).
create function public.tempo_medio_min() returns numeric
language sql stable security definer set search_path = '' as $$
  select case when count(*) >= 5
    then least(greatest(
      (percentile_cont(0.5) within group (
        order by (extract(epoch from (t.finalizado_em - t.chamado_em)) / 60.0)::double precision))::numeric,
      3), 30)
    else 8 end
  from (
    select a.finalizado_em, a.chamado_em
    from public.atendimentos a
    where a.status = 'finalizado' and a.chamado_em is not null
      and a.finalizado_em > now() - interval '30 days'
    order by a.finalizado_em desc
    limit 50) t;
$$;

-- ---------- paciente (anon) ----------
create function public.entrar_na_fila(
  p_nome text, p_cpf text, p_cns text, p_nasc date, p_tel text, p_queixa text, p_respostas jsonb, p_termos text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_nome text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_cns text := nullif(regexp_replace(coalesce(p_cns, ''), '\D', '', 'g'), '');
  v_tel text := regexp_replace(coalesce(p_tel, ''), '\D', '', 'g');
  v_queixa text := trim(coalesce(p_queixa, ''));
  v_hoje date := (now() at time zone 'America/Bahia')::date;
  r jsonb := coalesce(p_respostas, '{}'::jsonb);
  k text;
  a public.atendimentos;
begin
  if coalesce(p_termos, '') <> '2026-11-10' then
    raise exception 'Atualize a página e aceite os termos para continuar';
  end if;
  if length(v_nome) < 5 or length(v_nome) > 120 or position(' ' in v_nome) = 0 then
    raise exception 'Informe nome e sobrenome';
  end if;
  if not public.cpf_valido(v_cpf) then
    raise exception 'CPF inválido. Confira os números';
  end if;
  if v_cns is not null and v_cns !~ '^\d{15}$' then
    raise exception 'O Cartão do SUS tem 15 números. Confira ou deixe em branco';
  end if;
  if p_nasc is null or p_nasc > v_hoje or p_nasc < date '1900-01-01' then
    raise exception 'Data de nascimento inválida';
  end if;
  if v_tel !~ '^[1-9]{2}\d{8,9}$' then
    raise exception 'Informe o telefone com DDD';
  end if;
  if length(v_queixa) < 3 or length(v_queixa) > 1000 then
    raise exception 'Conte em poucas palavras o que está sentindo';
  end if;

  -- Triagem: as 8 respostas sao obrigatorias e so aceitam os valores previstos.
  -- RASCUNHO NAO VALIDADO (nao e Manchester): ver CLAUDE.md, secao Triagem.
  foreach k in array array['resp','peito','neuro','febre','dor','cronica'] loop
    if r->>k is null or r->>k not in ('Sim','Não') then
      raise exception 'Responda todas as perguntas da triagem';
    end if;
  end loop;
  if r->>'tempo' is null or r->>'tempo' not in ('Não tive sintomas','Menos de 24 horas','De 1 a 3 dias','Mais de 3 dias')
     or r->>'escala' is null or r->>'escala' not in ('Nenhuma','Leve','Moderada','Forte') then
    raise exception 'Responda todas as perguntas da triagem';
  end if;
  if 'Sim' in (r->>'resp', r->>'peito', r->>'neuro') then
    raise exception 'Sinal de alarme: procure atendimento presencial agora ou ligue 192';
  end if;

  -- Freio global contra enxurrada de pedidos (nao substitui captcha; ver CLAUDE.md, pendencias).
  if (select count(*) from public.atendimentos x where x.criado_em > now() - interval '10 minutes') >= 300 then
    raise exception 'Muitos pedidos ao mesmo tempo. Aguarde alguns minutos e tente de novo';
  end if;

  -- Serializa pedidos do mesmo CPF (dois toques seguidos no botao nao geram erro de indice unico).
  perform pg_advisory_xact_lock(hashtextextended('fila:' || v_cpf, 0));
  if exists (select 1 from public.atendimentos x where x.cpf = v_cpf and x.status in ('chamando','atendimento')) then
    raise exception 'Já existe um atendimento em andamento para este CPF';
  end if;
  -- Novo pedido substitui o que estava aguardando (volta para o fim da fila).
  update public.atendimentos x set status = 'desistiu', finalizado_em = now()
    where x.cpf = v_cpf and x.status = 'aguardando';

  insert into public.atendimentos (nome, cpf, cns, nasc, tel, queixa, respostas, prioridade, termos_versao)
  values (
    v_nome, v_cpf, v_cns, p_nasc, v_tel, v_queixa,
    jsonb_build_object('resp', r->>'resp', 'peito', r->>'peito', 'neuro', r->>'neuro', 'febre', r->>'febre',
                       'dor', r->>'dor', 'cronica', r->>'cronica', 'tempo', r->>'tempo', 'escala', r->>'escala'),
    'Sim' in (r->>'febre', r->>'dor', r->>'cronica') or r->>'escala' = 'Forte',
    p_termos)
  returning * into a;

  return jsonb_build_object('id', a.id, 'token', a.token, 'senha', a.senha);
end $$;

-- Situacao do pedido. Devolve null se id/token nao conferem.
-- Tambem registra que o aparelho do paciente esta com a pagina aberta (paciente_visto_em).
create function public.minha_situacao(p_id uuid, p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.atendimentos;
  m public.medicos;
  v_frente int;
  v_online int;
  v_ocupados int;
  v_livres int;
  v_espera int;
begin
  select * into a from public.atendimentos x where x.id = p_id and x.token = p_token;
  if not found then return null; end if;

  if a.status in ('aguardando','chamando','atendimento')
     and a.paciente_visto_em < now() - interval '10 seconds' then
    update public.atendimentos x set paciente_visto_em = now() where x.id = a.id;
  end if;

  if a.status = 'aguardando' then
    -- Ordem da fila: prioridade primeiro, depois hora de chegada.
    select count(*) into v_frente from public.atendimentos b
      where b.status = 'aguardando'
        and ((b.prioridade and not a.prioridade)
          or (b.prioridade = a.prioridade and (b.criado_em, b.senha) < (a.criado_em, a.senha)));
    select count(*) into v_online from public.medicos x
      where x.visto_em > now() - interval '2 minutes';
    select count(*) into v_ocupados from public.atendimentos b
      join public.medicos x on x.id = b.medico_id
      where b.status in ('chamando','atendimento') and x.visto_em > now() - interval '2 minutes';
    if v_online > 0 then
      v_livres := greatest(v_online - v_ocupados, 0);
      v_espera := case when v_frente < v_livres then 0
        else ceil((v_frente - v_livres + 0.5) * public.tempo_medio_min() / v_online)::int end;
    end if;
    return jsonb_build_object('status', a.status, 'senha', a.senha, 'prioridade', a.prioridade,
      'posicao', v_frente + 1, 'medicos_online', v_online, 'espera_min', v_espera, 'chamadas', a.chamadas);
  end if;

  if a.status in ('chamando','atendimento') then
    select * into m from public.medicos x where x.id = a.medico_id;
    return jsonb_build_object('status', a.status, 'senha', a.senha, 'sala', a.sala,
      'medico_nome', m.nome, 'medico_crm', m.crm, 'medico_especialidade', m.especialidade);
  end if;

  return jsonb_build_object('status', a.status, 'senha', a.senha);
end $$;

create function public.atender(p_id uuid, p_token uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.atendimentos x set status = 'atendimento', iniciado_em = now(), paciente_visto_em = now()
    where x.id = p_id and x.token = p_token and x.status = 'chamando';
  return found;
end $$;

create function public.sair_da_fila(p_id uuid, p_token uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.atendimentos x set status = 'desistiu', finalizado_em = now()
    where x.id = p_id and x.token = p_token and x.status in ('aguardando','chamando');
  return found;
end $$;

-- ---------- medico (authenticated) ----------
-- Chamado ao abrir o painel. Cria a linha em medicos na primeira vez que um e-mail autorizado
-- (e confirmado) entra. Nao depende de gatilho em auth.users.
create function public.meu_acesso() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmado boolean;
  v_admin boolean;
  m public.medicos;
begin
  if v_uid is null then raise exception 'Acesso negado'; end if;
  select lower(u.email), u.email_confirmed_at is not null into v_email, v_confirmado
    from auth.users u where u.id = v_uid;
  select a.admin into v_admin from public.medicos_autorizados a where a.email = v_email;
  if not found or not coalesce(v_confirmado, false) then
    return jsonb_build_object('autorizado', false, 'email', v_email);
  end if;
  insert into public.medicos (id, email) values (v_uid, v_email)
    on conflict (id) do update set email = excluded.email
    returning * into m;
  return jsonb_build_object('autorizado', true, 'admin', v_admin, 'id', m.id, 'email', m.email,
    'nome', m.nome, 'crm', m.crm, 'especialidade', m.especialidade);
end $$;

create function public.salvar_perfil(p_nome text, p_uf text, p_numero text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_nome text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_uf text := upper(trim(coalesce(p_uf, '')));
  v_num text := regexp_replace(coalesce(p_numero, ''), '\D', '', 'g');
begin
  if not public.is_medico() then raise exception 'Acesso negado'; end if;
  if length(v_nome) < 5 or length(v_nome) > 120 or position(' ' in v_nome) = 0 then
    raise exception 'Informe seu nome completo';
  end if;
  if v_uf not in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI',
                  'RJ','RN','RS','RO','RR','SC','SP','SE','TO') then
    raise exception 'Informe a UF do CRM';
  end if;
  if length(v_num) < 3 or length(v_num) > 7 then
    raise exception 'Informe o número do CRM';
  end if;
  update public.medicos x set nome = v_nome, crm = 'CRM-' || v_uf || ' ' || v_num
    where x.id = auth.uid();
end $$;

-- Batimento do painel: online = visto nos ultimos 2 min. batimento(false) marca offline na hora.
create function public.batimento(p_online boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_medico() then raise exception 'Acesso negado'; end if;
  update public.medicos x set visto_em = case when coalesce(p_online, true) then now() end
    where x.id = auth.uid();
end $$;

-- Atomico: dois medicos nao chamam o mesmo paciente, e um medico nao chama dois ao mesmo tempo.
create function public.chamar(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  m public.medicos;
begin
  if not public.is_medico() then raise exception 'Acesso negado'; end if;
  select * into m from public.medicos x where x.id = v_uid;
  if m.nome is null or m.crm is null then
    raise exception 'Preencha seu nome e CRM antes de chamar pacientes';
  end if;
  begin
    update public.atendimentos x
      set status = 'chamando', chamado_em = now(), iniciado_em = null, chamadas = x.chamadas + 1, medico_id = v_uid
      where x.id = p_id and x.status = 'aguardando';
  exception when unique_violation then
    raise exception 'Encerre o atendimento em andamento antes de chamar outro paciente';
  end;
  if not found then
    raise exception 'Este paciente já foi chamado por outro médico ou saiu da fila';
  end if;
  update public.medicos x set visto_em = now() where x.id = v_uid;
end $$;

-- Paciente nao atendeu: volta para a fila, na posicao original (ordem e por hora de chegada).
create function public.devolver(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_medico() then raise exception 'Acesso negado'; end if;
  update public.atendimentos x set status = 'aguardando', medico_id = null
    where x.id = p_id and x.status = 'chamando';
  if not found then
    raise exception 'Só dá para devolver à fila um paciente que está sendo chamado';
  end if;
end $$;

-- Desfechos: finalizado (atendido), encaminhado (mandado ao presencial), desistiu (nao compareceu / pedido invalido).
create function public.encerrar(p_id uuid, p_desfecho text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_medico() then raise exception 'Acesso negado'; end if;
  if p_desfecho is null or p_desfecho not in ('finalizado','encaminhado','desistiu') then
    raise exception 'Desfecho inválido';
  end if;
  update public.atendimentos x
    set status = p_desfecho, finalizado_em = now(), medico_id = coalesce(x.medico_id, auth.uid())
    where x.id = p_id
      and (x.status in ('chamando','atendimento') or (x.status = 'aguardando' and p_desfecho = 'desistiu'));
  if not found then
    raise exception 'Este atendimento já foi encerrado ou ainda não foi chamado';
  end if;
end $$;

create function public.autorizar_medico(p_email text, p_admin boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_meu text;
begin
  if not public.is_admin() then raise exception 'Só o administrador pode autorizar médicos'; end if;
  if length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido';
  end if;
  select lower(u.email) into v_meu from auth.users u where u.id = auth.uid();
  if v_email = v_meu then raise exception 'Você não pode alterar a sua própria autorização'; end if;
  insert into public.medicos_autorizados (email, admin) values (v_email, coalesce(p_admin, false))
    on conflict (email) do update set admin = excluded.admin;
end $$;

create function public.desautorizar_medico(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_meu text;
begin
  if not public.is_admin() then raise exception 'Só o administrador pode remover médicos'; end if;
  select lower(u.email) into v_meu from auth.users u where u.id = auth.uid();
  if v_email = v_meu then raise exception 'Você não pode remover a sua própria autorização'; end if;
  delete from public.medicos_autorizados a where a.email = v_email;
  update public.medicos x set visto_em = null where x.email = v_email;
end $$;

-- ---------- permissoes de execucao ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.entrar_na_fila(text, text, text, date, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.minha_situacao(uuid, uuid) to anon, authenticated;
grant execute on function public.atender(uuid, uuid) to anon, authenticated;
grant execute on function public.sair_da_fila(uuid, uuid) to anon, authenticated;
grant execute on function public.is_medico() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.meu_acesso() to authenticated;
grant execute on function public.salvar_perfil(text, text, text) to authenticated;
grant execute on function public.batimento(boolean) to authenticated;
grant execute on function public.chamar(uuid) to authenticated;
grant execute on function public.devolver(uuid) to authenticated;
grant execute on function public.encerrar(uuid, text) to authenticated;
grant execute on function public.autorizar_medico(text, boolean) to authenticated;
grant execute on function public.desautorizar_medico(text) to authenticated;
grant execute on function public.tempo_medio_min() to authenticated;

-- ---------- primeiro medico (administrador) ----------
insert into public.medicos_autorizados (email, admin) values ('roberth-milanif@hotmail.com', true);
