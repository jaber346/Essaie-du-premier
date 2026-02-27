// ==================== commands/fancy.js ====================
import { FANCY_STYLES, fancyApply } from "../system/fancyStyles.js";

export default {
  name: "fancy",
  alias: ["font", "style"],
  category: "Tools",
  description: "Convertit un texte en fancy (35 styles)",
  usage: ".fancy <num> <texte>",
  async execute(sock, m, args) {
    const jid = m.chat || m.key?.remoteJid || m.from;

    const num = args[0];
    const text = args.slice(1).join(" ").trim();

    if (!num || !text) {
      return sock.sendMessage(
        jid,
        {
          text:
            `Usage:\n` +
            `• *.fancylist*\n` +
            `• *.fancy <num> <texte>*\n` +
            `Ex: *.fancy 2 NOVA XMD*`,
        },
        { quoted: m }
      );
    }

    const out = fancyApply(num, text);

    if (!out) {
      return sock.sendMessage(
        jid,
        { text: `❌ Numéro invalide. Choisis entre 1 et ${FANCY_STYLES.length} (voir *.fancylist*).` },
        { quoted: m }
      );
    }

    return sock.sendMessage(jid, { text: out }, { quoted: m });
  },
};