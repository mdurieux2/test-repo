# Lire & Compter, avec Eva-Rose et Matteo

Application iPhone et iPad de jeux pour apprendre **le français, les maths et l'anglais**,
de la moyenne section au CE1. Deux profils au lancement : **Eva-Rose** (CP, CE1) et **Matteo**
(moyenne et grande section). Chaque enfant a sa progression, ses étoiles et son album.

C'est une web app installable : elle s'ouvre dans Safari, s'ajoute à l'écran d'accueil et
fonctionne ensuite **sans Internet**. Pas besoin de Mac, d'Xcode ni de l'App Store.

## Installer sur l'iPhone ou l'iPad

1. Activer GitHub Pages (une seule fois) : *Settings → Pages → Source : GitHub Actions*.
2. Après fusion sur `master`, l'app est publiée sur `https://mdurieux2.github.io/test-repo/`.
3. Sur l'iPhone ou l'iPad, ouvrir cette adresse dans **Safari**, toucher **Partager**, puis
   **Sur l'écran d'accueil**.

Sur iPad, l'interface s'agrandit automatiquement, en portrait comme en paysage.

## Réglages

Le bouton ⚙️ de l'écran « Qui joue ? » ouvre les réglages, protégés par une multiplication :

- **Photos des profils** : une photo pour chaque enfant, choisie dans la photothèque ou prise
  avec l'appareil photo. Elle est enregistrée automatiquement et reste sur l'appareil.
- **Voix et sons** : consignes lues ou non, voix d'Eva-Rose et de Matteo avec un bouton
  d'essai, petits sons, nombre de questions par partie.
- **À propos** : version, journal des modifications (`app/js/config.js`) et crédits.

Pour des voix plus naturelles, téléchargez une voix « Premium » ou « améliorée » dans
*Réglages de l'iPhone → Accessibilité → Contenu énoncé → Voix → Français*. L'app choisit
toujours la plus naturelle disponible.

## Le programme

Construit à partir des programmes officiels (BO n°41 du 31/10/2024, en vigueur à la rentrée
2025, et langues vivantes, BO n°12 du 19/03/2026). Détail dans `app/js/programs.js`.

| Classe | Français | Maths | Anglais |
|---|---|---|---|
| MS | Frappe les syllabes, rimes, lettres capitales | Compter jusqu'à 10, dé, panier, comparer, faire 5, formes, suites de motifs | Écoute et touche (couleurs, nombres, animaux) |
| GS | Syllabes, rimes, lettres (nom et son), premier son | Compter jusqu'à 20, décompositions, calcul ±5 et ±10, formes, motifs | Écoute et touche (5 thèmes) |
| CP | Premier son, syllabes, lire un mot, mots-outils, un/une | Dénombrement (4 séries), dizaines, comparer, suite, **calcul en 36 paliers**, faire 10 | Écoute, lis et touche (8 thèmes) |
| CE1 | Lire des mots et des phrases, homophones (a/à, et/est…), déterminants | Nombres jusqu'à 1000, tables de 2 à 10, calcul jusqu'à 100 | Écoute, lis, trouve le mot anglais |

**Dénombrement** : *Combien ?* (pointer chaque objet, la voix compte), *Vite vu !* (dé,
boîtes de 10, dizaines en vue éclair), *Le panier* (fabriquer une collection, sachets de 10),
*Dizaines et unités*.

**Calcul** : une carte de 36 paliers (+5, −5, ±5, +10 … ±100) avec 5 étoiles de maîtrise
par palier, et trois formes d'exercice : pavé numérique, « Relie », « Complète » (□ + □ = 8).

## Pédagogie

- Toutes les consignes sont lues à voix haute (voix françaises de l'iPhone, voix anglaise
  pour l'anglais). On réécoute en touchant le personnage ou la bulle.
- Niveau adaptatif pour viser environ 80 % de réussite : 5 bonnes réponses d'affilée font
  monter d'un niveau, 3 erreurs sur 5 font redescendre, dans la fourchette de la classe.
- Pas d'échec : après une erreur, « Essaie encore » ; après deux, la bonne réponse brille.
- Récompenses : étoiles, autocollants, étoiles de palier.

## Suivi des parents

Le bouton 👪 de l'écran « Qui joue ? » ouvre le suivi. Pour chaque enfant :
- la classe ;
- l'activité de la semaine (parties, minutes, réussite, jours d'affilée, graphique) ;
- l'état de chaque compétence (pas commencé, en cours, acquis) et le niveau réglable ;
- ce qui est à retravailler et les erreurs fréquentes.

Les données restent sur l'iPhone.

## Développement

Aucune étape de compilation : HTML, CSS et JavaScript (modules ES) dans `app/`.

```bash
npm install          # Playwright, pour le test de bout en bout et les icônes
npm start            # http://localhost:8080
npm test             # tests unitaires (node --test)
npm run test:e2e     # parcours complet + mise en page sur 10 iPhone (6 → 17 Pro Max) et 12 iPad
npm run icons        # régénère les icônes
```

| Fichier | Rôle |
|---|---|
| `app/js/games/*.js` | Les jeux : chacun génère des questions décrites par des données |
| `app/js/programs.js` | Programme par classe (jeux et niveaux) |
| `app/js/main.js` | Écrans, profils et déroulement d'une partie |
| `app/js/dashboard.js` | Tableau de bord des parents |
| `app/js/characters.js` | Dessins d'Eva-Rose et de Matteo (SVG) |
| `app/js/config.js` | Version, journal des modifications, crédits |
| `app/sw.js` | Mode hors ligne : tout nouveau fichier doit être ajouté à `PRECACHE` |

Conçue par **Michaël Durieux**. Police : [Andika](https://software.sil.org/andika/)
(SIL Open Font License), conçue pour l'apprentissage de la lecture.
