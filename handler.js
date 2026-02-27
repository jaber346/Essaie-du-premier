// ==================== handler.js ====================
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import config from './config.js';

import checkAdminOrOwner from './system/checkAdmin.js';
import { WARN_MESSAGES } from './system/warnMessages.js';

import antispam from './commands/antispam.js';
import antilink from './commands/antilink.js';

// ✅ Welcome/Goodbye per group
import { getGroupSettings } from './system/groupSettings.js';
import { sendWelcome, sendGoodbye } from './system/welcome.js';

// ✅ WALLPAPER 4K (NEXT button)
import wall4kCmd, { sendWall4K, parseBtnId } from "./commands/wall4k.js";

// ================== 🔒 Bot Mode (public / private) ==================
const BOTMODE_FILE = './data/botmode.json';

function ensureBotModeFile() {
  try {
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    if (!fs.existsSync(BOTMODE_FILE)) {
      fs.writeFileSync(BOTMODE_FILE, JSON.stringify({ mode: 'public' }, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(BOTMODE_FILE, 'utf-8'));
    global.privateMode = data?.mode === 'private';
  } catch {
    global.privateMode = false;
  }
}
ensureBotModeFile();

// ================== 🔗 AntiLink runtime check (handler) ==================
const ANTILINK_FILE = './data/antilink.json';
const ANTILINK_REGEX = /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me\/)/i;

function readJsonSafe(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

async function handleAntiLinkRuntime(sock, mRaw, m) {
  try {
    if (!m?.isGroup) return;
    if (!m?.body) return;

    const data = readJsonSafe(ANTILINK_FILE, {});
    if (!data[m.chat]) return;

    // ignore commands
    const PREFIX = global.PREFIX || config.PREFIX;
    if (m.body.trim().startsWith(PREFIX)) return;

    if (!ANTILINK_REGEX.test(m.body)) return;

    // verify sender is not admin/owner
    const senderCheck = await checkAdminOrOwner(sock, m.chat, m.sender);
    if (senderCheck.isAdminOrOwner) return;

    // attempt delete + warn
    await sock.sendMessage(m.chat, { delete: mRaw.key }).catch(() => {});
    await sock.sendMessage(
      m.chat,
      { text: '🔗 Lien interdit dans ce groupe. Message supprimé.' },
      { quoted: mRaw }
    ).catch(() => {});
  } catch (e) {
    console.error('❌ AntiLink runtime error:', e);
  }
}

// ================== 🔹 Gestion persistante des globals ==================
const SETTINGS_FILE = './data/settings.json';
let savedSettings = {};
try {
  savedSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
} catch {
  console.log('Aucune sauvegarde existante, utilisation des valeurs par défaut.');
}

// ================== 🔹 Initialisation sécurisée ==================
const commands = {};
global.groupThrottle ??= savedSettings.groupThrottle || {};
global.userThrottle ??= new Set(savedSettings.userThrottle || []);
global.disabledGroups ??= new Set(savedSettings.disabledGroups || []);
global.botModes ??= savedSettings.botModes || {
  typing: false,
  recording: false,
  autoread: { enabled: false }
};

// ================== 🔹 Sauvegarde avec debounce ==================
let saveTimeout;
function saveSettings() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const data = {
      groupThrottle: global.groupThrottle,
      userThrottle: Array.from(global.userThrottle),
      disabledGroups: Array.from(global.disabledGroups),
      botModes: global.botModes
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
  }, 2000);
}

// ================== 🔹 Wrappers groupes ==================
global.disableGroup = chatId => {
  global.disabledGroups.add(chatId);
  saveSettings();
};
global.enableGroup = chatId => {
  global.disabledGroups.delete(chatId);
  saveSettings();
};

// ================== 📂 Chargement commandes ==================
let commandsLoaded = false;
const loadCommands = async (dir = './commands') => {
  if (commandsLoaded) return;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      await loadCommands(fullPath);
      continue;
    }

    if (!file.endsWith('.js')) continue;

    const module = await import(pathToFileURL(fullPath).href);
    const cmd = module.default || module;

    if (cmd?.name) {
      // ✅ Commande principale
      const main = String(cmd.name).toLowerCase();
      commands[main] = cmd;

      // ✅ AJOUT: Enregistrer aussi les alias (.s, .stick, etc.)
      if (Array.isArray(cmd.alias)) {
        for (const a of cmd.alias) {
          if (!a) continue;
          const key = String(a).toLowerCase();
          commands[key] = cmd;
        }
      }
    }
  }

  commandsLoaded = true;
};

