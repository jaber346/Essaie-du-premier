// ==================== commands/plays.js ====================
import axios from "axios";

// Plusieurs hosts Audius (fallback auto)
const AUDIUS_HOSTS = [
  "https://discoveryprovider.audius.co",
  "https://discoveryprovider2.audius.co",
  "https://audius-discovery-1.cultur3stake.com",
];

// requête Audius avec fallback
async function audiusGet(path, params = {}) {
  let lastErr;
  for (const host of AUDIUS_HOSTS) {
    try {
      const { data } = await axios.get(host + path, {
        params,
        timeout: 20000,
      });
      return data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Audius API error");
}

async function fetchBuffer(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
  });
  return Buffer.from(res.data);
}

export default {
  name: "plays",
  alias: ["play", "song"],
  category: "Music",
  description: "Recherche une musique via Audius et envoie l'audio",
  usage: ".plays phonk",
  async execute(sock, m, args) {
    const jid = m.chat || m.key?.remoteJid || m.from;
    const query = args.join(" ").trim();

    if (!query) {
      return sock.sendMessage(
        jid,
        { text: "Ex: .plays phonk" },
        { quoted: m }
      );
    }

    try {
      // 🔍 Recherche d’un titre
      const search = await audiusGet("/v1/tracks/search", {
        query,
        limit: 1,
      });

      const track = search?.data?.[0];
      if (!track) {
        return sock.sendMessage(
          jid,
          { text: "❌ Aucun résultat trouvé sur Audius." },
          { quoted: m }
        );
      }

      // 🎧 Stream URL
      const streamUrl = `${AUDIUS_HOSTS[0]}/v1/tracks/${track.id}/stream`;

      // ⬇️ Télécharger l’audio
      const audioBuffer = await fetchBuffer(streamUrl);

      // 📤 Envoyer sur WhatsApp
      await sock.sendMessage(
        jid,
        {
          audio: audioBuffer,
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `${(track.title || "audio")
            .replace(/[^\w\s-]/g, "")
            .trim()}.mp3`,
          caption:
            `🎵 *${track.title}*\n` +
            `👤 ${track.user?.name || "Unknown"}\n` +
            `🌐 Source: Audius`,
        },
        { quoted: m }
      );
    } catch (e) {
      console.error("plays audius error:", e?.message || e);
      return sock.sendMessage(
        jid,
        { text: "❌ Erreur .plays (Audius indisponible / réseau)." },
        { quoted: m }
      );
    }
  },
};