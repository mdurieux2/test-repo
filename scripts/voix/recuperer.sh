#!/usr/bin/env bash
# Récupère les sons fabriqués sur GitHub pour la branche courante (workflow « Voix naturelle »,
# étiquette voix-sons/<branche>), les ajoute à app/voix/ et met à jour app/voix/manifest.json.
# Usage : bash scripts/voix/recuperer.sh [branche]
set -euo pipefail
cd "$(dirname "$0")/../.."
tag="voix-sons/${1:-$(git rev-parse --abbrev-ref HEAD)}"
git fetch -q -f origin "refs/tags/$tag:refs/tags/$tag"
tmp=$(mktemp -d)
git archive "$tag" | tar -x -C "$tmp"
mkdir -p app/voix
for lang in fr en; do
  if [ -d "$tmp/$lang" ]; then
    mkdir -p "app/voix/$lang"
    cp -n "$tmp/$lang"/*.mp3 "app/voix/$lang/" 2>/dev/null || true
  fi
done
node -e "
const fs = require('fs');
const read = (prefix) => fs.readdirSync('$tmp').filter((f) => f.startsWith(prefix)).flatMap((f) => JSON.parse(fs.readFileSync('$tmp/' + f, 'utf8')));
const all = read('echecs-');
console.log(all.length + ' échecs' + (all.length ? ' : ' + all.slice(0, 20).map((e) => e.text + ' (' + e.erreur + ')').join(' ; ') : ''));
// bilan du contrôle : hauteur de la voix, diction (reconnaissance vocale), essais
const report = read('rapport-');
if (report.length) {
  const pitches = report.map((r) => r.hauteur).filter(Boolean).sort((a, b) => a - b);
  const median = pitches[Math.floor(pitches.length / 2)];
  const near = pitches.filter((p) => Math.abs(Math.log(p / median)) <= 0.15).length;
  const checked = report.filter((r) => r.ressemblance !== undefined);
  const clear = checked.filter((r) => r.ressemblance >= 0.9).length;
  console.log(report.length + ' sons contrôlés : hauteur médiane ' + median + ' Hz, ' + Math.round((near / pitches.length) * 100) + ' % à moins de 15 % ; diction vérifiée sur ' + checked.length + ' sons, ' + Math.round((clear / Math.max(1, checked.length)) * 100) + ' % reconnus à 90 % ou plus');
  const doubtful = checked.filter((r) => r.ressemblance < 0.75).sort((a, b) => a.ressemblance - b.ressemblance);
  for (const r of doubtful.slice(0, 15)) console.log('  diction douteuse (' + r.ressemblance + ') : ' + r.essai + ' → « ' + r.entendu + ' »');
}
"
rm -r "$tmp"
node scripts/voix/manifeste.mjs
