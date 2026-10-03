// Informations affichées dans Réglages → À propos.
// La version doit être la même que dans package.json, et la première entrée du
// journal des modifications doit la décrire (vérifié par les tests).

export const APP = {
  name: 'Lire & Compter',
  version: '1.1.0',
  author: 'Michaël Durieux',
};

/** Journal des modifications, de la plus récente à la plus ancienne. */
export const CHANGELOG = [
  {
    version: '1.1.0',
    date: '2026-10-03',
    changes: [
      'Menu Réglages : photo de chaque enfant (photothèque ou appareil photo), enregistrée automatiquement.',
      'Voix plus naturelles : choix automatique des voix « Premium » ou « améliorées », voix réglable pour Eva-Rose et Matteo.',
      'Fonctionne sur tous les iPad, en portrait comme en paysage.',
      'Version, journal des modifications et crédits dans les Réglages.',
      'Correction : le mot « null » ne s’affiche plus après une bonne réponse.',
      'Accueil plus simple, sans les deux portraits.',
      'Pendant le jeu, seul l’enfant qui joue apparaît, avec sa photo ou son dessin et sa voix.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-03',
    changes: [
      'Profils Eva-Rose et Matteo, programme de la moyenne section au CE1.',
      '24 jeux de français, maths et anglais, dont 4 séries de dénombrement.',
      'Calcul en 36 paliers : pavé numérique, « Relie » et « Complète ».',
      'Espace parents : suivi de la semaine, compétences, erreurs fréquentes.',
      'Fonctionne sans Internet une fois installée.',
    ],
  },
];
