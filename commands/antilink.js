// commands/antilink.js
import fs from "fs";

const FILE = "./data/antilink.json";
const IMG_URL = "https://files.catbox.moe/ymt8zt.jpg";

function ensure() {
  if (!fs.existsSync("./data")) fs.mkdirSync("./data");
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
}

function read() {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    return {};
  }
}

function write(data) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

async function sendWithImage(sock, jid, text, quoted) {
  try {
    await sock.sendMessage(
      jid,
      { image: { url: IMG_URL }, caption: text },
      { quoted }
    );
  } catch (e) {
    // fallback texte si l'image échoue
    await sock.sendMessage(jid, { text }, { quoted });
  }
}

export default {
  name: "antilink",
  alias: ["antilien", "antilinkon", "antilinkoff"],
  description: "Active/Désactive l'AntiLink dans un groupe",
  category: "Group",
  usage: ".antilink on | .antilink off",
  async execute(sock, m, args, ctx = {}) {
    const jid = m.chat || m.key?.remoteJid || m.from;
    const isGroup = !!m.isGroup;
    const isAdmin = !!ctx.isAdmin;
    const isOwner = !!ctx.isOwner;

    if (!isGroup) {
      return sendWithImage(sock, jid, "❌ Cette commande marche seulement en groupe.", m);
    }
    if (!isAdmin && !isOwner) {
      return sendWithImage(sock, jid, "⛔ Admin/Owner seulement.", m);
    }

    const data = read();
    const sub = (args[0] || "").toLowerCase();
    const current = !!data[jid];

    // ON
    if (sub === "on" || sub === "enable" || sub === "1") {
      data[jid] = true;
      write(data);
      return sendWithImage(sock, jid, "✅ AntiLink *activé* dans ce groupe.", m);
    }

    // OFF
    if (sub === "off" || sub === "disable" || sub === "0") {
      delete data[jid];
      write(data);
      return sendWithImage(sock, jid, "✅ AntiLink *désactivé* dans ce groupe.", m);
    }

    // TOGGLE si pas d'argument
    if (!args.length) {
      if (current) delete data[jid];
      else data[jid] = true;

      write(data);
      return sendWithImage(
        sock,
        jid,
        `✅ AntiLink *${current ? "désactivé" : "activé"}* dans ce groupe.`,
        m
      );
    }

    // HELP
    return sendWithImage(
      sock,
      jid,
      "Utilisation : .antilink on | .antilink off (ou juste .antilink pour basculer)",
      m
    );
  },
};