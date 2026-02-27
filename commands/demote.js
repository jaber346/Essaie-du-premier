// commands/demote.js
function pickTarget(m) {
  const ctx = m.message?.extendedTextMessage?.contextInfo;
  const mentioned = ctx?.mentionedJid?.[0];
  const quotedSender = ctx?.participant;
  return mentioned || quotedSender || null;
}

export default {
  name: "demote",
  alias: ["unadmin"],
  description: "Retire le rôle admin",
  category: "Group",
  group: true,
  admin: true,
  async execute(sock, m) {
    const jid = m.chat || m.key?.remoteJid || m.from;
    const target = pickTarget(m);
    if (!target) return sock.sendMessage(jid, { text: "❌ Mentionne quelqu’un ou réponds à son message." }, { quoted: m });

    try {
      await sock.groupParticipantsUpdate(jid, [target], "demote");
      await sock.sendMessage(jid, { text: `✅ @${target.split("@")[0]} n’est plus admin.` , mentions:[target]}, { quoted: m });
    } catch (e) {
      console.log("demote error:", e?.message || e);
      await sock.sendMessage(jid, { text: "❌ Impossible. Le bot doit être admin." }, { quoted: m });
    }
  },
};