// ==================== commands/antispam.js ====================

const antiSpamState = {};

export default {
  name: "antispam",
  alias: ["spam"],
  description: "🛡️ Active ou désactive l’anti-spam",
  category: "Groupe",
  group: true,
  admin: true,

  execute: async (nova, m, args) => {
    const chat = m.chat;

    if (!args[0]) {
      return nova.sendMessage(
        chat,
        { text: "Utilisation : .antispam on | off" },
        { quoted: m }
      );
    }

    if (args[0] === "on") {
      antiSpamState[chat] = true;
      return nova.sendMessage(
        chat,
        { text: "✅ Anti-spam ACTIVÉ — NOVA XMD" },
        { quoted: m }
      );
    }

    if (args[0] === "off") {
      antiSpamState[chat] = false;
      return nova.sendMessage(
        chat,
        { text: "❌ Anti-spam DÉSACTIVÉ — NOVA XMD" },
        { quoted: m }
      );
    }
  },

  antiSpamState
};