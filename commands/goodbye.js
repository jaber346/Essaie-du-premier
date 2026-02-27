// ==================== commands/goodbye.js ====================
import { getGroupSettings, setGroupSettings } from "../system/groupSettings.js";

export default {
  name: "goodbye",
  alias: ["bye", "gb"],
  category: "Group",
  group: true,
  admin: true,
  usage: ".goodbye on | .goodbye off | .goodbye status",
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
        { text: "Usage: .goodbye on | .goodbye off | .goodbye status" },
        { quoted: m }
      );
    }

    setGroupSettings(jid, { goodbye: opt === "on" });

    return sock.sendMessage(
      jid,
      { text: `✅ Goodbye ${opt === "on" ? "activé" : "désactivé"} pour ce groupe.` },
      { quoted: m }
    );
  },
};