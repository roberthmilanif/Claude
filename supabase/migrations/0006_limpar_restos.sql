-- Remove o que sobrou da migração remota 20261110155140 (retencao_e_aviso_privacidade, ver 0004),
-- aplicada por outra sessão dois minutos antes da 0005: a tarefa agendada ficou apontando para uma
-- função que não existe mais, e ficaram duas funções públicas quebradas, uma coluna e dois índices sem uso.
-- O prazo de retenção das fichas continua pendente de decisão do Doutor (ver CLAUDE.md).

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'teleatendimento-retencao-fila') then
      perform cron.unschedule('teleatendimento-retencao-fila');
    end if;
  end if;
end $$;

drop function if exists public.aviso_privacidade();
drop function if exists public.registrar_consentimento_prontuario(uuid);
drop index if exists public.atendimentos_inatividade;
drop index if exists public.atendimentos_retencao;
alter table public.atendimentos drop column if exists consentimento_prontuario_em;

-- Mantido da 0004, agora validado: todo estado final tem data de encerramento.
alter table public.atendimentos drop constraint if exists atendimento_terminal_com_data;
alter table public.atendimentos add constraint atendimento_terminal_com_data
  check (status not in ('finalizado','desistiu','encaminhado') or finalizado_em is not null);

notify pgrst, 'reload schema';
