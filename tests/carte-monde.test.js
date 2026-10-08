import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { DOMAINS, findGame } from '../app/js/games/index.js';
import { FLAGS } from '../app/js/games/drapeaux.js';
import { DIRECTIONS, MAP_ANIMALS, TRIPS, bearing, viewOf } from '../app/js/games/carte.js';
import {
  CONTINENTS, COUNTRIES, EUROPE_DRAWN, EUROPE_TARGETS, OCEANS, SEAS, VIEWS, WORLD_TARGETS, atIn, dotFor, inRings, mapPaths, sizeIn, toXY,
} from '../app/js/data/carte-data.js';
import { createRng } from '../app/js/random.js';

const game = findGame('carte-monde');
const RUNS = 200;
// le plus petit écran (iPhone SE, Android 360 points) : la carte fait environ 330 points de large
const PHONE = 330;
const px = (view) => PHONE / VIEWS[view].box[2];

function* questions() {
  for (let level = 1; level <= game.levels.length; level++) {
    const rng = createRng(4321 + level);
    for (let i = 0; i < RUNS; i++) yield { level, q: game.generate(level, rng, i, { name: 'Zoé' }) };
  }
}

/** Les contours d'une zone de la carte (pays, continent, océan, mer). */
const ringsOf = (id) => (COUNTRIES[id] || CONTINENTS[id] || OCEANS[id] || SEAS[id]).rings;
const inView = (view, lon, lat) => {
  const [x, y] = toXY(lon, lat);
  const [bx, by, bw, bh] = VIEWS[view].box;
  return x > bx && x < bx + bw && y > by && y < by + bh;
};
const capitalXY = (id) => toXY(COUNTRIES[id].capital[1], COUNTRIES[id].capital[2]);

test('carte du monde : rangée dans « Le monde », entre 7 et 10 niveaux aux libellés courts', () => {
  assert.ok(game, 'jeu absent de index.js');
  assert.equal(game.domain, 'monde');
  assert.ok(DOMAINS.find((d) => d.id === 'monde').games.includes(game));
  assert.ok(game.levels.length >= 7 && game.levels.length <= 10, `${game.levels.length} niveaux`);
  for (const label of game.levels) assert.ok(label.length <= 26, `libellé trop long : ${label}`);
  assert.equal(new Set(game.levels).size, game.levels.length);
});

test('carte du monde : les données sont écrites dans le dépôt et restent légères', () => {
  const size = statSync(new URL('../app/js/data/carte-data.js', import.meta.url)).size;
  assert.ok(size < 150 * 1024, `${Math.round(size / 1024)} Ko`);
  for (const view of Object.keys(VIEWS)) {
    const paths = mapPaths(view);
    for (const table of [paths.continents, paths.countries, paths.oceans, paths.seas]) {
      for (const [id, d] of Object.entries(table)) assert.match(d, /^M-?\d/, `${view} ${id} : tracé vide`);
    }
  }
});

test('carte du monde : chaque nom est écrit dans sa zone, chaque capitale dans son pays', () => {
  for (const [id, c] of Object.entries(CONTINENTS)) assert.ok(inRings(c.rings, ...c.at), `continent ${id}`);
  for (const [id, c] of Object.entries(COUNTRIES)) {
    assert.ok(inRings(c.rings, ...c.at), `pays ${id} : nom hors du pays`);
    assert.ok(inRings(c.rings, c.capital[1], c.capital[2]), `pays ${id} : ${c.capital[0]} hors du pays`);
  }
  for (const [id, o] of Object.entries(OCEANS)) {
    for (const at of [o.at, o.at2].filter(Boolean)) {
      assert.ok(inRings(o.rings, ...at), `océan ${id}`);
      assert.ok(!Object.values(CONTINENTS).some((c) => inRings(c.rings, ...at)), `le nom de ${id} est sur une terre`);
    }
  }
  for (const [id, s] of Object.entries(SEAS)) {
    assert.ok(inRings(s.rings, ...s.at) && inView('europe', ...s.at), `mer ${id}`);
    assert.ok(!Object.values(CONTINENTS).some((c) => inRings(c.rings, ...s.at)), `le nom de ${id} est sur une terre`);
  }
  // les pays qu'on peut demander sont visibles sur leur carte
  for (const id of EUROPE_DRAWN) assert.ok(inView('europe', ...atIn('europe', id)) && inRings(COUNTRIES[id].rings, ...atIn('europe', id)), `${id} hors de la carte d'Europe`);
  for (const id of WORLD_TARGETS) assert.ok(inView('monde', ...COUNTRIES[id].at), id);
});

