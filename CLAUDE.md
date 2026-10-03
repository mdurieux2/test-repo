# Lire & Compter

Web app iPhone (PWA) de jeux éducatifs pour deux enfants : Eva-Rose (CP/CE1) et Matteo (MS/GS).
Interface et commentaires en français.

- Pas de build : `app/` est servi tel quel (modules ES). Pas de dépendance à l'exécution.
- Un jeu = un objet `{ id, domain, section, title, icon, skill, levels, generate(level, rng, index) }`.
  `generate` renvoie des données pures (pas de DOM) ; `interaction` vaut `undefined` (choix multiple),
  `keypad`, `match`, `fill` ou `build`. Le rendu est dans `render.js` et `main.js`.
- Programme par classe dans `programs.js` : `[idDuJeu, niveauMin, niveauMax]`.
- Tout nouveau fichier dans `app/` doit être ajouté à `PRECACHE` dans `app/sw.js` (un test le vérifie)
  et `VERSION` doit être incrémentée à chaque mise en production.
- Vérifier avant de pousser : `npm test` puis `npm run test:e2e` (mise en page sur 10 tailles d'iPhone).
- Couleurs : texte blanc seulement sur des fonds à contraste ≥ 3:1 (gros textes) ; jamais d'information
  portée par la couleur seule.
