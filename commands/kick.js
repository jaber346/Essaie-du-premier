// commands/kick.js

function normalizeJid(jid) {
  if (!jid) return null;
  if (jid.endsWith("@s.whatsapp.net")) return jid;
  if (jid.endsWith("@g.us")) return null;
  return jid.includes("@") ? jid : jid + "@s.whatsapp.net";
}

function getTarget(m) {
  const ctx = m.message?.extendedTextMessage?.contextInfo;

  // 1) mention
  if (ctx?.mentionedJid?.length) {
    return normalizeJid(ctx.mentionedJid[0]);
  }

  // 2) reply
  if (ctx?.participant) {
    return normalizeJid(ctx.participant);
  }

  return null;
}

export default {
  name: "kick",
  alias: ["remove"],
  description: "Expulse un membre (mention ou réponse)",
  category: "Group",
  group: true,
  admin: true,

  async execute(sock, m) {
    const jid = m.chat;
    const target = getTarget(m);

    if (!target) {
      return sock.sendMessage(
        jid,
        { text: "❌ Mentionne quelqu’un ou réponds à son message." },
        { quoted: m }
      );
    }

    try {
      await sock.groupParticipantsUpdate(jid, [target], "remove");

      await sock.sendMessage(
        jid,
        { text: `✅ @${target.split("@")[0]} expulsé.` , mentions: [target] },
        { quoted: m }
      );
    } catch (e) {
      console.log("kick error:", e?.message || e);

      let reason = "❌ Impossible d’expulser ce membre.";
      if (String(e).includes("admin")) reason += "\nℹ️ Le membre est admin ou owner.";

      await sock.sendMessage(
        jid,
        { text: reason },
        { quoted: m }
      );
    }
  },
};