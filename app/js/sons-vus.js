// Espace parents, fiche d'un enfant : « Sons vus en classe » (textes déchiffrables, voir graphemes.js).
// Le parent coche les sons de la méthode de lecture déjà étudiés ; les jeux de lecture ne proposent
// alors que des mots et des textes que l'enfant sait déchiffrer (plus quelques mots-outils appris par
// cœur). Enregistré tout de suite sur le profil (kid.sons), conservé quand on efface la progression.

import { h } from './render.js';
import { GROUPES_SONS, MOTS_OUTILS, SONS, SON_IDS, cleanOutils, cleanSons } from './graphemes.js';

/** La carte « Sons vus en classe » d'un enfant ; `save()` enregistre les données de l'app. */
export function sonsCard(kid, save) {
  const card = h('section', { class: 'card sons-card', 'data-sons-card': '' });
  const open = { sons: false, outils: false }; // volets dépliés (gardés ouverts quand la carte se redessine)
  const set = (patch) => {
    // le bouton touché est redessiné : on lui rend le focus (clavier, VoiceOver)
    const focused = document.activeElement?.closest?.('[data-son], [data-sons-action]');
    const selector = focused && (focused.dataset.son ? `[data-son="${focused.dataset.son}"]` : `[data-sons-action="${focused.dataset.sonsAction}"]`);
    kid.sons = cleanSons({ ...cleanSons(kid.sons), ...patch });
    save();
    draw();
    if (selector) card.querySelector(selector)?.focus();
  };

  const draw = () => {
    const { vus, outils } = cleanSons(kid.sons);
    const on = new Set(vus);
    const words = outils ?? MOTS_OUTILS;
    const n = vus.length;
    const chip = (son) => {
      const checked = on.has(son.id);
      return h('button', {
        // nom lu : le son et son exemple (« ou loup ») ; l'état : aria-pressed, et le ✓ à l'écran
        type: 'button', class: checked ? 'son-chip on' : 'son-chip', 'data-son': son.id, 'aria-pressed': String(checked),
        onclick: () => set({ vus: checked ? vus.filter((id) => id !== son.id) : [...vus, son.id] }),
      },
      h('span', { class: 'son-check', 'aria-hidden': 'true' }, checked ? '✓' : ''),
      h('span', { class: 'son-label' }, son.label),
      ' ',
      h('span', { class: 'son-ex' }, son.exemple));
    };
    const sonsPanel = h('details', { class: 'sons-panel', 'data-sons-panel': 'sons', open: open.sons },
      h('summary', {}, n ? `Choisir les sons (${n} coché${n > 1 ? 's' : ''})` : 'Choisir les sons'),
      GROUPES_SONS.map(([groupe, title]) => h('div', { class: 'sons-group' },
        h('h3', {}, title),
        h('div', { class: 'sons-grid' }, SONS.filter((s) => s.groupe === groupe).map(chip)))));
    sonsPanel.addEventListener('toggle', () => { open.sons = sonsPanel.open; });

    const area = h('textarea', {
      class: 'sons-outils-input', rows: '3', id: 'sons-outils', 'aria-describedby': 'sons-outils-aide', autocapitalize: 'none', spellcheck: 'false',
    });
    area.value = words.join(', ');
    area.addEventListener('change', () => set({ outils: cleanOutils(area.value) }));
    const outilsPanel = h('details', { class: 'sons-panel', 'data-sons-panel': 'outils', open: open.outils },
      h('summary', {}, `Mots-outils appris par cœur (${words.length})`),
      h('label', { class: 'sons-outils-label', for: 'sons-outils' }, 'Mots que l’enfant reconnaît sans les déchiffrer'),
      h('p', { class: 'muted small', id: 'sons-outils-aide' }, 'Séparés par des virgules. Ils sont permis même s’ils contiennent des sons pas encore vus.'),
      area,
      outils ? h('button', {
        type: 'button', class: 'link-action', 'data-sons-action': 'outils-conseilles', onclick: () => set({ outils: null }),
      }, 'Revenir à la liste conseillée') : null);
    outilsPanel.addEventListener('toggle', () => { open.outils = outilsPanel.open; });

    card.replaceChildren(
      h('h2', {}, 'Sons vus en classe'),
      h('p', { class: 'muted small' }, `Cochez les sons de la méthode de lecture que ${kid.name} a déjà étudiés : les jeux de lecture (le bon mot, les syllabes, les phrases, les petits textes, les histoires, la dictée) ne proposeront que des mots qui se lisent avec ces sons. Rien de coché = tout est permis.`),
      h('p', { class: 'sons-status', role: 'status' }, n
        ? `${n} son${n > 1 ? 's' : ''} sur ${SONS.length} : seulement des mots déchiffrables (s’il y en a assez dans le jeu).`
        : 'Rien de coché : tous les mots sont permis.'),
      h('div', { class: 'sons-actions' },
        h('button', {
          type: 'button', class: 'pill-btn', 'data-sons-action': 'tout', onclick: () => set({ vus: [...SON_IDS] }),
        }, 'Tout le programme'),
        h('button', {
          type: 'button', class: 'pill-btn quiet', 'data-sons-action': 'rien', onclick: () => set({ vus: [] }),
        }, 'Tout décocher')),
      sonsPanel,
      outilsPanel);
  };
  draw();
  return card;
}
