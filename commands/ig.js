// commands/ig.js
import * as ruhend from "ruhend-scraper";

function isInstagramUrl(url) {
  return /^(https?:\/\/)?(www\.)?instagram\.com\/(reel|p|tv)\//i.test(url);
}

export default {
  name: "ig",
  alias: ["instagram", "igreel", "igdl"],
  description: "Télécharge une vidéo ou image Instagram via lien",
  category: "Download",
  usage: ".ig <lien instagram>",
  async execute(sock, m, args) {
    const jid = m.chat || m.key?.remoteJid || m.from;

    try {
      const url = args[0];
      if (!url || !isInstagramUrl(url)) {
        return sock.sendMessage(
          jid,
          { text: "Ex: .ig https://www.instagram.com/reel/xxxx/" },
          { quoted: m }
        );
      }

      await sock.sendMessage(jid, { text: "📥 Téléchargement Instagram..." }, { quoted: m });

      // ruhend-scraper IG
      const res =
        ruhend.instagram ||
        ruhend.instagramdl ||
        (ruhend.default && ruhend.default.instagram);

      if (typeof res !== "function") {
        return sock.sendMessage(
          jid,
          { text: "❌ Téléchargement Instagram indisponible (scraper manquant)." },
          { quoted: m }
        );
      }

      const data = await res(url);

      // Normalise les résultats
      const items =
        Array.isArray(data) ? data :
        Array.isArray(data?.result) ? data.result :
        Array.isArray(data?.results) ? data.results :
        [];

      if (!items.length) {
        return sock.sendMessage(
          jid,
          { text: "❌ Aucun média trouvé." },
          { quoted: m }
        );
      }

      // Envoie tous les médias (limite raisonnable)
      for (let i = 0; i < items.length && i < 5; i++) {
        const media = items[i];
        const urlMedia = media.url || media.download || media.video || media.image;
        if (!urlMedia) continue;

        // vidéo ou image
        if (/\.(mp4|mkv|webm)(\?|$)/i.test(urlMedia)) {
          await sock.sendMessage(
            jid,
            { video: { url: urlMedia }, caption: "📥 Instagram" },
            { quoted: m }
          );
        } else {
          await sock.sendMessage(
            jid,
            { image: { url: urlMedia }, caption: "📥 Instagram" },
            { quoted: m }
          );
        }
      }
    } catch (e) {
      console.log("ig error:", e?.message || e);
      await sock.sendMessage(
        jid,
        { text: "❌ Erreur téléchargement Instagram (lien privé ou bloqué)." },
        { quoted: m }
      );
    }
  },
};