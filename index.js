// ================== CORE ==================
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import pino from 'pino';
import crypto from 'crypto';
import axios from 'axios';
import { fileURLToPath } from 'url';
import express from 'express';
import rateLimit from 'express-rate-limit';

// STYLES FANCY (GLOBAL)
import './system/fancyStyles.js';

// ================== CONFIG & GLOBALS ==================
import config from './config.js';
import './system/globals.js';

// ================== ASSETS & UTILS ==================
import { connectionMessage, getBotImage } from './system/botAssets.js';
import { checkUpdate } from './system/updateChecker.js';
import { loadSessionFromMega } from './system/megaSession.js';

// ================== HANDLER ==================
import handleCommand, {
  smsg,
  loadCommands,
  commands,
  handleParticipantUpdate
} from './handler.js';

// ================== BAILEYS ==================
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidDecode,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';

// ================== PATH ==================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================== CRYPTO FIX ==================
if (!globalThis.crypto?.subtle) {
  globalThis.crypto = crypto.webcrypto;
}

// ================== GLOBAL CONFIG ==================
global.owner ??= [config.OWNER_NUMBER];
global.SESSION_ID ??= config.SESSION_ID;

global.botModes ??= {
  typing: false,
  recording: false,
  autoreact: { enabled: false },
  autoread: { enabled: false }
};

// Active/désactive autostatus (par défaut OFF)
global.autoStatus ??= false;

global.botStartTime = Date.now();

// ================== SESSION ==================
const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

// ================== START/ATTACH BOT ==================
let sockGlobal = null;
let handlersAttached = false;
let booting = false;
let pairingSock = null;

async function attachHandlers(sock, saveCreds) {
  if (handlersAttached) return;

  // ================== LOAD COMMANDS (ONCE) ==================
  await loadCommands();
  console.log(chalk.cyan(`📂 Commandes chargées : ${Object.keys(commands).length}`));

  // ================== CONNECTION ==================
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log(chalk.green('✅ NOVA-XMD CONNECTÉ'));

      try {
        const ownerJid = `${config.OWNER_NUMBER}@s.whatsapp.net`;

        const caption =
`NOVA XMD CONNECTE AVEC SUCCES ✅️

LIEN CHANNEL
Suivre la chaîne ╰➤ ❝ [ＤＥＶ ＮＯＶＡ ＴＥＣＨ] ❞ sur WhatsApp :
https://whatsapp.com/channel/0029VbBrAUYAojYjf3Ndw70d
`;

        const imgUrl = 'https://files.catbox.moe/l2phu6.jpg';
        const res = await axios.get(imgUrl, { responseType: 'arraybuffer' });
        const imgBuffer = Buffer.from(res.data);

        await sock.sendMessage(ownerJid, { image: imgBuffer, caption });

        await checkUpdate(sock);
      } catch (e) {
        console.error('❌ Erreur envoi message connexion:', e);
      }
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log(chalk.red('❌ Déconnecté :'), reason);

      // Reconnexion automatique sauf si déconnexion volontaire
      if (reason !== DisconnectReason.loggedOut) {
        setTimeout(() => bootBot().catch(() => {}), 5000);
      } else {
        console.log(chalk.red('🚫 Session expirée – supprime session/creds.json'));
      }
    }
  });

  // ================== AUTO STATUS VIEW ==================
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      if (!global.autoStatus) return;
      const msg = messages?.[0];
      if (!msg?.key) return;
      if (msg.key.remoteJid !== 'status@broadcast') return;
      if (msg.key.fromMe) return;
      await sock.readMessages([msg.key]).catch(() => {});
    } catch (e) {
      console.log('autoStatus error:', e?.message || e);
    }
  });

  // ================== MESSAGES ==================
  sock.ev.on('messages.upsert', async ({ messages }) => {
    if (!messages?.length) return;
    const valid = messages.filter(m => m?.message);
    for (const msg of valid) {
      try {
        const m = smsg(sock, msg);
        if (!m.body?.trim()) continue;
        await handleCommand(sock, msg);
      } catch (err) {
        console.error('❌ Message handler error:', err);
      }
    }
  });

  // ================== GROUP EVENTS ==================
  sock.ev.on('group-participants.update', update =>
    handleParticipantUpdate(sock, update).catch(() => {})
  );

  // ================== CREDS ==================
  sock.ev.on('creds.update', saveCreds);

  handlersAttached = true;
}

