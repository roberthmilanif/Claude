#!/usr/bin/env bash
# Grava a chave de API do Pierre Finance no perfil do shell,
# onde o Claude Code a lê ao iniciar (variável PIERRE_FINANCE_API_KEY).
# A chave fica somente na sua máquina — nunca neste repositório.
set -euo pipefail

read -rsp 'Cole sua chave de API do Pierre Finance (sk-...): ' key
echo

if [[ -z "$key" ]]; then
  echo 'Nenhuma chave informada; nada foi alterado.'
  exit 1
fi

case "${SHELL##*/}" in
  zsh) profile="$HOME/.zshrc" ;;
  *)   profile="$HOME/.bashrc" ;;
esac

if grep -qs 'PIERRE_FINANCE_API_KEY' "$profile"; then
  echo "PIERRE_FINANCE_API_KEY já está definida em $profile."
  echo 'Para trocar a chave, edite essa linha manualmente.'
  exit 1
fi

{
  echo ''
  echo "export PIERRE_FINANCE_API_KEY='$key'"
} >> "$profile"

echo "Chave gravada em $profile (o arquivo fica só na sua máquina)."
echo 'Abra um NOVO terminal, entre neste repositório e rode: claude mcp list'