// ================== 🧠 smsg ==================
const smsg = (sock, m) => {
  if (!m?.message) return {};

  const msg = m.message;
  const body =
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    '';

  return {
    ...m,
    body,
    chat: (m.key?.remoteJid || ''),
    id: m.key.id,
    fromMe: m.key.fromMe,
    sender: m.key?.fromMe
      ? (sock.user?.id || '')
      : (m.key?.participant || m.key?.remoteJid || ''),
    isGroup: ((m.key?.remoteJid || '').endsWith('@g.us')),
    mentionedJid: msg.extendedTextMessage?.contextInfo?.mentionedJid || []
  };
};

// ================== SIMULATION TYPING / RECORDING ==================
const typingSessions = new Map();

async function simulateTypingRecording(sock, chatId) {
  if (!chatId) return;
  if (typingSessions.has(chatId)) return;

  const timer = setInterval(async () => {
    try {
      if (global.botModes.typing)
        await sock.sendPresenceUpdate('composing', chatId);
      if (global.botModes.recording)
        await sock.sendPresenceUpdate('recording', chatId);
    } catch {}
  }, 30000);

  typingSessions.set(chatId, timer);

  setTimeout(() => {
    clearInterval(timer);
    typingSessions.delete(chatId);
  }, 120000);
}

// ================== 👰 HANDLER COMMANDES ==================
const spamData = {};
const SPAM_LIMIT = 5;   // messages
const SPAM_TIME = 5000; // ms

