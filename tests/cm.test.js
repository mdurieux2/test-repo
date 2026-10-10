import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGame } from '../app/js/games/index.js';
import { dit, enLettres } from '../app/js/games/ce2.js';
import { ditVirgule, virgule } from '../app/js/games/cm-nombres.js';
import { ditTexte } from '../app/js/games/cm-operations.js';
import { FAUX_PATRONS, PATRONS } from '../app/js/games/cm-mesures.js';
import { PROGRAMS } from '../app/js/programs.js';
import { createRng } from '../app/js/random.js';
import { spoken } from '../scripts/voix/phrases.mjs';

const CM_MATHS = ['nombres-cm', 'decimaux', 'fractions-cm', 'calcul-cm', 'operations-cm', 'problemes-cm', 'donnees-cm', 'mesures-cm', 'geometrie-cm'];

function* draws(id, runs = 80) {
  const game = findGame(id);
  for (let level = 1; level <= game.levels.length; level++) {
    const rng = createRng(4242 + level);
    for (let i = 0; i < runs; i++) yield { level, q: game.generate(level, rng, i, { name: 'Léa' }) };
  }
}

/** « 345 678 » ou « 2,45 » : le nombre écrit (espaces fines, virgule). */
const nombre = (text) => Number(String(text).replace(/[\s  ]/g, '').replace(',', '.'));

test('CM : les grands nombres en lettres, en orthographe traditionnelle', () => {
  const cas = {
    80: 'quatre-vingts', 81: 'quatre-vingt-un', 200: 'deux cents', 1000: 'mille', 21000: 'vingt et un mille',
    80000: 'quatre-vingt mille', 200000: 'deux cent mille', 280000: 'deux cent quatre-vingt mille',
    1000000: 'un million', 2000000: 'deux millions', 80000000: 'quatre-vingts millions', 200000000: 'deux cents millions',
    201000000: 'deux cent un millions', 84700502: 'quatre-vingt-quatre millions sept cent mille cinq cent deux',
  };
  for (const [n, lettres] of Object.entries(cas)) assert.equal(enLettres(Number(n)), lettres, n);
});

test('CM : la voix dit les grands nombres et les décimaux en morceaux qu’elle connaît', () => {
  assert.equal(dit(12345678), '12 millions 345 mille 678');
  assert.equal(dit(1000001), '1 million 1');
  assert.equal(dit(4725), '4 mille 725');
  assert.equal(virgule(2050), '2,05');
  assert.equal(virgule(12000), '12');
  assert.equal(ditVirgule(2050), '2 virgule 0 5');
  assert.equal(ditVirgule(3045), '3 virgule 0 45');
  assert.equal(ditVirgule(500), '0 virgule 5');
  assert.equal(ditTexte('Un cinéma a 1 924 places à 12,50 €.'), 'Un cinéma a mille 924 places à 12 euros 50.');
  // aucune phrase dite par un jeu du CM ne contient un nombre qu'Estelle lirait mal :
  // « 1 000 » (lu « 1 » puis « 000 ») ou « 2,5 » (pas enregistré)
  for (const id of [...CM_MATHS, 'conjugaison-cm', 'grammaire-cm', 'orthographe-cm', 'vocabulaire-cm', 'lecture-cm']) {
    for (const { q } of draws(id, 30)) {
      for (const part of spoken(q)) {
        assert.doesNotMatch(part.text, /\d[\s  ]\d{3}(?!\d)/, `${id} : ${part.text}`);
        assert.doesNotMatch(part.text, /\d,\d/, `${id} : ${part.text}`);
      }
    }
  }
});

