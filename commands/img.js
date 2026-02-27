// commands/img.js
import axios from "axios";

function uniq(arr) {
  return [...new Set(arr)];
}

export default {
  name: "img",
  alias: ["image", "pinterest", "pin"],
  description: "Recherche des images (Pinterest) et envoie 5 résultats",
  category: "Search",
  usage: ".img sasuke",
  async execute(sock, m, args) {
    const jid = m.chat || m.key?.remoteJid || m.from;

    try {
      const query = args.join(" ").trim();
      if (!query) {
        return sock.sendMessage(jid, { text: "Ex: .img Sasuke" }, { quoted: m });
      }

      // r.jina.ai permet souvent de bypass les blocages Pinterest
      const target = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
      const proxied = `https://r.jina.ai/http://${target.replace(/^https?:\/\//, "")}`;

      const res = await axios.get(proxied, {
        timeout: 20000,
        headers: {
          "user-agent":
            "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        },
      });

      const html = String(res.data || "");

      // récupère des images pinterest
      // ex: https://i.pinimg.com/736x/...jpg
      const matches = html.match(/https:\/\/i\.pinimg\.com\/[^\s"'\\)]+/g) || [];

      // nettoie, garde jpg/png/webp, supprime doublons, prend 5
      const imgs = uniq(
        matches
          .map((u) => u.replace(/\\u002F/g, "/").replace(/\\u003D/g, "="))
          .filter((u) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u))
      ).slice(0, 5);

      if (!imgs.length) {
        return sock.sendMessage(
          jid,
          { text: "❌ Aucune image trouvée (Pinterest bloqué ou aucun résultat)." },
          { quoted: m }
        );
      }

      for (let i = 0; i < imgs.length; i++) {
        await sock.sendMessage(
          jid,
          { image: { url: imgs[i] }, caption: `🖼️ ${query} (${i + 1}/${imgs.length})` },
          { quoted: m }
        );
      }
    } catch (e) {
      console.log("img error:", e?.message || e);
      return sock.sendMessage(
        jid,
        { text: "❌ Erreur img (hébergeur/réseau bloque Pinterest). Réessaie plus tard." },
        { quoted: m }
      );
    }
  },
};