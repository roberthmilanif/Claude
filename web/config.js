// Configuração pública do app. Nada aqui é segredo: a chave "publishable" do Supabase
// é feita para ficar no navegador; quem protege os dados são as regras do banco (RLS + funções).
window.TELE = {
  nome: 'Teleatendimento',                 // nome do serviço (pendente de definição pelo Doutor)
  supabaseUrl: 'https://lwxdvwsqswwgmzolqdit.supabase.co',
  supabaseKey: 'sb_publishable_-dntY82h6Lz2LVqCXC0khw_bgF8Rfh8',
  termosVersao: '2026-11-10',              // precisa ser igual ao valor conferido em entrar_na_fila()
  // Sem servidor TURN, parte das redes 4G (CGNAT) não conecta o vídeo; a reserva é o WhatsApp.
  // Para contratar TURN, basta acrescentar aqui: { urls: 'turn:...', username: '...', credential: '...' }
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }],
};
