import { app, BrowserWindow, session } from 'electron';
import { join } from 'path';
import { ElectronBlocker } from '@ghostery/adblocker-electron';
import fetch from 'cross-fetch';

// feed which only shows posts and reels of people you follow
const START_URL = 'https://www.instagram.com/?variant=following';

const REELS_URL = 'https://www.instagram.com/reels/';

const BLOCKED_URLS = [
  'https://www.instagram.com/', // main page: following feed mixed with reels
  'https://www.instagram.com/?variant=home', // also main page
  REELS_URL // reels page: part of the sidebar
];

function isInvalidUrl(url) {
  if (BLOCKED_URLS.includes(url) || url.startsWith(REELS_URL)) {
    return true;
  }

  return !/^https:\/\/(www\.)?instagram\.com\//.test(url);
}

let splash;
let mainWin;

app.enableSandbox();
app.whenReady().then(async () => {
  // show splashscreen
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    center: true,
    resizable: false,
    skipTaskbar: true,
  });
  splash.loadFile(join(app.getAppPath(), 'splash.html'));

  // inizialize blocking of ads and trackers
  const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
  blocker.enableBlockingInSession(session.defaultSession);

  // deny all permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  })

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return false;
  });

  createWindow();
});

function createWindow() {
  mainWin = new BrowserWindow({
    width: 1600,
    height: 900,
    show: false, // invisible because splash screen is shown first
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: 'assets/icons/icon.png',
  });

  // spoof useragent for privacy (currently: default user agent for Brave on Linux)
  mainWin.webContents.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36');

  mainWin.loadURL(START_URL);

  // prevent opening blocked URLs or URLs outside of instagram.com
  mainWin.webContents.on('will-navigate', (event, url) => {
    if (isInvalidUrl(url)) {
      event.preventDefault();
      mainWin.loadURL(START_URL);
    }
  });

  mainWin.webContents.on('will-redirect', (event, url) => {
    if (isInvalidUrl(url)) {
      event.preventDefault();
      mainWin.loadURL(START_URL);
    }
  });

  let exploreCssKey = null;
  mainWin.webContents.on('did-navigate-in-page', async (event, url) => {
    if (isInvalidUrl(url)) {
      mainWin.loadURL(START_URL);
    }

    if (url.includes("explore") && !exploreCssKey) {
      // inject css and store key
      exploreCssKey = await mainWin.webContents.insertCSS(`
        [href*="reels"], nav {
          display: none !important;
        }
        main > div > :nth-child(2),
        main > div > :nth-child(3) {
          display: none;
        }
      `);
    } else if (exploreCssKey) {
      // remove custom css otherwise no content in direct messages and notification
      // timeout to prevent flashing of explore content when changing back
      setTimeout(async () => {
        await mainWin.webContents.removeInsertedCSS(exploreCssKey);
        exploreCssKey = null;
      }, 1000);
    }
  });

  // deny any opening windows
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' };
  });

  // for development purposes
  //mainWin.webContents.openDevTools();

  mainWin.webContents.on('did-finish-load', () => {
    // disable Reels and Explore pages from sidebar, also remove "footer" which is inside a nav element
    mainWin.webContents.insertCSS(`
       [href*="reels"], nav {
        display: none !important;
      }
    `);

    // remove the navigation at the top of the page that lets you navigate between "home" and "following"
    mainWin.webContents.executeJavaScript(`
      const tabs = document.querySelectorAll('[role=tab]');
      if (tabs.length > 1) {
        const secondParent = tabs[1].parentElement.parentElement;
        if (secondParent) {
          secondParent.style.display = 'none';
        }
      }
    `).then(() => {
      if (splash) {
        splash.close();
      }

      mainWin.show();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});