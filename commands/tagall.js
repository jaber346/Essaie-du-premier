// commands/tagall.js

export default {
  name: "tagall",
  alias: ["everyone", "all"],
  category: "Group",
  description: "Tag tous les membres + bouton chaîne (lien caché)",
  async execute(sock, m, args) {
    try {
      const jid = m.key.remoteJid;

      // Groupe only
      if (!jid.endsWith("@g.us")) {
        return sock.sendMessage(jid, { text: "⚠️ Utilise cette commande dans un groupe." }, { quoted: m });
      }

      const meta = await sock.groupMetadata(jid);
      const participants = meta.participants || [];
      if (!participants.length) {
        return sock.sendMessage(jid, { text: "❌ Aucun membre trouvé." }, { quoted: m });
      }

      const channelUrl = "https://whatsapp.com/channel/0029VbBrAUYAojYjf3Ndw70d";
      const imgUrl = "https://files.catbox.moe/ypzv6b.jpg";

      const reason = args.length ? args.join(" ") : "📣 Annonce";

      const mentions = participants.map(p => p.id);

      // Message
      let text = `╭──〔 𝗡𝗢𝗩𝗔-𝗫𝗠𝗗 〕──╮\n`;
      text += `📅 Date : ${new Date().toLocaleDateString("fr-FR")}\n`;
      text += `⏰ Heure : ${new Date().toLocaleTimeString("fr-FR")}\n`;
      text += `👥 Membres : ${participants.length}\n`;
      text += `📝 Message : ${reason}\n`;
      text += `╰────────────────────╯\n\n`;

      participants.forEach((p, i) => {
        const num = p.id.split("@")[0];
        text += `${i + 1}. @${num}\n`;
      });

      text += `\n━━━━━━━━━━━━━━━━━━\n`;
      text += `📢 Chaîne officielle : (bouton ci-dessous)\n`;
      text += `━━━━━━━━━━━━━━━━━━`;

      // Image -> buffer
      const res = await fetch(imgUrl);
      const buffer = Buffer.from(await res.arrayBuffer());

      // Envoi avec image + bouton URL caché via externalAdReply
      await sock.sendMessage(
        jid,
        {
          image: buffer,
          caption: text,
          mentions,
          contextInfo: {
            externalAdReply: {
              title: "DEV NOVA TECH",
              body: "📢 Cliquez pour rejoindre la chaîne",
              mediaType: 1,
              renderLargerThumbnail: true,
              thumbnail: buffer,
              sourceUrl: channelUrl // ✅ le lien est ici (caché)
            }
          },
          linkPreview: false
        },
        { quoted: m }
      );

    } catch (err) {
      console.error("TAGALL ERROR:", err);
      await sock.sendMessage(
        m.key.remoteJid,
        { text: "❌ Erreur tagall: " + err.message },
        { quoted: m }
      );
    }
  }
};