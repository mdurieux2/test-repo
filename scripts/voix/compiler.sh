#!/usr/bin/env bash
# Pour chaque dossier de WAV : un MP3 par phrase, et un MP3 qui les enchaîne (1 s de silence entre deux).
# Usage : scripts/voix/compiler.sh voix-essai/pocket-fr voix-essai/pocket-en …
set -euo pipefail
for d in "$@"; do
  tmp=$(mktemp -d)
  ffmpeg -loglevel error -f lavfi -i anullsrc=r=24000:cl=mono -t 1 -c:a pcm_s16le "$tmp/silence.wav"
  : > "$tmp/liste.txt"
  for f in "$d"/*.wav; do
    name=$(basename "$f")
    ffmpeg -loglevel error -i "$f" -ar 24000 -ac 1 -c:a pcm_s16le "$tmp/$name"
    printf "file '%s'\nfile '%s'\n" "$tmp/$name" "$tmp/silence.wav" >> "$tmp/liste.txt"
    ffmpeg -loglevel error -i "$f" -c:a libmp3lame -b:a 64k "${f%.wav}.mp3"
    rm "$f"
  done
  ffmpeg -loglevel error -f concat -safe 0 -i "$tmp/liste.txt" -c:a libmp3lame -b:a 64k "$d.mp3"
  rm -r "$tmp"
  echo "✔ $d.mp3"
done
