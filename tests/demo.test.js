// Démonstration au premier lancement (app/js/demo.js) : quels jeux ont une main qui montre le geste,
// quelles étapes elle montre (des touchers seulement avec « toucher plutôt que glisser »), et la
// mémorisation par enfant (storage.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_INTERACTIONS, demoLabel, demoPlan, gameHasDemo, hasDemo, roundCellPoint, samplePath } from '../app/js/demo.js';
import { GAMES, findGame } from '../app/js/games/index.js';
import { createRng } from '../app/js/random.js';
import { addChild, defaultStore, demoSeen, loadStore, markDemoSeen, resetChild, saveStore } from '../app/js/storage.js';
import { DRAG_WORDS } from '../app/js/a11y-jeux.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), data };
}

/** Des questions de chaque niveau du jeu (tirage fixe). */
function questions(game, perLevel = 8) {
  const rng = createRng(4242);
  const out = [];
  for (let level = 1; level <= game.levels.length; level++) {
    for (let i = 0; i < perLevel; i++) out.push({ level, q: game.generate(level, rng, i, { name: 'Lou', season: 'printemps' }) });
  }
  return out;
}

// ---------------------------------------------------------------- Quels jeux

// les jeux dont le geste n'est pas évident (glisser, tracer, entourer, relier, placer, partager,
// toucher dans l'ordre, labyrinthes, puzzle, écrire au doigt, coloriage, points, carte, corps…)
const WITH_DEMO = [
  'ecrire', 'patates', 'relier', 'relie-calculs', 'trous', 'calcul', 'droite-numerique', 'fractions', 'partage', 'panier',
  'puzzle', 'coloriage-magique', 'points', 'sudoku', 'picross', 'symetrie', 'reproduire', 'labyrinthe', 'labyrinthe-rond',
  'chemin-nombres', 'chemin-lettres', 'regle-horloge', 'monnaie', 'carte-monde', 'corps', 'ranger', 'dictee',
  'relie-anglais', 'epelle-anglais', 'colorie-anglais',
];
// des choix multiples simples (toucher une réponse), le pavé numérique, le memory : pas de démonstration
const WITHOUT_DEMO = ['rimes', 'compter', 'premier-son', 'tables', 'tables-chrono', 'heure', 'drapeaux', 'ecoute', 'memory', 'memory-anglais', 'formes'];

test('démonstration : les jeux au geste pas évident en ont une, les choix multiples simples non', () => {
  for (const id of WITH_DEMO) assert.ok(gameHasDemo(findGame(id), { rng: createRng(7) }), `${id} : une démonstration`);
  for (const id of WITHOUT_DEMO) assert.equal(gameHasDemo(findGame(id), { rng: createRng(7) }), false, `${id} : pas de démonstration`);
  for (const interaction of [undefined, 'keypad', 'memory', 'column']) assert.equal(hasDemo({ interaction }), false, String(interaction));
  assert.equal(hasDemo(null), false);
  assert.deepEqual(demoPlan({ interaction: undefined, choices: [] }), []);
});

test('démonstration : chaque forme d’exercice à glisser, tracer ou toucher dans l’ordre a son geste', () => {
  for (const interaction of ['trace', 'lasso', 'match', 'fill', 'numberline', 'share', 'order', 'maze', 'roundmaze', 'path',
    'swap', 'colorby', 'dots', 'map', 'body', 'setclock', 'shade', 'symmetry', 'picross', 'sudoku', 'build', 'pay']) {
    assert.ok(DEMO_INTERACTIONS.includes(interaction), interaction);
  }
  // toutes les formes d'exercice des jeux, sauf les choix et le pavé, ont été pensées : celles sans
  // démonstration sont choisies (touchers évidents)
  const all = new Set(GAMES.flatMap((g) => questions(g, 3).map(({ q }) => q.interaction)).filter(Boolean));
  const without = [...all].filter((i) => !DEMO_INTERACTIONS.includes(i)).sort();
  assert.deepEqual(without, ['column', 'fluence', 'keypad', 'memory']); // fluence : un adulte explique et accompagne
});

// ---------------------------------------------------------------- Les étapes

