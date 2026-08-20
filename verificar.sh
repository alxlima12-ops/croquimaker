#!/usr/bin/env bash
# Verificação mínima antes de commitar. Uso: ./verificar.sh
set -e
echo "→ sintaxe dos scripts"
for f in js/*.js; do node --check "$f" && echo "  ok $f"; done
echo "→ regenerando arquivo único"
python3 build.py
echo "tudo certo."