test('carte du monde : deux pays voisins se touchent (frontière commune), et le voisinage est réciproque', () => {
  const points = (id) => new Set(COUNTRIES[id].rings.flatMap((r) => r.reduce((acc, v, i) => (i % 2 ? [...acc, `${r[i - 1]},${v}`] : acc), [])));
  for (const [id, c] of Object.entries(COUNTRIES)) {
    for (const n of c.neighbours) {
      assert.ok(COUNTRIES[n].neighbours.includes(id), `${id} → ${n} sans retour`);
      const shared = [...points(id)].filter((p) => points(n).has(p));
      assert.ok(shared.length >= 2, `${id} et ${n} ne se touchent pas`);
    }
  }
});

test('carte du monde : toutes les zones à toucher sont assez grandes pour un doigt (ou ont un point touchable)', () => {
  for (const view of Object.keys(VIEWS)) {
    const { min, dot } = VIEWS[view];
    const targets = view === 'europe' ? EUROPE_TARGETS : WORLD_TARGETS;
    const dots = targets.map((id) => [id, dotFor(view, id)]).filter(([, d]) => d);
    for (const id of targets) {
      const big = sizeIn(view, COUNTRIES[id].rings) >= min;
      assert.ok(big || dotFor(view, id), `${view} ${id}`);
      assert.ok(Math.min(min, dot * 2) * px(view) >= 20, `${view} : zone touchable de moins de 20 points`);
    }
    for (const [id, [x, y, r]] of dots) {
      const c = COUNTRIES[id];
      assert.ok(inRings(c.rings, ...(c.dot || c.at)), `${view} ${id} : point hors du pays`);
      for (const [other, [x2, y2]] of dots) if (other !== id) assert.ok(Math.hypot(x - x2, y - y2) >= 2 * r, `${view} : points ${id} et ${other} superposés`);
      // le point ne cache jamais le milieu d'un autre pays à trouver
      for (const other of targets) {
        if (other === id) continue;
        const [ox, oy] = toXY(...COUNTRIES[other].at);
        assert.ok(Math.hypot(x - ox, y - oy) > r, `${view} : le point de ${id} cache ${other}`);
      }
    }
  }
  for (const id of Object.keys(CONTINENTS)) assert.ok(sizeIn('monde', CONTINENTS[id].rings) * px('monde') >= 30, id);
  for (const id of Object.keys(OCEANS)) assert.ok(sizeIn('monde', OCEANS[id].rings) * px('monde') >= 30, id);
});

test('carte du monde : chaque réponse est une zone de la carte, touchable et unique', () => {
  const keys = new Set();
  for (const { level, q } of questions()) {
    const ctx = `niveau ${level} ${q.key}`;
    keys.add(q.key);
    assert.equal(q.interaction, 'map', ctx);
    assert.equal(q.stage.type, 'map', ctx);
    const { view, layer, zones, start } = q.stage;
    assert.ok(VIEWS[view], ctx);
    assert.ok(['continents', 'oceans', 'seas', 'countries', 'capitals'].includes(layer), ctx);
    // les choix sont exactement les zones touchables, sans doublon, et la réponse en fait partie une fois
    const values = q.choices.map((c) => c.value);
    assert.deepEqual(values, zones, ctx);
    assert.equal(new Set(values).size, values.length, ctx);
    assert.equal(values.filter((v) => v === q.answer).length, 1, ctx);
    assert.ok(q.choices.every((c) => typeof c.label === 'string' && c.label), ctx);
    assert.ok(q.clue, ctx);
    if (start) assert.ok(!zones.includes(start) && COUNTRIES[start], ctx);
    const paths = mapPaths(view);
    for (const id of zones) {
      if (layer === 'continents') assert.ok(paths.continents[id], ctx);
      if (layer === 'oceans') assert.ok(paths.oceans[id] || id === 'mediterranee', ctx);
      if (layer === 'seas') assert.ok(paths.seas[id], ctx);
      if (layer === 'countries') assert.ok((view === 'europe' ? EUROPE_DRAWN : WORLD_TARGETS).includes(id), `${id} n'est pas dessiné : ${ctx}`);
      if (layer === 'capitals') assert.ok(id.startsWith('cap-') && COUNTRIES[id.slice(4)], ctx);
    }
    // la réponse se voit et se touche sur cette carte
    if (layer === 'countries') {
      const c = COUNTRIES[q.answer];
      assert.ok(inView(view, ...atIn(view, q.answer)), ctx);
      assert.ok(sizeIn(view, c.rings) >= VIEWS[view].min || dotFor(view, q.answer), `trop petit : ${ctx}`);
    }
    if (layer === 'continents' || layer === 'oceans' || layer === 'seas') assert.ok(sizeIn(view, ringsOf(q.answer)) * px(view) >= 30, ctx);
    if (layer === 'capitals') {
      // des étoiles assez écartées pour qu'un doigt ne les confonde pas
      const r = q.stage.radius;
      assert.ok(r * 2 * px(view) >= 20, ctx);
      for (const a of zones) {
        for (const b of zones) {
          if (a === b) continue;
          const [[xa, ya], [xb, yb]] = [capitalXY(a.slice(4)), capitalXY(b.slice(4))];
          assert.ok(Math.hypot(xa - xb, ya - yb) >= 2 * r, `${a} et ${b} trop proches : ${ctx}`);
        }
      }
      assert.ok(zones.length >= 3, ctx);
    }
  }
  assert.ok(keys.size >= 60, `seulement ${keys.size} questions différentes`);
});