/** Une cible valide : un élément (sélecteur) ou un point d'un dessin. */
function checkTarget(t, where) {
  assert.ok(t && typeof t === 'object', `${where} : cible`);
  if (t.svg) {
    assert.equal(typeof t.svg, 'string', where);
    assert.ok(Number.isFinite(t.x) && Number.isFinite(t.y), `${where} : point du dessin ${t.x}, ${t.y}`);
    return;
  }
  assert.equal(typeof t.el, 'string', `${where} : sélecteur`);
  for (const k of ['fx', 'fy']) if (k in t) assert.ok(t[k] >= 0 && t[k] <= 1, `${where} : ${k} = ${t[k]}`);
  for (const v of Object.values(t.data || {})) assert.ok(v !== undefined && v !== null && !Number.isNaN(v), `${where} : data ${JSON.stringify(t.data)}`);
}

test('démonstration : sur de vraies questions de chaque jeu, des étapes valides ; avec « toucher plutôt que glisser », aucun glissé', () => {
  let plans = 0;
  for (const game of GAMES) {
    for (const { level, q } of questions(game, 4)) {
      if (!hasDemo(q)) continue;
      for (const tapOnly of [false, true]) {
        const where = `${game.id} niveau ${level}${tapOnly ? ' (touchers)' : ''}`;
        const plan = demoPlan(q, { tapOnly });
        assert.ok(plan.length >= 1 && plan.length <= 4, `${where} : ${plan.length} étapes`);
        for (const step of plan) {
          assert.ok(['tap', 'drag', 'look', 'hover'].includes(step.kind), `${where} : ${step.kind}`);
          if (step.kind === 'drag' || step.kind === 'hover') {
            assert.ok(step.path.length >= 2, `${where} : un glissé a au moins deux points`);
            step.path.forEach((t) => checkTarget(t, where));
          } else checkTarget(step.at, where);
        }
        if (tapOnly) assert.ok(plan.every((s) => s.kind === 'tap' || s.kind === 'look'), `${where} : un glissé montré malgré « toucher plutôt que glisser »`);
        else assert.ok(plan.some((s) => s.kind !== 'look'), `${where} : la main touche, glisse ou cherche au moins une fois`);
        const label = demoLabel(q, { tapOnly });
        assert.ok(label.length > 10 && /[.»]$/.test(label), `${where} : phrase « ${label} »`);
        if (tapOnly) assert.ok(!DRAG_WORDS.test(label), `${where} : « ${label} » parle de glisser`);
        plans++;
      }
    }
  }
  assert.ok(plans > 200, `${plans} démonstrations vérifiées`);
});

test('démonstration : les gestes à glisser sont montrés en glissant (sans réglage)', () => {
  const first = (id, interaction) => questions(findGame(id), 4).map(({ q }) => q).find((q) => q.interaction === interaction);
  for (const [id, interaction] of [['ecrire', 'trace'], ['patates', 'lasso'], ['relier', 'match'], ['trous', 'fill'], ['labyrinthe', 'maze'],
    ['labyrinthe-rond', 'roundmaze'], ['points', 'dots'], ['regle-horloge', 'setclock'], ['droite-numerique', 'numberline']]) {
    const q = first(id, interaction);
    assert.ok(q, `${id} : une question ${interaction}`);
    assert.equal(demoPlan(q)[0].kind, 'drag', `${id} : glissé`);
    assert.equal(demoPlan(q, { tapOnly: true })[0].kind, 'tap', `${id} : toucher`);
  }
  // le chemin des nombres, le puzzle, le sudoku : des touchers dans les deux cas
  for (const [id, interaction] of [['chemin-nombres', 'path'], ['puzzle', 'swap']]) {
    assert.ok(demoPlan(first(id, interaction)).every((s) => s.kind === 'tap'), id);
  }
});

test('démonstration : la main ne montre pas la réponse (droite, horloge, carte, corps, étiquettes à ranger)', () => {
  // sans toucher : ni la carte, ni le dessin du corps, ni une étiquette (la 1re lettre d'une dictée)
  for (const id of ['carte-monde', 'corps', 'dictee', 'ranger', 'epelle-anglais', 'phrase-anglais']) {
    for (const { q } of questions(findGame(id), 3)) {
      if (!['map', 'body', 'order'].includes(q.interaction)) continue;
      for (const tapOnly of [false, true]) assert.ok(demoPlan(q, { tapOnly }).every((s) => s.kind === 'look' || s.kind === 'hover'), `${id} : sans toucher`);
    }
  }
  for (const { q } of questions(findGame('droite-numerique'), 6)) {
    if (q.interaction !== 'numberline') continue;
    for (const tapOnly of [false, true]) {
      const plan = demoPlan(q, { tapOnly });
      const placed = plan[0].kind === 'drag' ? plan[0].path.at(-1) : plan[0].at;
      const value = q.stage.min + ((placed.x - 24) / (316 - 24)) * (q.stage.max - q.stage.min);
      assert.ok(Math.abs(value - q.target) > (q.tolerance || 0) - 1e-6, `droite : la flèche montrée (${value}) n’est pas la réponse (${q.target})`);
    }
  }
  for (const { q } of questions(findGame('regle-horloge'), 3)) {
    if (q.interaction !== 'setclock') continue;
    const plan = demoPlan(q);
    assert.equal(plan.at(-1).at.el, '.setclock-zone .validate-btn', 'puis on valide');
  }
});

