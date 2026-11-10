// Mantém o projeto Supabase ativo: o plano gratuito pausa o banco depois de 7 dias sem uso.
// A Vercel chama esta rota uma vez por dia (ver "crons" em vercel.json). Não lê nem grava dado de paciente:
// consulta um pedido que não existe, só para gerar atividade real na API e no banco.
const URL_SUPABASE = 'https://lwxdvwsqswwgmzolqdit.supabase.co';
const CHAVE_PUBLICA = 'sb_publishable_-dntY82h6Lz2LVqCXC0khw_bgF8Rfh8';
const NULO = '00000000-0000-0000-0000-000000000000';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const r = await fetch(`${URL_SUPABASE}/rest/v1/rpc/minha_situacao`, {
      method: 'POST',
      headers: { apikey: CHAVE_PUBLICA, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_id: NULO, p_token: NULO }),
    });
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, supabase: r.status, em: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ ok: false, erro: String(e && e.message ? e.message : e) });
  }
};
