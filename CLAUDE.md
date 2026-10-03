# Lire & Compter

Web app iPhone et iPad (PWA) de jeux éducatifs, conçue pour Eva-Rose (CP/CE1) et Matteo (MS/GS) et partageable :
chaque famille crée ses profils au premier lancement (prénom, personnage, classe, photo), stockés sur l'appareil.
Aucun prénom en dur dans les jeux : utiliser le prénom du profil (`me().name`, 4e argument de `generate`).
Interface et commentaires en français.

- Pas de build : `app/` est servi tel quel (modules ES). Pas de dépendance à l'exécution.
- Un jeu = un objet `{ id, domain, section, title, icon, skill, levels, generate(level, rng, index) }`.
  `generate` renvoie des données pures (pas de DOM) ; `interaction` vaut `undefined` (choix multiple),
  `keypad`, `match`, `fill` ou `build`. Le rendu est dans `render.js` et `main.js`.
- Programme par classe dans `programs.js` : `[idDuJeu, niveauMin, niveauMax]`.
- Tout nouveau fichier dans `app/` doit être ajouté à `PRECACHE` dans `app/sw.js` (un test le vérifie)
  et `VERSION` doit être incrémentée à chaque mise en production.
- Nouvelle version : mettre à jour `version` dans `package.json` et `APP.version` dans `app/js/config.js`,
  et ajouter une entrée en tête de `CHANGELOG` dans ce même fichier (les tests vérifient la cohérence).
- Vérifier avant de pousser : `npm test` puis `npm run test:e2e` (mise en page sur 14 iPhone (dont 3 en paysage), 12 iPad et 8 Android,
  portrait et paysage).
- Couleurs : texte blanc seulement sur des fonds à contraste ≥ 3:1 (gros textes) ; jamais d'information
  portée par la couleur seule.
