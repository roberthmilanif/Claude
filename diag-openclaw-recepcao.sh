#!/bin/bash
# diag-openclaw-recepcao.sh
# Diagnostico SOMENTE LEITURA do OpenClaw da recepcao (perfil nexus-recepcao) no Mac mini.
# Nao altera nada. Nao imprime tokens, chaves, telefones nem conteudo de mensagens.
# Uso:  bash ~/Downloads/diag-openclaw-recepcao.sh > ~/Desktop/diag-recepcao.txt 2>&1
set +e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
P=nexus-recepcao
S="$HOME/.openclaw-$P"
MOD="$HOME/Documents/nexus-consultorio/integracoes/openclaw-nexus-administrativo"
line(){ printf '\n== %s ==\n' "$1"; }
semseg(){ grep -v -i -E 'token|secret|apikey|api_key|password' | sed -E 's/\+?55[0-9]{10,11}/[telefone]/g'; }

echo "diag-openclaw-recepcao  $(date '+%d/%m/%Y %H:%M %Z')"

line "Mac"
echo "macOS: $(sw_vers -productVersion 2>/dev/null)  host: $(scutil --get ComputerName 2>/dev/null)  usuario: $USER"
echo "uptime: $(uptime)"
BT=$(sysctl -n kern.boottime 2>/dev/null | sed -E 's/.*sec = ([0-9]+).*/\1/')
[ -n "$BT" ] && echo "ultimo boot: $(date -r "$BT" '+%d/%m/%Y %H:%M')"
echo "energia (pmset -g): $(pmset -g 2>/dev/null | grep -E '^ *(sleep|disksleep|womp|SleepDisabled|hibernatemode)' | tr -s ' ' | tr '\n' ';')"
echo "assercoes anti-repouso: $(pmset -g assertions 2>/dev/null | grep -c -E 'PreventUserIdleSystemSleep.*1|caffeinate')"
echo "disco: $(df -h / | tail -1 | awk '{print $4" livres de "$2}')"
if ping -c1 -W2 web.whatsapp.com >/dev/null 2>&1; then echo "rede: OK (web.whatsapp.com responde)"; else echo "rede: FALHOU (web.whatsapp.com nao responde)"; fi

line "OpenClaw CLI"
if command -v openclaw >/dev/null 2>&1; then
  echo "binario: $(command -v openclaw)  versao: $(openclaw --version 2>/dev/null | head -1)"
else
  echo "openclaw NAO esta no PATH"
fi
[ -x "$S/bin/openclaw" ] && echo "wrapper do perfil: $S/bin/openclaw ($("$S/bin/openclaw" --version 2>/dev/null | head -1))"

line "Servicos launchd ai.openclaw.*  (esperado: ai.openclaw.$P e ai.openclaw.gateway)"
launchctl list 2>/dev/null | grep -i openclaw || echo "NENHUM job ai.openclaw.* carregado"
echo "-- plists em ~/Library/LaunchAgents --"
ls -la ~/Library/LaunchAgents/ 2>/dev/null | grep -i openclaw || echo "nenhum plist openclaw"
for lbl in "ai.openclaw.$P" ai.openclaw.gateway; do
  echo "-- launchctl print $lbl --"
  launchctl print "gui/$(id -u)/$lbl" 2>/dev/null | grep -E 'state =|pid =|last exit code|runs =|program =' | head -6 || echo "nao carregado"
done

line "Processos openclaw"
pgrep -fl openclaw 2>/dev/null | grep -v pgrep | cut -c1-160 || echo "nenhum processo openclaw"

line "Portas: 19789 (recepcao) e 18789 (pessoal)"
for port in 19789 18789; do
  out=$(lsof -nP -iTCP:$port -sTCP:LISTEN 2>/dev/null | tail -n +2)
  if [ -n "$out" ]; then echo "$port: $out"; else echo "$port: NINGUEM escutando"; fi
done

line "Perfil $P: pastas e arquivos esperados"
for d in "$S" "$S/openclaw.json" "$S/credentials/whatsapp/default" "$S/atendimento-administrativo" "$S/workspace" "$MOD" "$MOD/openclaw.plugin.json" "$MOD/node_modules/openclaw"; do
  if [ -e "$d" ]; then echo "OK    $d  (mod $(stat -f '%Sm' -t '%d/%m %H:%M' "$d" 2>/dev/null))"; else echo "FALTA $d"; fi
done
echo "arquivos de credencial WhatsApp da recepcao: $(ls "$S/credentials/whatsapp/default" 2>/dev/null | wc -l | tr -d ' ')"

line "Perfil $P: gateway status --deep"
openclaw --profile "$P" gateway status --deep 2>&1 | semseg | head -45

line "Perfil $P: canais (status --probe)"
openclaw --profile "$P" channels status --probe 2>&1 | semseg | head -30

