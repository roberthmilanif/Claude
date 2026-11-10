# Teleatendimento

Pronto atendimento por vídeo com fila de espera. App web instalável (PWA) para o paciente e
painel para o médico, com chamada de vídeo dentro do app.

- `web/`: o site (estático, publicado na Vercel com esta pasta como raiz).
- `supabase/migrations/`: esquema do banco (Supabase).
- `tests/`: testes do banco e de ponta a ponta.
- `CLAUDE.md`: decisões, arquitetura, estado atual e pendências.

Rodar localmente: `node tests/servidor-local.mjs` e abrir `http://127.0.0.1:4173`
(paciente) ou `http://127.0.0.1:4173/medico` (painel).
