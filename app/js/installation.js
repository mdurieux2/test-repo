// Mettre l'icône sur l'écran d'accueil : l'appareil, le navigateur, puis les étapes qui lui
// correspondent. Chaque navigateur range l'installation ailleurs (menu ⋮ en haut ou en bas, ≡,
// « ••• », Partager…) : des consignes communes laissaient des parents sans solution (Brave,
// Samsung Internet, Safari d'iOS 26).
// Les libellés entre guillemets sont ceux des navigateurs en français (octobre 2026) ; quand ils
// changent d'une version à l'autre, la consigne décrit le geste sans citer de libellé.
//
// Les prénoms et les progrès restent sur l'appareil, dans le navigateur (localStorage), d'une
// version de l'app à l'autre. L'icône compte surtout sur iPhone et iPad : Safari efface les données
// d'un site qu'on n'a pas ouvert pendant 7 jours, pas celles d'une app de l'écran d'accueil. Mais
// cette app a ses propres données, séparées de celles de Safari (choix d'Apple) : les profils créés
// dans Safari ne la suivent pas.

/**
 * L'appareil (« ios », « android », « ordinateur ») et le navigateur (« safari », « chrome »,
 * « edge », « firefox », « brave », « samsung », « opera », « voiture », « integre » pour le
 * navigateur d'une autre app, « autre »), d'après l'agent utilisateur. `touch` : navigator.maxTouchPoints ;
 * `brave` : navigator.brave existe (Brave se présente comme Chrome).
 */
