// commands/linkgc.js

function formatDate(ts) {
  try {
    return new Date(ts * 1000).toLocaleString("fr-FR");
  } catch {
    return "Inconnu";
  }
}

export default {
  name: "linkgc",
  alias: ["gclink", "linkgroup", "link"],
  description: "Lien du groupe + infos complètes",
  category: "Group",
  group: true,
  admin: true,

  async execute(sock, m) {
    const jid = m.chat || m.key?.remoteJid || m.from;

    try {
      const meta = await sock.groupMetadata(jid);

      const name = meta.subject || "Groupe";
      const id = jid;
      const members = meta.participants?.length || 0;
      const admins = meta.participants?.filter(p => p.admin)?.length || 0;
      const owner = meta.owner
        ? `@${meta.owner.split("@")[0]}`
        : "Inconnu";
      const created = meta.creation
        ? formatDate(meta.creation)
        : "Inconnu";
      const desc = meta.desc?.trim() || "Aucune description";

      const code = await sock.groupInviteCode(jid);
      const link = `https://chat.whatsapp.com/${code}`;

      const mentions = meta.owner ? [meta.owner] : [];

      const text =
`🔗 *Lien du groupe*
${link}

📌 *Informations du groupe*
• Nom : ${name}
• ID : ${id}
• Membres : ${members}
• Admins : ${admins}
• Créateur : ${owner}
• Créé le : ${created}

📝 *Description*
${desc}`;

      await sock.sendMessage(
        jid,
        { text, mentions },
        { quoted: m }
      );

    } catch (e) {
      console.error("linkgc error:", e?.message || e);
      await sock.sendMessage(
        jid,
        { text: "❌ Impossible. Le bot doit être admin et la commande doit être utilisée dans un groupe." },
        { quoted: m }
      );
    }
  },
};