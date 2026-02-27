// commands/autostatus.js

export default {
  name: "autostatus",
  alias: ["statusauto", "autoviewstatus"],
  description: "Active ou désactive l’auto view des status",
  category: "Owner",
  ownerOnly: true,

  async execute(sock, m, args, ctx = {}) {
    const jid = m.chat || m.key?.remoteJid || m.from;

    // sécurité owner
    if (!ctx.isOwner && !m.fromMe) {
      return sock.sendMessage(
        jid,
        { text: "⛔ Commande réservée au owner." },
        { quoted: m }
      );
    }

    const sub = (args[0] || "").toLowerCase();

    if (sub === "on" || sub === "1" || sub === "enable") {
      global.autoStatus = true;
      return sock.sendMessage(
        jid,
        { text: "✅ AutoStatus activé\nLe bot verra automatiquement les status." },
        { quoted: m }
      );
    }

    if (sub === "off" || sub === "0" || sub === "disable") {
      global.autoStatus = false;
      return sock.sendMessage(
        jid,
        { text: "❌ AutoStatus désactivé" },
        { quoted: m }
      );
    }

    // état actuel
    return sock.sendMessage(
      jid,
      {
        text:
`📊 *AUTO STATUS*
État actuel : ${global.autoStatus ? "✅ ACTIVÉ" : "❌ DÉSACTIVÉ"}

Utilisation :
.autostatus on
.autostatus off`
      },
      { quoted: m }
    );
  },
};