export function navigateur({ ua = '', touch = 0, brave = false } = {}) {
  // l'iPad se présente comme un Mac, mais il a un écran tactile
  const os = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1) ? 'ios'
    : /Android/.test(ua) ? 'android' : 'ordinateur';
  // lien ouvert dans Facebook, Instagram, l'app Google… (ou une « WebView » Android) : pas d'installation
  if (/FBAN|FBAV|Instagram|Snapchat|LinkedInApp|MicroMessenger|\bLine\/|GSA\/|; wv\)/.test(ua)) return { os, nom: 'integre' };
  if (os === 'ios') {
    if (/CriOS/.test(ua)) return { os, nom: 'chrome' };
    if (/FxiOS/.test(ua)) return { os, nom: 'firefox' };
    if (/EdgiOS/.test(ua)) return { os, nom: 'edge' };
    if (/OPiOS|OPT\//.test(ua)) return { os, nom: 'opera' };
    if (brave) return { os, nom: 'brave' };
    return { os, nom: /Safari\//.test(ua) ? 'safari' : 'autre' };
  }
  // l'écran de la voiture : le navigateur n'installe pas d'app
  if (/Tesla\//.test(ua)) return { os, nom: 'voiture' };
  if (/SamsungBrowser/.test(ua)) return { os, nom: 'samsung' };
  if (/Firefox\//.test(ua)) return { os, nom: 'firefox' };
  if (/Edg(A|iOS)?\//.test(ua)) return { os, nom: 'edge' };
  if (/OPR\//.test(ua)) return { os, nom: 'opera' };
  if (brave) return { os, nom: 'brave' };
  // les navigateurs des fabricants (Xiaomi, Huawei…) et les autres dérivés de Chrome rangent leur menu ailleurs
  if (/MiuiBrowser|HuaweiBrowser|HeyTapBrowser|YaBrowser|UCBrowser|Vivaldi|DuckDuckGo/.test(ua)) return { os, nom: 'autre' };
  if (/Chrome\//.test(ua)) return { os, nom: 'chrome' };
  if (os === 'ordinateur' && /Macintosh/.test(ua) && /Safari\//.test(ua)) return { os, nom: 'safari' };
  return { os, nom: 'autre' };
}

/** Le navigateur de cet appareil. */
export function ceNavigateur() {
  const nav = globalThis.navigator || {};
  return navigateur({ ua: nav.userAgent || '', touch: nav.maxTouchPoints || 0, brave: Boolean(nav.brave) });
}

// iPhone et iPad : depuis iOS 16.4, tous les navigateurs ajoutent l'icône par le menu Partager
const IOS_PARTAGER = [
  'Ouvrez le menu du navigateur (≡ ou •••), puis touchez « Partager ».',
  'Touchez « Sur l’écran d’accueil » (faites défiler la liste s’il le faut).',
  'Touchez « Ajouter ». Si cette option n’existe pas, ouvrez l’app dans Safari.',
];

const ANDROID_MENU = [
  'Ouvrez le menu du navigateur (⋮, ≡ ou •••).',
  'Touchez « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
  'Confirmez : l’icône apparaît sur l’écran d’accueil.',
];

const ETAPES = {
  ios: {
    safari: [
      'Touchez Partager (le carré avec une flèche vers le haut). Avec iOS 26, il est dans le menu « ••• », à côté de l’adresse.',
      'Faites défiler la liste, puis touchez « Sur l’écran d’accueil ».',
      'Touchez « Ajouter » (si l’option « app web » apparaît, laissez-la activée).',
    ],
    chrome: [
      'Touchez Partager (le carré avec une flèche vers le haut), à droite de l’adresse.',
      'Touchez « Sur l’écran d’accueil » (faites défiler la liste s’il le faut).',
      'Touchez « Ajouter ».',
    ],
    firefox: IOS_PARTAGER,
    edge: IOS_PARTAGER,
    brave: IOS_PARTAGER,
    opera: IOS_PARTAGER,
    autre: IOS_PARTAGER,
  },
  android: {
    chrome: [
      'Touchez le menu ⋮, en haut à droite (s’il propose « Ouvrir dans Chrome », touchez-le d’abord).',
      'Touchez « Installer l’application », ou « Ajouter à l’écran d’accueil » puis « Installer ».',
      'Confirmez : l’icône apparaît avec vos autres applications.',
    ],
    samsung: [
      'Touchez l’icône d’installation dans la barre d’adresse (une flèche vers le bas), ou le menu ≡ en bas à droite.',
      'Dans le menu, touchez « Ajouter page à », puis « Écran d’accueil ».',
      'Confirmez : l’icône apparaît sur l’écran d’accueil.',
    ],
    firefox: [
      'Touchez le menu ⋮ (en haut ou en bas de l’écran).',
      'Touchez « Installer » ou « Ajouter à l’écran d’accueil ».',
      'Confirmez : l’icône apparaît sur l’écran d’accueil.',
    ],
    brave: [
      'Touchez le menu ⋮ (en bas à droite, ou en haut).',
      'Touchez « Installer l’application » (ou, à défaut, « Ajouter à l’écran d’accueil »).',
      'Confirmez : l’icône apparaît sur l’écran d’accueil (pas dans la liste des applications).',
    ],
    edge: [
      'Touchez le menu ••• en bas de l’écran.',
      'Touchez l’option qui ajoute l’app au téléphone ou à l’écran d’accueil.',
      'Confirmez : l’icône apparaît sur l’écran d’accueil.',
    ],
    opera: ANDROID_MENU,
    autre: ANDROID_MENU,
  },
  ordinateur: {
    chrome: [
      'Cliquez sur l’icône d’installation, à droite de la barre d’adresse.',
      'Ou ouvrez le menu ⋮, puis « Caster, enregistrer et partager » → « Installer… ».',
      'Confirmez : l’app s’ouvre dans sa propre fenêtre, même sans Internet.',
    ],
    edge: [
      'Cliquez sur l’icône d’installation, à droite de la barre d’adresse.',
      'Ou ouvrez le menu •••, puis « Applications » → « Installer ce site en tant qu’application ».',
      'Confirmez : l’app s’ouvre dans sa propre fenêtre, même sans Internet.',
    ],
    brave: [
      'Cliquez sur l’icône d’installation, à droite de la barre d’adresse.',
      'Ou ouvrez le menu ≡, puis « Enregistrer et partager » → « Installer… ».',
      'Confirmez : l’app s’ouvre dans sa propre fenêtre, même sans Internet.',
    ],
    opera: [
      'Cliquez sur l’icône d’installation dans la barre d’adresse, ou cherchez « Installer » dans le menu.',
      'Confirmez : l’app s’ouvre dans sa propre fenêtre, même sans Internet.',
    ],
    safari: [
      'Dans le menu Fichier, choisissez « Ajouter au Dock… » (macOS 14 Sonoma ou plus récent).',
      'Cliquez sur « Ajouter » : l’app s’ouvre depuis le Dock, dans sa propre fenêtre.',
      'L’app du Dock a ses propres données : créez-y les profils.',
    ],
    firefox: [
      'Sur ordinateur, Firefox n’installe pas d’app : ajoutez simplement la page aux marque-pages.',
      'Les prénoms et les progrès restent enregistrés dans Firefox, sur cet ordinateur.',
    ],
    voiture: [
      'Dans la voiture, l’app ne s’installe pas : ajoutez simplement la page aux favoris du navigateur.',
    ],
    autre: [
      'Cherchez l’icône d’installation à droite de la barre d’adresse, ou « Installer » dans le menu du navigateur.',
      'Confirmez : l’app s’ouvre dans sa propre fenêtre, même sans Internet.',
    ],
  },
};

const INTEGRE = {
  ios: [
    'Ce lien s’est ouvert dans une autre app : touchez son menu (••• ou la boussole), puis « Ouvrir dans Safari ».',
    'Dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».',
  ],
  android: [
    'Ce lien s’est ouvert dans une autre app : touchez son menu ⋮, puis « Ouvrir dans le navigateur » (Chrome, Samsung Internet…).',
    'Dans le navigateur, ouvrez le menu, puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
  ],
  ordinateur: [
    'Ouvrez cette page dans votre navigateur habituel, puis cherchez « Installer » dans sa barre d’adresse ou son menu.',
  ],
};

/** Espaces insécables du français : « Installer… » et « Partager : » ne se coupent pas en fin de ligne. */
const insecables = (text) => text.replace(/« /g, '«\u00a0').replace(/ ([»:;?!])/g, '\u00a0$1');

/** Les étapes pour mettre l'icône sur l'écran d'accueil, avec ce navigateur. */
export function etapesInstallation({ os, nom } = ceNavigateur()) {
  if (nom === 'integre') return INTEGRE[os].map(insecables);
  const parOs = ETAPES[os] || ETAPES.ordinateur;
  return (parOs[nom] || ETAPES.ordinateur[nom] || parOs.autre).map(insecables);
}

/** Une phrase sur ce que l'icône change pour les prénoms et les progrès, selon l'appareil. */
export function pourquoiInstaller(nav = ceNavigateur()) {
  return insecables(pourquoi(nav));
}

function pourquoi({ os, nom }) {
  if (nom === 'integre') {
    return 'Ce lien s’est ouvert dans une autre app : les prénoms et les progrès risquent de ne pas y être gardés. Ouvrez l’app dans votre navigateur, puis mettez l’icône sur l’écran d’accueil.';
  }
  if (os === 'ios') {
    return 'Sur iPhone et iPad, le navigateur peut effacer les prénoms et les progrès d’un site qu’on n’ouvre pas pendant 7 jours. Avec l’icône, tout est protégé, et l’app s’ouvre en plein écran, même sans Internet. L’icône a ses propres données : les profils créés dans le navigateur sont à refaire dans l’app.';
  }
  return 'Les prénoms et les progrès sont gardés dans ce navigateur, d’une version de l’app à l’autre. Avec l’icône, l’app s’ouvre en plein écran, même sans Internet.';
}
