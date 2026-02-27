// commands/wall4k.js
import axios from "axios";

const PEXELS_API_KEY = "XJAQDQ6maK7Q9imzJM53gt74Pm4Kb2mpNMYefDEvSCZe28FsgrnT7rxV";
const UNSPLASH_ACCESS_KEY = "aqXRFnSZVO_FOLiLjlmRa_TWhttr1KlMolk7915bcKk";

function pickMimeAndExt(contentType, fallbackExt = "jpg") {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("png")) return { mime: "image/png", ext: "png" };
  if (ct.includes("webp")) return { mime: "image/webp", ext: "webp" };
  if (ct.includes("jpeg") || ct.includes("jpg")) return { mime: "image/jpeg", ext: "jpg" };
  return { mime: "image/jpeg", ext: fallbackExt };
}

async function fetchBuffer(url, headers = {}) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: {
      "user-agent": "Mozilla/5.0",
      ...headers,
    },
  });
  return { buffer: Buffer.from(res.data), contentType: res.headers["content-type"] };
}

async function getFromPexels(query, page = 1) {
  if (!PEXELS_API_KEY) throw new Error("PEXELS_API_KEY manquant");

  const api = "https://api.pexels.com/v1/search";
  const { data } = await axios.get(api, {
    timeout: 20000,
    headers: { Authorization: PEXELS_API_KEY },
    params: {
      query,
      page,
      per_page: 1,
      orientation: "portrait",
      size: "large", // 24MP min (selon la doc)
    },
  });

  const photo = data?.photos?.[0];
  if (!photo) return null;

  // "original" est le plus propre
  const url = photo?.src?.original || photo?.src?.large2x || photo?.src?.large;
  return {
    url,
    credit: `Photo by ${photo.photographer} (Pexels)`,
    creditUrl: photo.url,
    source: "pexels",
  };
}

async function getFromUnsplash(query, page = 1) {
  if (!UNSPLASH_ACCESS_KEY) throw new Error("UNSPLASH_ACCESS_KEY manquant");

  const api = "https://api.unsplash.com/search/photos";
  const { data } = await axios.get(api, {
    timeout: 20000,
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    params: {
      query,
      page,
      per_page: 1,
      orientation: "portrait",
      order_by: "relevant",
    },
  });

  const photo = data?.results?.[0];
  if (!photo) return null;

  // raw = max, on demande une largeur HD (WhatsApp reste ok car on envoie en document)
  const raw = photo?.urls?.raw;
  const url = raw ? `${raw}&w=2160&fit=max&q=100` : (photo?.urls?.full || photo?.urls?.regular);

  return {
    url,
    credit: `Photo by ${photo.user?.name || "Unknown"} (Unsplash)`,
    creditUrl: photo.links?.html,
    source: "unsplash",
  };
}

function buildBtnId({ src, q, page }) {
  // format simple: wall4k_next|src=pexels|page=2|q=....
  return `wall4k_next|src=${src}|page=${page}|q=${encodeURIComponent(q)}`;
}

function parseBtnId(id) {
  // id: wall4k_next|src=pexels|page=2|q=xxx
  const parts = String(id || "").split("|");
  if (parts[0] !== "wall4k_next") return null;
  const obj = {};
  for (const p of parts.slice(1)) {
    const [k, ...rest] = p.split("=");
    obj[k] = rest.join("="); // au cas où
  }
  if (!obj.src || !obj.page || !obj.q) return null;
  return {
    src: obj.src,
    page: Number(obj.page) || 1,
    q: decodeURIComponent(obj.q),
  };
}

export async function sendWall4K(sock, jid, quotedMsg, { src = "pexels", q, page = 1 } = {}) {
  let item = null;

  // priorité: la source demandée, sinon fallback sur l'autre
  if (src === "unsplash") item = await getFromUnsplash(q, page);
  else item = await getFromPexels(q, page);

  if (!item) {
    // fallback si 0 résultat
    item = src === "unsplash" ? await getFromPexels(q, page) : await getFromUnsplash(q, page);
  }
  if (!item) {
    await sock.sendMessage(jid, { text: "❌ Aucun wallpaper trouvé (Pexels/Unsplash)." }, { quoted: quotedMsg });
    return;
  }

  const dl = await fetchBuffer(item.url);
  const { mime, ext } = pickMimeAndExt(dl.contentType, "jpg");

  const nextPage = page + 1;
  const nextBtnId = buildBtnId({ src: item.source, q, page: nextPage });

  await sock.sendMessage(
    jid,
    {
      document: dl.buffer,
      fileName: `WALLPAPER_4K_${q.replace(/\s+/g, "_")}_${item.source}_${page}.${ext}`,
      mimetype: mime,
      caption:
        `🖼️ *WALLPAPER 4K HD*\n` +
        `🔎 *${q}*\n` +
        `📌 Source: *${item.source.toUpperCase()}*\n` +
        `© ${item.credit}\n${item.creditUrl || ""}`,
      footer: "NOVA XMD • Wallpaper 4K HD",
      buttons: [
        { buttonId: nextBtnId, buttonText: { displayText: "🔄 NEXT 4K" }, type: 1 },
      ],
      headerType: 1,
    },
    { quoted: quotedMsg }
  );
}

export default {
  name: "wall4k",
  alias: ["wallpaper4k", "wp4k"],
  description: "Wallpaper 4K HD (Pexels/Unsplash) + bouton NEXT",
  category: "Search",
  usage: ".wall4k sasuke | .wall4k -u sasuke",
  async execute(sock, m, args) {
    const jid = m.chat || m.key?.remoteJid || m.from;

    const useUnsplash = args[0] === "-u" || args[0] === "--unsplash";
    if (useUnsplash) args = args.slice(1);

    const q = args.join(" ").trim();
    if (!q) {
      return sock.sendMessage(
        jid,
        { text: "Ex: .wall4k Sasuke\nEx: .wall4k -u Sasuke (Unsplash)" },
        { quoted: m }
      );
    }

    await sendWall4K(sock, jid, m, { src: useUnsplash ? "unsplash" : "pexels", q, page: 1 });
  },
};

// export le parser pour ton handler
export { parseBtnId };