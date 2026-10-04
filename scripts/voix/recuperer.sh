#!/usr/bin/env bash
# Récupère les sons fabriqués sur GitHub (workflow « Voix naturelle », étiquette voix-generees),
# les ajoute à app/voix/ et met à jour app/voix/manifest.json.
# Usage : bash scripts/voix/recuperer.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
git fetch -q -f origin refs/tags/voix-generees:refs/tags/voix-generees
tmp=$(mktemp -d)
git archive voix-generees | tar -x -C "$tmp"
mkdir -p app/voix
for lang in fr en; do
  if [ -d "$tmp/$lang" ]; then
    mkdir -p "app/voix/$lang"
    cp -n "$tmp/$lang"/*.mp3 "app/voix/$lang/" 2>/dev/null || true
  fi
done
node -e "
const fs = require('fs');
const all = fs.readdirSync('$tmp').filter((f) => f.startsWith('echecs-')).flatMap((f) => JSON.parse(fs.readFileSync('$tmp/' + f, 'utf8')));
console.log(all.length + ' échecs' + (all.length ? ' : ' + all.slice(0, 20).map((e) => e.text + ' (' + e.erreur + ')').join(' ; ') : ''));
"
rm -r "$tmp"
node scripts/voix/manifeste.mjs
