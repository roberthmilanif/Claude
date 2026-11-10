-- Reduz a superficie apontada pelo advisor 0029: as funcoes do paciente so sao chamadas sem login (anon),
-- e tempo_medio_min so e usada por dentro de minha_situacao.
revoke execute on function public.entrar_na_fila(text, text, text, date, text, text, jsonb, text) from authenticated;
revoke execute on function public.minha_situacao(uuid, uuid) from authenticated;
revoke execute on function public.atender(uuid, uuid) from authenticated;
revoke execute on function public.sair_da_fila(uuid, uuid) from authenticated;
revoke execute on function public.tempo_medio_min() from authenticated;
