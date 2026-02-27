// commands/yt.js
import youtubedl from "youtube-dl-exec";
import fs from "fs";
import path from "path";
import os from "os";

function isYouTubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
}

export default {
  name: "yt",
  alias: ["youtube", "ytvideo"],
  description: "Télécharge une vidéo YouTube via lien",
  category: "Download",
  usage: ".yt <lien youtube>",
  async execute(sock, m, args) {
    const jid = m.chat || m.key?.remoteJid || m.from;
    const url = args[0];

    if (!url || !isYouTubeUrl(url)) {
      return sock.sendMessage(jid, { text: "Ex: .yt https://youtu.be/xxxx" }, { quoted: m });
    }

    try {
      await sock.sendMessage(jid, { text: "📥 Download YouTube..." }, { quoted: m });

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nova-yt-"));
      const out = path.join(tmpDir, `yt-${Date.now()}.mp4`);

      await youtubedl(url, {
        output: out,
        format: "mp4/best",
        noPlaylist: true,
        mergeOutputFormat: "mp4",
      });

      const video = fs.readFileSync(out);

      await sock.sendMessage(
        jid,
        { document: video, mimetype: "video/mp4", fileName: "NOVA-YT.mp4" },
        { quoted: m }
      );

      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    } catch (e) {
      console.log("yt error:", e?.message || e);
      await sock.sendMessage(
        jid,
        { text: "❌ YouTube download error (souvent: ffmpeg absent / YouTube bloqué / vidéo trop lourde)." },
        { quoted: m }
      );
    }
  },
};