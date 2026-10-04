#!/usr/bin/env bash
# Dépose les MP3 (et les rapports JSON) d'un dossier sous une étiquette git (sans toucher aux branches) :
# on les récupère ensuite avec « git fetch origin tag <étiquette> ».
# Usage (dans GitHub Actions, avec GITHUB_TOKEN) : scripts/voix/publier.sh voix-generees voix-sortie
set -euo pipefail
tag=$1
dir=$2
tmp=$(mktemp -d)
(cd "$dir" && find . \( -name '*.mp3' -o -name '*.json' \) -print0 | xargs -0 -r -I{} cp --parents {} "$tmp")
cd "$tmp"
git init -q
git add -A
git -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
  commit -q -m "Voix naturelle : ${tag} (exécution ${GITHUB_RUN_NUMBER:-locale})"
git push -q -f "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" "HEAD:refs/tags/${tag}"
echo "✔ ${tag} : $(git ls-files | wc -l) fichiers"
