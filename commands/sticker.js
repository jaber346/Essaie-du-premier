// ==================== commands/sticker.js ====================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import webp from "node-webpmux";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKNAME = "NOVA XMD";
const AUTHOR = "nova"; // ou 😎

function ensureTemp() {
  const dir = path.join(__dirname, "../temp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function streamToFile(stream, outPath) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  fs.writeFileSync(outPath, Buffer.concat(chunks));
}

// ===== EXIF (sans emojis) =====
async function addExif(webpPath, packname, author) {
  const img = new webp.Image();
  await img.load(webpPath);

  const json = {
    "sticker-pack-id": "nova-xmd",
    "sticker-pack-name": packname,
    "sticker-pack-publisher": author
  };

  const exifAttr = Buffer.from([
    0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,
    0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,
    0x00,0x00,0x16,0x00,0x00,0x00,
  ]);

  const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  img.exif = exif;
  await img.save(webpPath);
}

// ===== IMAGE -> WEBP =====
function imageToWebp(input, output) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions([
        "-vf",
        "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000",
        "-vcodec","libwebp",
        "-q:v","70"
      ])
      .on("end", resolve)
      .on("error", reject)
      .save(output);
  });
}

// ===== VIDEO/GIF -> WEBP animé (<=10s) =====
function videoToWebp(input, output) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .inputOptions(["-t 10"])
      .outputOptions([
        "-vf",
        "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000",
        "-vcodec","libwebp",
        "-q:v","70",
        "-loop","0",
        "-an"
      ])
      .on("end", resolve)
      .on("error", reject)
      .save(output);
  });
}

// ===== récupère le quoted proprement =====
function getQuotedMessage(m) {
  const msg = m?.message || {};
  const ci =
    msg?.extendedTextMessage?.contextInfo ||
    msg?.imageMessage?.contextInfo ||
    msg?.videoMessage?.contextInfo ||
    msg?.documentMessage?.contextInfo ||
    null;
  return ci?.quotedMessage || null;
}

export default {
  name: "sticker",
  alias: ["s", "stiker", "stick"],
  description: "Sticker image + sticker animé (vidéo ≤ 10s) — NOVA XMD",
  category: "Sticker",
  usage: "Réponds à une image/vidéo avec .s ou envoie avec légende .s / .sticker",
  async execute(sock, m) {
    const tempDir = ensureTemp();
    const id = Date.now();

    try {
      const msg = m.message;
      const quoted = getQuotedMessage(m);

      const image = msg?.imageMessage || quoted?.imageMessage || null;
      const video = msg?.videoMessage || quoted?.videoMessage || null;

      if (!image && !video) {
        return sock.sendMessage(
          m.chat,
          { text: "❌ Envoie ou réponds à une *image* ou *vidéo (≤10s)* avec *.s* / *.sticker*." },
          { quoted: m }
        );
      }

      // ===== VIDEO =====
      if (video) {
        if ((video.seconds || 0) > 10) {
          return sock.sendMessage(
            m.chat,
            { text: "❌ Vidéo trop longue (max 10s)." },
            { quoted: m }
          );
        }

        const stream = await downloadContentFromMessage(video, "video");
        const input = path.join(tempDir, `in_${id}.mp4`);
        const output = path.join(tempDir, `out_${id}.webp`);

        await streamToFile(stream, input);
        await videoToWebp(input, output);
        await addExif(output, PACKNAME, AUTHOR);

        await sock.sendMessage(m.chat, { sticker: fs.readFileSync(output) }, { quoted: m });
        fs.existsSync(input) && fs.unlinkSync(input);
        fs.existsSync(output) && fs.unlinkSync(output);
        return;
      }

      // ===== IMAGE =====
      if (image) {
        const stream = await downloadContentFromMessage(image, "image");
        const input = path.join(tempDir, `in_${id}.jpg`);
        const output = path.join(tempDir, `out_${id}.webp`);

        await streamToFile(stream, input);
        await imageToWebp(input, output);
        await addExif(output, PACKNAME, AUTHOR);

        await sock.sendMessage(m.chat, { sticker: fs.readFileSync(output) }, { quoted: m });
        fs.existsSync(input) && fs.unlinkSync(input);
        fs.existsSync(output) && fs.unlinkSync(output);
      }
    } catch (e) {
      console.error("Sticker error:", e);
      await sock.sendMessage(
        m.chat,
        { text: "❌ Erreur lors de la création du sticker." },
        { quoted: m }
      );
    }
  }
};