// ==================== commands/welcome.js ====================
import { getGroupSettings, setGroupSettings } from "../system/groupSettings.js";

export default {
  name: "welcome",
  alias: ["welc"],
  category: "Group",
  group: true,
  admin: true,
  usage: ".welcome on | .welcome off | .welcome status",
  async execute(sock, m, args) {
    const jid = m.chat;
    const opt = (args[0] || "").toLowerCase();

    if (!opt || opt === "status") {
      const cur = getGroupSettings(jid);
      return sock.sendMessage(
        jid,
        {
          text:
            `📌 *Group Settings — NOVA XMD*\n` +
            `✅ Welcome: *${cur.welcome ? "ON" : "OFF"}*\n` +
            `✅ Goodbye: *${cur.goodbye ? "ON" : "OFF"}*`
        },
        { quoted: m }
      );
    }

    if (!["on", "off"].includes(opt)) {
      return sock.sendMessage(
        jid,
        { text: "Usage: .welcome on | .welcome off | .welcome status" },
        { quoted: m }
      );
    }

    setGroupSettings(jid, { welcome: opt === "on" });

    return sock.sendMessage(
      jid,
      { text: `✅ Welcome ${opt === "on" ? "activé" : "désactivé"} pour ce groupe.` },
      { quoted: m }
    );
  },
};