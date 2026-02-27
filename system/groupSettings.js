// ==================== system/groupSettings.js ====================
import fs from "fs";

const FILE = "./data/groupSettings.json";

function ensureFile() {
  if (!fs.existsSync("./data")) fs.mkdirSync("./data");
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
}

function readAll() {
  try {
    ensureFile();
    return JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeAll(data) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function getGroupSettings(groupJid) {
  const data = readAll();
  const s = data[groupJid] || {};
  return {
    welcome: Boolean(s.welcome),
    goodbye: Boolean(s.goodbye),
  };
}

export function setGroupSettings(groupJid, updates = {}) {
  const data = readAll();
  data[groupJid] = { ...(data[groupJid] || {}), ...updates };
  writeAll(data);
}