test('CM : les calculs au pavé numérique tombent juste', () => {
  const evaluer = (parts) => {
    // l'égalité, la case à remplir remplacée par la réponse : les deux côtés sont égaux
    const texte = parts.map((p) => String(p)).join(' ').replace(/[  ]/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    const [gauche, droite] = texte.split('=');
    // eslint-disable-next-line no-new-func
    return [Function(`return ${gauche}`)(), Function(`return ${droite}`)()];
  };
  for (const id of ['calcul-cm']) {
    for (const { q } of draws(id)) {
      if (q.interaction !== 'keypad') continue;
      const [a, b] = evaluer(q.stage.parts.map((p) => (p === null ? q.answer : p)));
      assert.equal(a, b, `${q.key} : ${q.stage.parts.join(' ')} → ${q.answer}`);
    }
  }
});

test('CM : décimaux, fois et divisé par 10, 100, 1 000 ; quotient et reste', () => {
  for (const { q } of draws('decimaux')) {
    if (!q.key.startsWith('decimaux:fois:')) continue;
    const [x, op, f] = q.stage.parts;
    const attendu = op === '×' ? nombre(x) * nombre(f) : nombre(x) / nombre(f);
    assert.ok(Math.abs(nombre(q.answer) - attendu) < 1e-9, q.key);
  }
  for (const { q } of draws('operations-cm')) {
    if (!q.key.startsWith('operations-cm:reste:')) continue;
    const [n, , d] = q.stage.parts.map(nombre);
    // une seule réponse est la division euclidienne : n = q × d + r, avec r plus petit que d
    const justes = q.choices.filter((c) => {
      const [quotient, reste] = c.value.split(', reste ').map(nombre);
      return quotient * d + reste === n && reste < d;
    });
    assert.deepEqual(justes.map((c) => c.value), [q.answer], q.key);
  }
});

test('CM : les fractions additionnées et les fractions d’une quantité', () => {
  for (const { q } of draws('fractions-cm')) {
    if (q.key.startsWith('fractions-cm:somme:')) {
      const [a, op, b] = q.stage.parts;
      const r = op === '+' ? a.n + b.n : a.n - b.n;
      assert.equal(q.answer, `${r}/${a.d}`, q.key);
    }
    if (q.key.startsWith('fractions-cm:quantite:')) {
      const [f, , quantite] = q.stage.parts;
      assert.equal(q.answer, (parseInt(quantite, 10) / f.d) * f.n, q.key);
    }
  }
});

test('CM : patrons du cube (on roule le cube sur le patron : six faces différentes)', () => {
  // le cube posé sur un carreau, puis roulé vers chaque carreau voisin : la face du dessous change
  const faces = (cells) => {
    const key = ([x, y]) => `${x},${y}`;
    const set = new Set(cells.map(key));
    const vu = new Map();
    const pile = [[cells[0], { bas: 'B', haut: 'H', nord: 'N', sud: 'S', est: 'E', ouest: 'O' }]];
    const rouler = {
      '1,0': (o) => ({ ...o, bas: o.est, haut: o.ouest, est: o.haut, ouest: o.bas }),
      '-1,0': (o) => ({ ...o, bas: o.ouest, haut: o.est, ouest: o.haut, est: o.bas }),
      '0,1': (o) => ({ ...o, bas: o.sud, haut: o.nord, sud: o.haut, nord: o.bas }),
      '0,-1': (o) => ({ ...o, bas: o.nord, haut: o.sud, nord: o.haut, sud: o.bas }),
    };
    while (pile.length) {
      const [c, o] = pile.pop();
      if (vu.has(key(c))) continue;
      vu.set(key(c), o.bas);
      for (const [d, roule] of Object.entries(rouler)) {
        const [dx, dy] = d.split(',').map(Number);
        const v = [c[0] + dx, c[1] + dy];
        if (set.has(key(v)) && !vu.has(key(v))) pile.push([v, roule(o)]);
      }
    }
    return new Set(vu.values()).size;
  };
  for (const p of PATRONS) assert.equal(faces(p), 6, JSON.stringify(p));
  for (const p of FAUX_PATRONS) assert.ok(faces(p) < 6, JSON.stringify(p));
});

test('CM : les fourchettes de niveaux suivent les programmes (rien de la 6e, rien du CM2 au CM1)', () => {
  const niveaux = (grade, id) => {
    const entry = Object.values(PROGRAMS[grade]).flat().find(([g]) => g === id);
    const [, min, max, skip = []] = entry;
    return Array.from({ length: max - min + 1 }, (_, i) => min + i).filter((l) => !skip.includes(l));
  };
  // CM1 : nombres jusqu'à 999 999, centièmes, fraction unitaire d'une quantité, pas de division décimale
  assert.ok(niveaux('CM1', 'nombres-cm').every((l) => l <= 6));
  assert.ok(niveaux('CM1', 'decimaux').every((l) => l <= 8));
  assert.ok(!niveaux('CM1', 'fractions-cm').some((l) => [8, 9].includes(l)));
  assert.ok(!niveaux('CM1', 'calcul-cm').includes(8));
  assert.ok(niveaux('CM1', 'operations-cm').every((l) => l <= 8));
  assert.ok(niveaux('CM1', 'mesures-cm').every((l) => l <= 7));
  assert.ok(niveaux('CM1', 'geometrie-cm').every((l) => l <= 8));
  assert.ok(niveaux('CM1', 'donnees-cm').every((l) => l <= 6));
  // CM2 : les millions, les millièmes et la division décimale y sont
  assert.ok(niveaux('CM2', 'nombres-cm').includes(7));
  assert.ok(niveaux('CM2', 'decimaux').includes(9));
  assert.ok(niveaux('CM2', 'operations-cm').includes(9));
  // aucun jeu du CM ne parle du milliard (6e)
  for (const id of CM_MATHS) {
    for (const { q } of draws(id, 20)) assert.doesNotMatch(`${q.text} ${JSON.stringify(q.choices || [])}`, /milliard/i, q.key);
  }
});

test('CM : les nombres du CM1 restent sous le million, ceux du CM2 sous le milliard', () => {
  const max = { 'nombres-cm': [6, 999999], decimaux: [8, 999999] };
  for (const [id, [dernierCm1, plafond]] of Object.entries(max)) {
    for (const { level, q } of draws(id, 40)) {
      if (level > dernierCm1) continue;
      for (const c of q.choices || []) {
        const n = nombre(c.label);
        if (Number.isFinite(n)) assert.ok(n <= plafond, `${q.key} : ${c.label}`);
      }
    }
  }
  for (const { q } of draws('nombres-cm', 40)) {
    for (const c of q.choices || []) {
      const n = nombre(c.label);
      if (Number.isFinite(n)) assert.ok(n < 1e9, `${q.key} : ${c.label}`);
    }
  }
});
