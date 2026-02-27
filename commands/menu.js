// ==================== commands/menu.js ====================
import fs from 'fs';
import path from 'path';
import { BOT_NAME, BOT_SLOGAN, BOT_VERSION, getBotImage } from '../system/botAssets.js';
import config from '../config.js';

// ===================== FORMAT UPTIME =====================
function formatUptime(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / (1000 * 60)) % 60;
  const h = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${d}d ${h}h ${m}m ${s}s`;
}

// ===================== LOAD COMMANDS =====================
async function loadCommands() {
  const commandsDir = path.join(process.cwd(), 'commands');
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
  const categories = {};

  for (const file of files) {
    try {
      const cmd = (await import(`./${file}`)).default;
      if (!cmd?.name) continue;

      const cat = (cmd.category || 'General').toUpperCase();
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(`.${cmd.name}`);
    } catch (err) {
      console.error('MENU LOAD ERROR:', file, err.message);
    }
  }
  return categories;
}

// ===================== COMMAND =====================
export default {
  name: 'menu',
  category: 'General',
  description: 'Bot menu',

  async execute(Kaya, m) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('en-US');
    const uptime = formatUptime(Date.now() - global.botStartTime);

    // ✅ MODE CORRECT
    const mode = global.privateMode ? 'PRIVATE 🔒' : 'PUBLIC 🌐';
    const user = m.sender.split('@')[0];

    const categories = await loadCommands();
    const totalCmds = Object.values(categories).reduce((a, b) => a + b.length, 0);

    let menuText = `
╭─────────────────╮
│     ${BOT_NAME}
├─────────────────┤
│ 👤 User     : ${user}
│ ⏰ Time     : ${time}
│ 📅 Date     : ${date}
│ ⚡ Uptime  : ${uptime}
│ 🧩 Commands: ${totalCmds}
│ 🌐 Mode    : ${mode}
│ 🧪 Version : ${BOT_VERSION}
╰─────────────────╯
`;

    for (const cat of Object.keys(categories)) {
      menuText += `
『 *${cat} MENU* 』
╭─────────────────
│ ${categories[cat].join('\n│ ')}
╰─────────────────
`;
    }

    menuText += `\n${BOT_SLOGAN}`;

    try {
      await Kaya.sendMessage(
        m.chat,
        {
          image: { url: getBotImage() },
          caption: menuText,
          buttons: [
            {
              buttonId: 'channel',
              buttonText: { displayText: '📢 Suivre la chaîne' },
              type: 1
            }
          ],
          headerType: 4
        }
      );
    } catch (e) {
      console.error('❌ Menu image failed, sending text only:', e);
      await Kaya.sendMessage(
        m.chat,
        {
          text: menuText,
          buttons: [
            {
              buttonId: 'channel',
              buttonText: { displayText: '📢 Suivre la chaîne' },
              type: 1
            }
          ]
        }
      );
    }
  },
};