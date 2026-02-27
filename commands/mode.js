// commands/mode.js
import fs from "fs";

const MODE_FILE = "./data/botmode.json";

function ensureStore() {
  if (!fs.existsSync("./data")) fs.mkdirSync("./data");
  if (!fs.existsSync(MODE_FILE)) {
    fs.writeFileSync(MODE_FILE, JSON.stringify({ mode: "public" }, null, 2));
  }
}

export default {
  name: "mode",
  alias: ["botmode", "public", "private"],
  description: "Mettre le bot en mode public ou privé (owner only)",
  category: "Owner",
  usage: ".mode public | .mode private",
  async execute(sock, m, args, ctx = {}) {
    try {
      const isOwner = !!ctx.isOwner;
      if (!isOwner) {
        return sock.sendMessage(m.chat, { text: "⛔ Commande réservée au owner." }, { quoted: m });
      }

      ensureStore();
      const type = (args[0] || "").toLowerCase();

      if (!["public", "private"].includes(type)) {
        return sock.sendMessage(
          m.chat,
          { text: "Utilisation : .mode public | .mode private" },
          { quoted: m }
        );
      }

      fs.writeFileSync(MODE_FILE, JSON.stringify({ mode: type }, null, 2));

      // Sync runtime
      global.privateMode = type === "private";

      await sock.sendMessage(
        m.chat,
        { text: `✅ Mode du bot : *${type.toUpperCase()}*` },
        { quoted: m }
      );
    } catch (e) {
      console.log("mode error:", e);
      await sock.sendMessage(m.chat, { text: "❌ Erreur mode." }, { quoted: m });
    }
  },
};
