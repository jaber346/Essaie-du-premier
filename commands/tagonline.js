// commands/tagonline.js
export default {
  name: "tagonline",
  alias: ["online"],
  description: "Tag les membres en ligne (si présence dispo)",
  category: "Group",
  group: true,
  async execute(sock, m) {
    const jid = m.chat || m.key?.remoteJid || m.from;

    try {
      const meta = await sock.groupMetadata(jid);
      const members = meta.participants?.map(p => p.id) || [];

      // Baileys ne donne pas toujours la présence => on essaye
      const pres = sock.presence?.[jid] || null;
      if (!pres) {
        return sock.sendMessage(jid, { text: "⚠️ Présence indisponible ici. WhatsApp bloque souvent le tagonline." }, { quoted: m });
      }

      const online = Object.entries(pres)
        .filter(([_, v]) => v?.lastKnownPresence === "available")
        .map(([k]) => k);

      if (!online.length) {
        return sock.sendMessage(jid, { text: "Aucun membre détecté en ligne (ou présence bloquée)." }, { quoted: m });
      }

      const text = online.map(u => `@${u.split("@")[0]}`).join(" ");
      await sock.sendMessage(jid, { text: `🟢 En ligne:\n${text}`, mentions: online }, { quoted: m });
    } catch (e) {
      console.log("tagonline error:", e?.message || e);
      await sock.sendMessage(jid, { text: "❌ Erreur tagonline." }, { quoted: m });
    }
  },
};