async function createSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }),
    browser: Browsers.macOS('Safari'),
    printQRInTerminal: false
  });

  // ================== JID NORMALIZER ==================
  sock.decodeJid = jid => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      const d = jidDecode(jid) || {};
      return d.user && d.server ? `${d.user}@${d.server}` : jid;
    }
    return jid;
  };

  return { sock, saveCreds };
}

async function bootBot() {
  try {
    if (booting) return sockGlobal;
    booting = true;

    // 1) Essaye de récupérer creds depuis MEGA (si SESSION_ID nova~...)
    await loadSessionFromMega(credsPath);

    // 2) Si pas de creds, on attend le pairing via le site
    if (!fs.existsSync(credsPath)) {
      console.log(chalk.yellow('🔐 Aucune session trouvée. Ouvre le site et génère un code de pairing.'));
      booting = false;
      return null;
    }

    // 3) Démarre le bot normalement
    const { sock, saveCreds } = await createSocket();
    sockGlobal = sock;
    handlersAttached = false;
    await attachHandlers(sock, saveCreds);
    booting = false;
    return sock;

  } catch (err) {
    console.error('❌ ERREUR FATALE:', err);
    booting = false;
    return null;
  }
}

// ================== WEB SERVER ==================
function startWebServer() {
  const app = express();
  app.set('trust proxy', 1);

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use(limiter);
  app.use(express.json());

  // Page pairing
  app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'));
  });

  // Healthcheck (Render)
  app.get('/health', (req, res) => res.status(200).json({ ok: true }));

  // Pairing endpoint attendu par index.html
  app.get('/pair', async (req, res) => {
    try {
      const number = String(req.query.number || '').replace(/[^0-9]/g, '');
      if (!number || number.length < 8 || number.length > 15) {
        return res.status(400).json({ error: 'Numéro invalide' });
      }

      // Si déjà connecté, inutile de regénérer
      if (sockGlobal?.user) {
        return res.status(409).json({ error: 'Déjà connecté (session active).' });
      }

      // Si session existe déjà, on boot le bot
      if (fs.existsSync(credsPath)) {
        await bootBot();
        if (sockGlobal?.user) {
          return res.status(409).json({ error: 'Session déjà présente et bot démarré.' });
        }
      }

      // Crée un socket de pairing (une seule fois)
      if (!pairingSock) {
        const { sock, saveCreds } = await createSocket();
        pairingSock = sock;

        // Sauve creds dès qu'ils arrivent
        pairingSock.ev.on('creds.update', saveCreds);

        // Quand pairing terminé, on attache les handlers et le bot devient actif
        pairingSock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
          if (connection === 'open') {
            sockGlobal = pairingSock;
            handlersAttached = false;
            await attachHandlers(sockGlobal, saveCreds);
            pairingSock = null;
            console.log(chalk.green('✅ Pairing terminé -> bot actif.'));
          }
          if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
              pairingSock = null;
            }
          }
        });
      }

      // Demande le code
      const code = await pairingSock.requestPairingCode(number);
      return res.json({ code });
    } catch (e) {
      console.error('pair error:', e);
      return res.status(500).json({ error: 'Erreur pairing' });
    }
  });

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, () => {
    console.log(chalk.green(`🌐 Web server listening on :${PORT}`));
  });
}

// ================== RUN ==================
startWebServer();
bootBot().catch(() => {});

// ================== GLOBAL ERRORS ==================
process.on('unhandledRejection', err =>
  console.error('UnhandledRejection:', err)
);
process.on('uncaughtException', err =>
  console.error('UncaughtException:', err)
);