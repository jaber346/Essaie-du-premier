// commands/mute.js
export default {
  name: "mute",
  alias: ["closegc", "lockgc"],
  description: "Ferme le groupe (seuls les admins peuvent écrire)",
  category: "Group",
  group: true,
  admin: true,
  async execute(sock, m) {
    const jid = m.chat || m.key?.remoteJid || m.from;
    try {
      await sock.groupSettingUpdate(jid, "announcement");
      await sock.sendMessage(jid, { text: "🔇 Groupe *muté* (admins seulement)." }, { quoted: m });
    } catch (e) {
      console.log("mute error:", e?.message || e);
      await sock.sendMessage(jid, { text: "❌ Impossible. Le bot doit être admin." }, { quoted: m });
    }
  },
};