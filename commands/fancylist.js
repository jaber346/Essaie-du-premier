// ==================== commands/fancylist.js ====================
import { FANCY_STYLES, fancyListPreview } from "../system/fancyStyles.js";

export default {
  name: "fancylist",
  alias: ["fonts", "styles", "fstyles"],
  category: "Tools",
  description: "Affiche la liste des styles fancy (35 styles SAFE)",
  usage: ".fancylist",
  async execute(sock, m) {
    const jid = m.chat || m.key?.remoteJid || m.from;

    const header =
      `📌 *FANCYLIST — ${FANCY_STYLES.length} STYLES*\n` +
      `📝 Exemple: *NOVA XMD*\n\n`;

    const list = fancyListPreview("NOVA XMD");

    const text =
      header +
      list +
      `\n\nUtilise: *.fancy <num> <texte>*\nEx: *.fancy 2 NOVA XMD*`;

    return sock.sendMessage(jid, { text }, { quoted: m });
  },
};