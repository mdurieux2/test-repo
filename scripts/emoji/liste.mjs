// Les emoji de l'app : tous ceux écrits dans app/js, app/css et app/index.html. Sert à fabriquer
// la police d'emoji en couleur de secours (police.mjs) et à vérifier qu'elle est à jour (tests).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APP = new URL('../../app/', import.meta.url).pathname;

// un drapeau (deux lettres régionales) ou un emoji, avec ses variantes (teinte de peau, U+FE0F)
// et ses assemblages (U+200D : 🐻‍❄️, 🧑‍💼…)
const SEQUENCE = /\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?)*/gu;
// les signes qui sont du texte tant qu'ils ne sont pas suivis de U+FE0F (©, ★, ↔…) ne sont pas des emoji
const EMOJI = /^(?:\p{Regional_Indicator}|\p{Emoji_Presentation}|.️)/u;

function fichiers(dossier) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    return statSync(chemin).isDirectory() ? fichiers(chemin) : [chemin];
  });
}

/** Les emoji de l'app, sans doublon, triés. */
export function emojiDeLApp() {
  const sources = [...fichiers(join(APP, 'js')), ...fichiers(join(APP, 'css')), join(APP, 'index.html')];
  const trouves = new Set();
  for (const fichier of sources) {
    for (const [sequence] of readFileSync(fichier, 'utf8').matchAll(SEQUENCE)) {
      if (EMOJI.test(sequence)) trouves.add(sequence);
    }
  }
  return [...trouves].sort();
}
