# Testes

## 1. Banco: regras de acesso e máquina de estados (`sql/teste_esquema.sql`)

Cole o arquivo inteiro no SQL Editor do Supabase (ou rode por `execute_sql`). O bloco termina
sempre com uma exceção, de propósito, para o Postgres desfazer tudo o que o teste criou:

- `TESTES_OK 26 blocos passaram` = tudo certo;
- `FALHA ...` = o que quebrou.

Pressupõe fila vazia. Gasta alguns números de senha (a sequência não volta atrás).

## 2. Ponta a ponta pelo navegador (`e2e.cjs`)

Abre dois médicos e vários pacientes no Chromium (câmera e microfone falsos) e percorre: login,
fila com prioridade, 15 entradas simultâneas, disputa entre médicos, chamada de vídeo, ficha para
o Amigo, desfechos, sinal de alarme e retomada depois de recarregar a página.

Precisa de dois médicos de teste já autorizados e com e-mail confirmado:

```bash
E2E_BASE=https://<site> \
E2E_MED1_EMAIL=... E2E_MED1_SENHA=... \
E2E_MED2_EMAIL=... E2E_MED2_SENHA=... \
E2E_FOTOS=/tmp/fotos \
node tests/e2e.cjs
```

Para testar a cópia local: `node tests/servidor-local.mjs` e `E2E_BASE=http://127.0.0.1:4173`.

O teste grava no banco de verdade. Todos os pacientes criados têm o nome começando por
`TESTE E2E`. Limpeza depois de rodar (como postgres, no SQL Editor):

```sql
delete from public.atendimentos where nome like 'TESTE E2E%';
-- e apague os dois médicos de teste em Authentication > Users e em medicos_autorizados
```

Nunca use nome, CPF ou telefone de pessoa real nos testes.