test('carte du monde : ce que demande chaque niveau', () => {
  const byLevel = {};
  for (const { level, q } of questions()) (byLevel[level] ||= []).push(q);
  assert.ok(byLevel[1].every((q) => q.stage.layer === 'continents' && CONTINENTS[q.answer]));
  assert.equal(new Set(byLevel[1].map((q) => q.answer)).size, 7, 'les 7 continents');
  assert.ok(byLevel[2].every((q) => q.stage.layer === 'oceans' && OCEANS[q.answer]));
  assert.equal(new Set(byLevel[2].map((q) => q.answer)).size, 5, 'les 5 océans');
  assert.ok(byLevel[3].some((q) => q.answer === 'fr' && q.stage.view === 'europe'));
  assert.ok(byLevel[3].some((q) => q.answer === 'fr' && q.stage.view === 'monde'));
  assert.ok(byLevel[3].some((q) => q.answer === 'mediterranee'));
  assert.ok(byLevel[4].every((q) => q.stage.view === 'europe' && COUNTRIES[q.answer].continent === 'europe' && q.answer !== 'fr'));
  assert.ok(byLevel[5].every((q) => q.stage.view === 'monde' && WORLD_TARGETS.includes(q.answer) && q.answer !== 'fr'));
  for (const q of byLevel[6]) {
    assert.ok(FLAGS[q.clue.flag] && q.clue.flag === q.answer, q.key);
    assert.equal(q.stage.view, viewOf(q.answer), q.key);
  }
  for (const q of byLevel[7]) {
    const animal = MAP_ANIMALS.find((a) => q.text.includes(a.name));
    assert.ok(animal && animal.continent === q.answer && q.clue.emoji === animal.emoji, q.key);
  }
  for (const q of byLevel[8]) assert.ok(q.answer.startsWith('cap-') && q.text.includes(COUNTRIES[q.answer.slice(4)].capital[0]), q.key);
  for (const q of byLevel[9]) assert.ok(q.stage.start && COUNTRIES[q.stage.start].neighbours.includes(q.answer) && q.stage.compass, q.key);
  // le grand mélange reprend les niveaux 3 à 9
  assert.ok(new Set(byLevel[10].map((q) => q.key.split(':')[1])).size >= 6);
});

test('carte du monde : les voyages vont chez un voisin, sans hésitation sur la direction', () => {
  assert.ok(TRIPS.length >= 10, `${TRIPS.length} voyages`);
  assert.ok(TRIPS.some((t) => t.view === 'europe') && TRIPS.some((t) => t.view === 'monde'));
  const gap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  for (const { from, to, view, dir } of TRIPS) {
    const c = COUNTRIES[from];
    assert.ok(c.neighbours.includes(to), `${from} → ${to}`);
    assert.ok((view === 'europe' ? EUROPE_DRAWN : WORLD_TARGETS).includes(to));
    assert.ok(DIRECTIONS.includes(dir));
    assert.ok(gap(bearing(atIn(view, from), atIn(view, to)), dir.angle) <= 25, `${from} → ${to} : direction`);
    // aucun autre voisin (même non dessiné) dans cette direction
    for (const p of [...c.neighbours.filter((n) => n !== to).map((n) => atIn(view, n)), ...(c.others || [])]) {
      assert.ok(gap(bearing(atIn(view, from), p), dir.angle) >= 55, `${from} → ${to} : voisin ambigu`);
    }
  }
  const fr = TRIPS.find((t) => t.from === 'fr' && t.to === 'es');
  assert.ok(fr && fr.dir.name === 'sud-ouest', 'l’Espagne est au sud-ouest de la France');
  assert.ok(TRIPS.find((t) => t.from === 'us' && t.to === 'ca')?.dir.name === 'nord');
});

test('carte du monde : consignes en phrases entières, en bon français, sans prénom', () => {
  for (const { level, q } of questions()) {
    const spoken = [q.text, ...[q.instruction].flat(), q.short?.text, ...[q.success.speak].flat()].filter(Boolean);
    for (const s of spoken) {
      assert.match(s, /[.!?]$/, `phrase sans ponctuation finale : « ${s} » (niveau ${level})`);
      assert.match(s, /^[A-ZÀ-ÖØ-Þ]/, `phrase sans majuscule : « ${s} »`);
      assert.doesNotMatch(s, /\b(de|à) le\b|\bde les\b|\bvers le ouest|\bau ouest|\bde l'|  |Zoé/, `« ${s} »`);
    }
    assert.ok(typeof q.instruction === 'string', 'consigne d’un seul tenant');
  }
});
