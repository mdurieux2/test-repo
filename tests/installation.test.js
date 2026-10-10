import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etapesInstallation, navigateur, pourquoiInstaller } from '../app/js/installation.js';

// agents utilisateurs réels (2025-2026) ; Brave se présente comme Chrome, d'où `brave: true`
const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  ipadSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1',
  iphoneFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/141.0 Mobile/15E148 Safari/605.1.15',
  iphoneEdge: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/138.3351.83 Mobile/15E148 Safari/605.1.15',
  iphoneFacebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 [FBAN/FBIOS;FBAV/520.0.0.38.101;FBBV/752184213;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.5;FBSS/3;FBCR/;FBID/phone;FBLC/fr_FR;FBOP/80]',
  androidChrome: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  androidSamsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:141.0) Gecko/141.0 Firefox/141.0',
  androidEdge: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36 EdgA/138.0.0.0',
  androidWebView: 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36',
  androidXiaomi: 'Mozilla/5.0 (Linux; U; Android 13; fr-fr; 2201117TY Build/TKQ1.221114.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.4.0-g',
  tabletteAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0',
  tesla: 'Mozilla/5.0 (X11; GNU/Linux) AppleWebKit/537.36 (KHTML, like Gecko) Chromium/79.0.3945.130 Chrome/79.0.3945.130 Safari/537.36 Tesla/2024.20.9',
};

test('installer l’icône : l’appareil et le navigateur sont reconnus', () => {
  const cas = [
    [{ ua: UA.iphoneSafari }, 'ios', 'safari'],
    [{ ua: UA.ipadSafari, touch: 5 }, 'ios', 'safari'], // l'iPad se présente comme un Mac
    [{ ua: UA.ipadSafari, touch: 0 }, 'ordinateur', 'safari'],
    [{ ua: UA.iphoneChrome }, 'ios', 'chrome'],
    [{ ua: UA.iphoneFirefox }, 'ios', 'firefox'],
    [{ ua: UA.iphoneEdge }, 'ios', 'edge'],
    [{ ua: UA.iphoneFacebook }, 'ios', 'integre'],
    [{ ua: UA.androidChrome }, 'android', 'chrome'],
    [{ ua: UA.androidChrome, brave: true }, 'android', 'brave'],
    [{ ua: UA.androidSamsung }, 'android', 'samsung'],
    [{ ua: UA.androidFirefox }, 'android', 'firefox'],
    [{ ua: UA.androidEdge }, 'android', 'edge'],
    [{ ua: UA.androidWebView }, 'android', 'integre'],
    [{ ua: UA.androidXiaomi }, 'android', 'autre'],
    [{ ua: UA.tabletteAndroid }, 'android', 'chrome'],
    [{ ua: UA.macChrome }, 'ordinateur', 'chrome'],
    [{ ua: UA.macChrome, brave: true }, 'ordinateur', 'brave'],
    [{ ua: UA.macSafari }, 'ordinateur', 'safari'],
    [{ ua: UA.winEdge }, 'ordinateur', 'edge'],
    [{ ua: UA.winFirefox }, 'ordinateur', 'firefox'],
    [{ ua: UA.tesla }, 'ordinateur', 'voiture'],
  ];
  for (const [entree, os, nom] of cas) assert.deepEqual(navigateur(entree), { os, nom }, entree.ua);
});

test('installer l’icône : chaque navigateur a ses étapes (Brave, Samsung Internet, iOS 26…)', () => {
  const etapes = (entree) => etapesInstallation(navigateur(entree)).join(' ');
  assert.match(etapes({ ua: UA.macChrome, brave: true }), /«\sEnregistrer et partager\s»/);
  assert.match(etapes({ ua: UA.androidChrome, brave: true }), /«\sInstaller l’application\s»/);
  assert.match(etapes({ ua: UA.androidSamsung }), /«\sAjouter page à\s»/);
  assert.match(etapes({ ua: UA.iphoneSafari }), /«\s•••\s»/);
  assert.match(etapes({ ua: UA.iphoneSafari }), /«\sSur l’écran d’accueil\s»/);
  assert.match(etapes({ ua: UA.iphoneChrome }), /«\sSur l’écran d’accueil\s»/);
  assert.match(etapes({ ua: UA.macSafari }), /«\sAjouter au Dock…\s»/);
  assert.match(etapes({ ua: UA.androidWebView }), /«\sOuvrir dans le navigateur\s»/);
  assert.match(etapes({ ua: UA.iphoneFacebook }), /«\sOuvrir dans Safari\s»/);
  // une consigne courte, une phrase par étape, pour tous les appareils et tous les navigateurs
  for (const os of ['ios', 'android', 'ordinateur']) {
    for (const nom of ['safari', 'chrome', 'edge', 'firefox', 'brave', 'samsung', 'opera', 'voiture', 'integre', 'autre']) {
      const liste = etapesInstallation({ os, nom });
      assert.ok(liste.length >= 1 && liste.length <= 3, `${os} ${nom}`);
      for (const etape of liste) assert.ok(etape.length <= 140 && /[.)]$/.test(etape), `${os} ${nom} : ${etape}`);
    }
  }
});

test('installer l’icône : ce qu’elle change pour les prénoms et les progrès', () => {
  const ios = pourquoiInstaller(navigateur({ ua: UA.iphoneSafari }));
  assert.match(ios, /7 jours/); // vérifié aussi par le test de bout en bout
  assert.match(ios, /propres données/); // l'icône ne voit pas les profils créés dans Safari
  assert.match(pourquoiInstaller(navigateur({ ua: UA.androidChrome })), /d’une version de l’app à l’autre/);
  assert.match(pourquoiInstaller(navigateur({ ua: UA.androidWebView })), /autre app/);
});