async function handleCommand(sock, mRaw) {
  try {
    if (!mRaw?.message) return;

    const m = smsg(sock, mRaw);

    // ✅ WALL4K NEXT BUTTON HANDLER (ne casse rien)
    // IMPORTANT: doit être AVANT body trim + AVANT les retours "non-commandes"
    const btnId = mRaw.message?.buttonsResponseMessage?.selectedButtonId;
    if (btnId) {
      const parsed = parseBtnId(btnId);
      if (parsed) {
        const jid = m.chat || m.key?.remoteJid || m.from;
        await sendWall4K(sock, jid, mRaw, parsed);
        return;
      }
    }

    const body = m.body?.trim();
    if (!body) return;

    const PREFIX = global.PREFIX || config.PREFIX;
    let isCommand = false;
    let commandName = '';
    let args = [];

    // ================== Parsing ==================
    if (global.allPrefix) {
      const text = body.replace(/^[^a-zA-Z0-9]+/, '').trim();
      const parts = text.split(/\s+/);
      const potential = parts.shift()?.toLowerCase();

      if (commands[potential]) {
        isCommand = true;
        commandName = potential;
        args = parts;
      }
    } else if (body.startsWith(PREFIX)) {
      const parts = body.slice(PREFIX.length).trim().split(/\s+/);
      const potential = parts.shift()?.toLowerCase();

      if (commands[potential]) {
        isCommand = true;
        commandName = potential;
        args = parts;
      }
    }

    // ================== Admin / Owner ==================
    if (m.isGroup && isCommand) {
      const check = await checkAdminOrOwner(sock, m.chat, m.sender);
      m.isAdmin = check.isAdmin;
      m.isOwner = check.isOwner;
    } else {
      m.isAdmin = false;
      m.isOwner = false;
    }

    const ownerCheck = m.isOwner || m.fromMe;

    // ================== Mode privé ==================
    if (global.privateMode && !ownerCheck && isCommand) {
      return sock.sendMessage(
        m.chat,
        { text: WARN_MESSAGES.PRIVATE_MODE },
        { quoted: mRaw }
      );
    }

    // ================== Groupe désactivé ==================
    if (m.isGroup && global.disabledGroups.has(m.chat) && !ownerCheck)
      return sock.sendMessage(
        m.chat,
        { text: WARN_MESSAGES.BOT_OFF },
        { quoted: mRaw }
      );

    // ================== Messages non-commandes ==================
    if (!isCommand && m.isGroup) {
      if (global.botModes.typing || global.botModes.recording)
        simulateTypingRecording(sock, m.chat);
      return;
    }

    // ================== Throttle groupe ==================
    if (m.isGroup) {
      const now = Date.now();
      if (global.groupThrottle[m.chat] && now - global.groupThrottle[m.chat] < 1000)
        return;
      global.groupThrottle[m.chat] = now;
    }

    // ================== Exécution ==================
    const cmd = commands[commandName];
    if (cmd) {
      if (cmd.group && !m.isGroup)
        return sock.sendMessage(m.chat, { text: WARN_MESSAGES.GROUP_ONLY }, { quoted: mRaw });

      if (cmd.admin && !m.isAdmin && !m.isOwner)
        return sock.sendMessage(m.chat, { text: WARN_MESSAGES.ADMIN_ONLY(commandName) }, { quoted: mRaw });

      if (cmd.ownerOnly && !ownerCheck)
        return sock.sendMessage(m.chat, { text: WARN_MESSAGES.OWNER_ONLY(commandName) }, { quoted: mRaw });

      if (cmd.execute) await cmd.execute(sock, m, args, { isOwner: ownerCheck, isAdmin: m.isAdmin });
      else if (cmd.run) await cmd.run(sock, m, args);
    }

    // ==================== ANTI-SPAM SYSTEM — NOVA XMD ====================
    if (m.isGroup && antispam.antiSpamState[m.chat] && !m.fromMe) {
      const sender = m.sender;
      const now = Date.now();

      if (!spamData[m.chat]) spamData[m.chat] = {};
      if (!spamData[m.chat][sender]) {
        spamData[m.chat][sender] = { count: 1, first: now, msgs: [] };
      } else {
        spamData[m.chat][sender].count++;
      }

      spamData[m.chat][sender].msgs.push(m.key);

      const data = spamData[m.chat][sender];

      if (now - data.first <= SPAM_TIME && data.count >= SPAM_LIMIT) {
        await sock.sendMessage(
          m.chat,
          {
            delete: data.msgs.map(k => ({
              remoteJid: m.chat,
              fromMe: false,
              id: k.id,
              participant: sender
            }))
          }
        );

        await sock.sendMessage(
          m.chat,
          {
            text: `🚫 Anti-spam NOVA XMD\n@${sender.split('@')[0]} spam détecté.\nMessages supprimés.`
          },
          { mentions: [sender] }
        );

        delete spamData[m.chat][sender];
      }

      if (now - data.first > SPAM_TIME) {
        spamData[m.chat][sender] = { count: 1, first: now, msgs: [] };
      }
    }

    // ==================== ANTILINK SYSTEM — NOVA XMD ====================
    // Exécuter uniquement sur les messages non-commandes
    if (!isCommand) {
      await handleAntiLinkRuntime(sock, mRaw, m);
    }
  } catch (err) {
    console.error('❌ handleCommand error:', err);
  }
}

// ================== 👥 Participant update ==================
async function handleParticipantUpdate(sock, update) {
  try {
    // ✅ Welcome/Goodbye selon réglage du groupe
    const groupJid = update?.id;
    if (groupJid && groupJid.endsWith('@g.us')) {
      const settings = getGroupSettings(groupJid);

      // ✅ FIX: WhatsApp peut envoyer "invite" (et parfois "join") au lieu de "add"
      if ((update.action === 'add' || update.action === 'invite' || update.action === 'join') && settings.welcome) {
        await sendWelcome(sock, update).catch(() => {});
      }

      if (update.action === 'remove' && settings.goodbye) {
        await sendGoodbye(sock, update).catch(() => {});
      }
    }

    // ✅ Ton système existant: commandes qui gèrent participantUpdate()
    for (const cmd of Object.values(commands)) {
      if (typeof cmd.participantUpdate === 'function') {
        await cmd.participantUpdate(sock, update).catch(() => {});
      }
    }
  } catch (err) {
    console.error('❌ handleParticipantUpdate error:', err);
  }
}

// ================== EXPORT ==================
export { loadCommands, commands, smsg, handleParticipantUpdate, saveSettings };
export default handleCommand;