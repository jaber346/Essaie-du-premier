// commands/take.js
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { Sticker, StickerTypes } from "wa-sticker-formatter";

async function toBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default {
  name: "take",
  alias: ["steal", "wm"],
  description: "Change le nom (packname) du sticker",
  category: "Sticker",
  usage: ".take (en répondant à un sticker) OU .take MonNom",
  async execute(sock, m, args) {
    const jid = m.chat || m.key?.remoteJid || m.from;

    try {
      // sticker cité (reply)
      const quoted =
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
        m.message?.imageMessage?.contextInfo?.quotedMessage ||
        m.message?.videoMessage?.contextInfo?.quotedMessage;

      const stickerMsg = quoted?.stickerMessage;

      if (!stickerMsg) {
        return sock.sendMessage(
          jid,
          { text: "❌ Réponds à un *sticker* avec `.take`" },
          { quoted: m }
        );
      }

      // Nom à mettre: soit args, soit pseudo WhatsApp
      const packname = args.join(" ").trim() || m.pushName || "";
      const author = ""; // tu peux changer si tu veux

      // Télécharger le sticker
      const stream = await downloadContentFromMessage(stickerMsg, "sticker");
      const stickerBuffer = await toBuffer(stream);

      // Re-créer le sticker avec nouveaux metadata
      const sticker = new Sticker(stickerBuffer, {
        pack: packname,
        author,
        type: StickerTypes.FULL,
        quality: 70,
      });

      const out = await sticker.toBuffer();

      await sock.sendMessage(
        jid,
        { sticker: out },
        { quoted: m }
      );
    } catch (e) {
      console.log("take error:", e?.message || e);
      await sock.sendMessage(
        jid,
        { text: "❌ Erreur pendant la modification du sticker." },
        { quoted: m }
      );
    }
  },
};