test('démonstration : le labyrinthe rond, les cases au bon endroit du dessin', () => {
  const sectors = [1, 6, 12];
  assert.deepEqual(roundCellPoint(sectors, 0), { fx: 0.5, fy: 0.5 }, 'la case du centre');
  const { fx, fy } = roundCellPoint(sectors, 1); // anneau 1, première case : en haut, un peu à droite
  assert.ok(fx > 0.5 && fy < 0.5);
  for (let c = 0; c < 19; c++) {
    const p = roundCellPoint(sectors, c);
    assert.ok(p.fx > 0 && p.fx < 1 && p.fy > 0 && p.fy < 1, `case ${c}`);
  }
});

test('démonstration : quelques points d’un trait, le premier et le dernier compris', () => {
  const line = Array.from({ length: 51 }, (_, i) => [i * 2, 0]);
  const pts = samplePath(line, 10);
  assert.deepEqual(pts[0], [0, 0]);
  assert.deepEqual(pts.at(-1), [100, 0]);
  assert.ok(pts.length >= 10 && pts.length <= 14);
  assert.equal(samplePath(line, 1, 5).length, 5);
  assert.deepEqual(samplePath([]), []);
});

// ---------------------------------------------------------------- Une fois par jeu et par enfant

test('démonstration : vue une fois par jeu et par enfant, retenue sur l’appareil, remise par « effacer la progression »', () => {
  const store = defaultStore();
  const lea = addChild(store, { name: 'Léa', grade: 'CP' });
  const tom = addChild(store, { name: 'Tom', grade: 'MS' });
  assert.equal(demoSeen(store.profiles[lea], 'patates'), false, 'pas encore vue');
  markDemoSeen(store.profiles[lea], 'patates');
  markDemoSeen(store.profiles[lea], 'patates'); // une seule fois dans la liste
  assert.equal(demoSeen(store.profiles[lea], 'patates'), true);
  assert.equal(demoSeen(store.profiles[lea], 'labyrinthe'), false, 'un autre jeu : pas encore vue');
  assert.equal(demoSeen(store.profiles[tom], 'patates'), false, 'un autre enfant : pas encore vue');
  assert.deepEqual(store.profiles[lea].demos, ['patates']);

  const storage = memoryStorage();
  saveStore(store, storage);
  const loaded = loadStore(storage);
  assert.equal(demoSeen(loaded.profiles[lea], 'patates'), true, 'retenue après rechargement');
  assert.equal(demoSeen(loaded.profiles[tom], 'patates'), false);
  assert.deepEqual(loaded.profiles[tom].demos, []);

  resetChild(loaded, lea);
  assert.equal(demoSeen(loaded.profiles[lea], 'patates'), false, 'effacer la progression remontre la main');
  assert.equal(demoSeen(undefined, 'patates'), false);
  markDemoSeen(undefined, 'patates'); // sans enfant : rien (pas d'erreur)
});

test('démonstration : une liste abîmée sur l’appareil est nettoyée', () => {
  const storage = memoryStorage();
  storage.setItem('lire-et-compter:v2', JSON.stringify({
    active: 'lou', order: ['lou'], profiles: { lou: { name: 'Lou', demos: ['patates', 3, null, 'patates', 'points'] } },
  }));
  assert.deepEqual(loadStore(storage).profiles.lou.demos, ['patates', 'points']);
  storage.setItem('lire-et-compter:v2', JSON.stringify({ active: 'lou', order: ['lou'], profiles: { lou: { name: 'Lou', demos: 'patates' } } }));
  assert.deepEqual(loadStore(storage).profiles.lou.demos, []);
});
