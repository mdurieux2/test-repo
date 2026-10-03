import { pick, shuffle } from '../random.js';

/**
 * Tire un élément en privilégiant le niveau courant (poids 3) tout en révisant
 * les niveaux précédents (poids 1). Les éléments de niveau supérieur sont exclus.
 */
export function pickForLevel(rng, items, level, levelOf = (item) => item.level) {
  const weighted = [];
  for (const item of items) {
    const l = levelOf(item);
    if (l > level) continue;
    const weight = l === level ? 3 : 1;
    for (let i = 0; i < weight; i++) weighted.push(item);
  }
  return pick(rng, weighted);
}

/**
 * `count` nombres distincts dont `answer`, choisis près de la bonne réponse
 * (les distracteurs les plus proches sont les plus instructifs), dans [min, max].
 */
export function numberChoices(rng, answer, count, min, max, step = 1) {
  const candidates = [];
  for (let d = 1; candidates.length < count * 3 && d <= Math.max(max - min, 1); d++) {
    for (const n of [answer - d * step, answer + d * step]) {
      if (n >= min && n <= max && n !== answer) candidates.push(n);
    }
  }
  const nearest = shuffle(rng, candidates.slice(0, Math.max(count + 1, 4))).slice(0, count - 1);
  return shuffle(rng, [answer, ...nearest]);
}

/**
 * Mots distracteurs « qui se ressemblent » : même première lettre, longueur
 * voisine ou lettres communes, pour obliger à vraiment lire le mot.
 */
export function similarWords(rng, target, pool, n) {
  const score = (w) => {
    let s = rng(); // départage aléatoire
    if (w[0] === target[0]) s += 2;
    if (Math.abs(w.length - target.length) <= 1) s += 1;
    if (w.slice(-2) === target.slice(-2)) s += 1;
    return s;
  };
  return pool
    .filter((w) => w !== target)
    .map((w) => ({ w, s: score(w) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map(({ w }) => w);
}

export function textChoices(values) {
  return values.map((v) => ({ value: v, label: v }));
}
