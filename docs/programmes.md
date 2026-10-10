# Les programmes, classe par classe

L'app ne propose à un enfant que les jeux et les niveaux de sa classe, d'après les programmes
officiels en vigueur en 2026-2027. La liste exacte (jeu, premier et dernier niveau, niveaux retirés)
est dans `app/js/programs.js` ; ce document explique d'où elle vient.

## Les principes

- **Rien de trop dur, rien de déjà su.** Un jeu n'est proposé que dans les classes où ce qu'il
  travaille est au programme, et seulement à ses niveaux de l'année (avec un peu de l'année d'avant
  pour démarrer). Les jeux de la maternelle disparaissent au CP, ceux du CP au CE2, etc.
- **Des niveaux retirés au milieu d'une fourchette** quand un niveau appartient à une autre classe
  (« de 5 en 5 minutes » pour l'heure au CE1, un niveau à lire dans un jeu d'anglais avant le CE2) :
  la progression les saute.
- **Le niveau s'adapte à l'enfant** parmi les niveaux de sa classe (il monte après une série de
  bonnes réponses, redescend après des erreurs) ; les parents peuvent aussi masquer un jeu ou une
  rubrique.

## Les textes en vigueur en 2026-2027

| Classe | Français, maths | Sciences, histoire-géographie, anglais | EMC |
|---|---|---|---|
| PS, MS, GS | Programme de 2024 (BO n° 41 du 31 octobre 2024), repris dans le programme de maternelle de 2026 | Programme de maternelle de 2026 (BO n° 19 du 7 mai 2026), écrit par âge | – |
| CP | Programme de 2024 (BO n° 41) | Nouveaux programmes : sciences (BO n° 24 du 11 juin 2026), histoire-géographie (BO n° 22 du 28 mai 2026), langues vivantes (BO n° 12 du 19 mars 2026) | Programme de 2024 (BO n° 24 du 13 juin 2024) |
| CE1, CE2 | Programme de 2024 (BO n° 41) | Programmes de 2020 (« questionner le monde », langues vivantes), jusqu'en juin 2027 | id. |
| CM1 | Programme du cycle 3 de 2025 (BO n° 16 du 17 avril 2025) | Nouveaux programmes de 2026 : sciences (BO n° 24), histoire-géographie (BO n° 22), langues vivantes (BO n° 12) | id. (« Faire société ») |
| CM2 | Programme du cycle 3 de 2025, appliqué au CM2 pour la première fois | Programmes de 2020 (sciences : version de 2023), jusqu'en juin 2027 | id. (« Vivre en République ») |

Conséquence : un enfant de CM2 en 2026-2027 a suivi l'ancien programme au CM1. Ses questions
d'histoire, de géographie, de sciences et d'anglais suivent donc l'ancien programme du cycle 3.

## Les grands repères

| Classe | Lire et écrire | Nombres et calcul |
|---|---|---|
| PS | Écouter, frapper les syllabes ; rien à lire ni à écrire | Compter jusqu'à 3 ou 4 |
| MS | Syllabes, lettres capitales, on lit de gauche à droite | Jusqu'à 6 |
| GS | Sons, rimes, toutes les lettres, premiers mots écrits | Jusqu'à 10 et un peu plus ; décomposer |
| CP | Lire des mots et de petits textes ; être et avoir au présent | Jusqu'à 100 ; l'heure pile ; les euros |
| CE1 | Textes d'une quinzaine de lignes ; présent, imparfait, futur, passé composé (être, avoir, -er) | Jusqu'à 1 000 ; tables ; premières fractions ; quarts d'heure |
| CE2 | Textes plus longs (90 à 110 mots par minute) ; verbes fréquents ; accords | Jusqu'à 10 000 ; multiplication posée ; division ; l'heure à la minute |
| CM1 | 110 mots par minute ; types de textes, implicite ; fonctions dans la phrase ; COD, COI | Jusqu'à 999 999 ; décimaux jusqu'aux centièmes ; fractions jusqu'à 20 ; aires sur quadrillage ; angles ; proportionnalité (par linéarité) |
| CM2 | 120 mots par minute ; passé simple, plus-que-parfait ; attribut, épithète, phrase complexe | Jusqu'aux centaines de millions ; millièmes ; entier × fraction ; aire du rectangle ; 90° |

Ne sont **pas** au cours moyen (ils sont en 6e) : le milliard, les pourcentages, l'arrondi au dixième,
le « retour à l'unité » et les tableaux de proportionnalité, la division par un nombre à deux chiffres,
le produit de deux décimaux, le rapporteur, les définitions du rayon et du diamètre, les volumes.

## Les jeux du cours moyen

Les classes de CM1 et de CM2 ont leurs propres jeux, chacun en dix niveaux (les premiers pour le
CM1, les derniers pour le CM2) :

- **Français** : la conjugaison du CM (présent des verbes irréguliers jusqu'au passé simple et au
  plus-que-parfait), la phrase et ses fonctions, accords et homophones, le vocabulaire (préfixes,
  suffixes, homonymes, sens d'un mot), et la lecture de textes variés (récit, documentaire, poème,
  théâtre, lettre) ;
- **Maths** : les très grands nombres, les nombres décimaux, les fractions, le calcul mental, les
  opérations posées, les problèmes, les données et le hasard, les mesures, la géométrie ;
- **Le monde** : l'histoire de France (du Moyen Âge à 1789 au CM1 ; la République, l'âge industriel,
  les guerres mondiales et l'Europe au CM2), la géographie, vivre en République (EMC) ;
- **Sciences** : mélanges, lumière et ombres, la Lune, classer le vivant, naître et grandir,
  écosystèmes, le cerveau ; le système solaire, l'énergie, volcans et séismes ;
- **Anglais** : l'alphabet, la date, l'heure, la famille, ce qu'on aime, se décrire, se situer en ville,
  les questions (who, what, where, when), le présent simple.

Les jeux des classes précédentes y gardent leurs niveaux les plus difficiles quand ils servent encore
(lire à voix haute, défi chrono des tables, symétrie, sudoku, électricité…).

## Sources

- Programmes de français et de mathématiques du cycle 3 : arrêté du 10 avril 2025, BO n° 16 du 17 avril 2025.
- Programmes de français et de mathématiques de la maternelle au CE2 : arrêté du 22 octobre 2024, BO n° 41 du 31 octobre 2024.
- Programme de l'école maternelle : BO n° 19 du 7 mai 2026.
- Sciences et technologie : arrêté du 5 juin 2026, BO n° 24 du 11 juin 2026.
- Histoire-géographie : arrêté du 22 avril 2026, BO n° 22 du 28 mai 2026.
- Langues vivantes : arrêté du 26 février 2026, BO n° 12 du 19 mars 2026.
- Enseignement moral et civique : arrêté du 29 mai 2024, BO n° 24 du 13 juin 2024.
- Éduscol : « Exemples de réussite » du CM1 et du CM2 (français, mathématiques), attendus de fin de
  CM1 et de CM2 en anglais, repères annuels de progression (BO n° 22 du 29 mai 2019, encore valables
  pour les programmes de 2020).
- Repères de lecture à voix haute : 110 mots par minute en moyenne en fin de CM1, 120 en fin de CM2
  (programme de français du cycle 3, 2025).
