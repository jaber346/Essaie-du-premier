// commands/unmute.js
export default {
  name: "unmute",
  alias: ["opengc", "unlockgc"],
  description: "Ouvre le groupe (tout le monde peut écrire)",
  category: "Group",
  group: true,
  admin: true,
  async execute(sock, m) {
    const jid = m.chat || m.key?.remoteJid || m.from;
    try {
      await sock.groupSettingUpdate(jid, "not_announcement");
      await sock.sendMessage(jid, { text: "🔊 Groupe *unmuté* (tout le monde peut écrire)." }, { quoted: m });
    } catch (e) {
      console.log("unmute error:", e?.message || e);
      await sock.sendMessage(jid, { text: "❌ Impossible. Le bot doit être admin." }, { quoted: m });
    }
  },
};