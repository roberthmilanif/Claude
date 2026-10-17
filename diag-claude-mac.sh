#!/bin/bash
# Diagnostico somente leitura do Claude Desktop / Claude Code no Mac.
# Nao imprime tokens, chaves ou conteudo de credenciais - so versoes, booleanos e nomes de chaves.
set +e
APPSUP="$HOME/Library/Application Support/Claude"
line(){ printf '\n== %s ==\n' "$1"; }

line "macOS"
sw_vers 2>/dev/null
echo "hostname: $(scutil --get ComputerName 2>/dev/null || hostname)"
echo "usuario: $USER"

line "App Claude Desktop"
if [ -d /Applications/Claude.app ]; then
  echo "instalado: sim  versao: $(defaults read /Applications/Claude.app/Contents/Info.plist CFBundleShortVersionString 2>/dev/null)"
else
  echo "instalado: NAO (procurando em ~/Applications)"; ls -d "$HOME/Applications/Claude.app" 2>/dev/null
fi
if pgrep -x Claude >/dev/null 2>&1; then echo "rodando: sim"; else echo "rodando: NAO"; fi
echo "processos 'Claude Helper': $(pgrep -f 'Claude Helper' 2>/dev/null | wc -l | tr -d ' ')"

line "Estado do app (pasta Application Support/Claude)"
if [ -d "$APPSUP" ]; then
  for f in bridge-state.json claude_desktop_config.json; do
    if [ -f "$APPSUP/$f" ]; then
      echo "$f: existe, $(stat -f '%z bytes, modificado %Sm' "$APPSUP/$f" 2>/dev/null)"
      python3 -I - "$APPSUP/$f" <<'PY' 2>/dev/null
import json,sys
try:
    d=json.load(open(sys.argv[1]))
except Exception as e:
    print("  (nao e JSON legivel)"); sys.exit()
def walk(o,p="",depth=0):
    if isinstance(o,dict):
        for k,v in o.items():
            if isinstance(v,(dict,)) and depth<2: walk(v,p+k+".",depth+1)
            elif isinstance(v,bool) or v is None: print(f"  {p}{k} = {v}")
            elif isinstance(v,(int,float)): print(f"  {p}{k} = {v}")
            elif isinstance(v,str) and k.lower() in ("hostname","devicename","device_name","platform","os","name","machinename","status","state"): print(f"  {p}{k} = {v}")
            else: print(f"  {p}{k} = <{type(v).__name__}, oculto>")
walk(d)
PY
    else
      echo "$f: ausente"
    fi
  done
  if [ -d "$APPSUP/local-agent-mode-sessions" ]; then
    echo "local-agent-mode-sessions/: existe, $(ls "$APPSUP/local-agent-mode-sessions" 2>/dev/null | wc -l | tr -d ' ') itens"
  else
    echo "local-agent-mode-sessions/: ausente"
  fi
else
  echo "pasta ausente: $APPSUP (app nunca abriu neste usuario?)"
fi

line "Claude Code CLI"
if command -v claude >/dev/null 2>&1; then
  echo "claude: $(command -v claude)  versao: $(claude --version 2>/dev/null | head -1)"
else
  echo "claude CLI: nao instalado no PATH"
fi
if [ -f "$HOME/.claude.json" ]; then
  python3 -I - "$HOME/.claude.json" <<'PY' 2>/dev/null
import json,sys
d=json.load(open(sys.argv[1]))
acc=d.get("oauthAccount") or {}
print("conta logada no CLI:", acc.get("emailAddress","(nenhuma)"))
print("organizacao:", acc.get("organizationName","(n/a)"))
PY
else
  echo "~/.claude.json ausente (CLI nunca logou)"
fi
if [ -f "$HOME/.claude/settings.json" ]; then
  python3 -I - "$HOME/.claude/settings.json" <<'PY' 2>/dev/null
import json,sys
d=json.load(open(sys.argv[1]))
for k in ("remoteControlAtStartup","disableRemoteControl"):
    print(f"settings.json {k} = {d.get(k,'(nao definido)')}")
env=d.get("env") or {}
for k in ("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC","DISABLE_GROWTHBOOK","DISABLE_TELEMETRY","DO_NOT_TRACK"):
    if k in env: print(f"ATENCAO: env {k} definido (bloqueia Remote Control)")
PY
fi
for k in CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC DISABLE_GROWTHBOOK; do
  [ -n "${!k}" ] && echo "ATENCAO: variavel de ambiente $k definida no shell (bloqueia Remote Control)"
done
echo "processos claude remote/ssh helper: $(pgrep -fl "$HOME/.claude/remote/" 2>/dev/null | wc -l | tr -d ' ')"
echo "sessoes 'claude' em execucao: $(pgrep -x claude 2>/dev/null | wc -l | tr -d ' ')"

line "Energia / repouso"
pmset -g 2>/dev/null | grep -E '^\s*(sleep|displaysleep|disksleep|womp|powernap)' 
echo "caffeinate ativo: $(pgrep -x caffeinate >/dev/null 2>&1 && echo sim || echo nao)"

line "Rede"
echo "claude.ai HTTP: $(curl -s -o /dev/null -m 8 -w '%{http_code}' https://claude.ai 2>/dev/null)"
echo "api.anthropic.com HTTP: $(curl -s -o /dev/null -m 8 -w '%{http_code}' https://api.anthropic.com 2>/dev/null)"

line "FIM - cole esta saida para o Claude"