line "Perfil $P: chaves de configuracao (sem segredos)"
for k in plugins.entries.nexus-recepcao.enabled plugins.entries.nexus-recepcao.config.entradaConfirmada plugins.entries.nexus-recepcao.config.perfilExclusivo plugins.entries.nexus-recepcao.config.pastaEstado plugins.load.paths channels.whatsapp.enabled channels.whatsapp.dmPolicy channels.whatsapp.groupPolicy gateway.port gateway.bind agents.entries.nexus-recepcao.runtime bindings; do
  printf '%s = ' "$k"; openclaw --profile "$P" config get "$k" 2>&1 | semseg | tr '\n' ' ' | cut -c1-300; echo
done

line "Perfil $P: doctor (somente leitura; NAO usar --fix)"
openclaw --profile "$P" doctor 2>&1 | semseg | head -45

line "Perfil $P: estado dos atendimentos (so contagens)"
E="$S/atendimento-administrativo"
if [ -d "$E" ]; then
  echo "arquivos: $(find "$E" -type f 2>/dev/null | wc -l | tr -d ' ')"
  echo "alterados nos ultimos 14 dias: $(find "$E" -type f -newermt "$(date -v-14d '+%Y-%m-%d')" 2>/dev/null | wc -l | tr -d ' ')"
  echo "ultima alteracao: $(find "$E" -type f -exec stat -f '%m' {} \; 2>/dev/null | sort -n | tail -1 | xargs -I{} date -r {} '+%d/%m/%Y %H:%M')"
  echo "-- etapas --";  find "$E" -type f -name '*.json' -exec grep -h -o '"etapa":"[a-z_]*"' {} \; 2>/dev/null | sort | uniq -c
  echo "-- estados --"; find "$E" -type f -name '*.json' -exec grep -h -o '"estado":"[a-z_]*"' {} \; 2>/dev/null | sort | uniq -c
else
  echo "pasta de estado ausente: $E"
fi

line "Perfil $P: logs (so nivel, subsistema e mensagem; sem conteudo de conversa)"
ls -la /tmp/openclaw/ 2>/dev/null | grep -i "$P" | tail -4
ls -la ~/Library/Logs/openclaw/ 2>/dev/null | grep -i "$P"
L=$(ls -t /tmp/openclaw/openclaw-"$P"-*.log 2>/dev/null | head -1)
[ -z "$L" ] && L=$(ls -t ~/Library/Logs/openclaw/gateway-"$P".log 2>/dev/null | head -1)
if [ -n "$L" ]; then
  echo "-- $L  ($(wc -l < "$L" | tr -d ' ') linhas, mod $(stat -f '%Sm' -t '%d/%m %H:%M' "$L")) --"
  tail -n 400 "$L" | /usr/bin/python3 -I - <<'PY'
import sys, json, re
tel = re.compile(r'\+?55\d{10,11}')
OCULTAR = {'content','body','text','caption','message','transcript','raw','payload','token','key','secret'}
def limpa(s): return tel.sub('[telefone]', str(s))[:220]
rel = re.compile(r'error|warn|loggedout|disconnect|reconnect|not linked|qr|eaddrinuse|nexus|plugin|listen|whatsapp|guard|recusad|bloquead', re.I)
n = 0
for ln in sys.stdin:
    ln = ln.strip()
    if not ln: continue
    try:
        d = json.loads(ln)
    except Exception:
        if rel.search(ln): print('  ' + limpa(ln)); n += 1
        continue
    meta = d.get('_meta', {}) or {}
    lvl = meta.get('logLevelName', '?'); dt = (meta.get('date') or '')[:19]
    nome = str(meta.get('name', ''))[:60]
    partes = []
    for k in ('0','1','2','3'):
        v = d.get(k)
        if v is None: continue
        if isinstance(v, dict):
            v = {kk: vv for kk, vv in v.items() if kk.lower() not in OCULTAR and not isinstance(vv, (dict, list))}
            v = json.dumps(v, ensure_ascii=False)
        partes.append(limpa(v))
    resumo = ' | '.join(partes)
    if lvl in ('ERROR','WARN','FATAL') or rel.search(resumo) or rel.search(nome):
        print(f'  {dt} {lvl:5} {nome} :: {resumo[:260]}'); n += 1
print(f'  ({n} linhas relevantes nas ultimas 400)')
PY
else
  echo "nenhum log do perfil $P encontrado em /tmp/openclaw nem em ~/Library/Logs/openclaw"
fi
H="$S/logs/whatsapp-health.log"; [ -f "$H" ] && { echo "-- whatsapp-health.log (ultimas 5) --"; tail -5 "$H" | semseg; }

line "Perfil PESSOAL (.openclaw, 18789): so para conferir que nao conflita"
openclaw gateway status 2>&1 | semseg | head -8
printf 'pessoal channels.whatsapp.enabled = '; openclaw config get channels.whatsapp.enabled 2>&1 | head -1

line "FIM"
