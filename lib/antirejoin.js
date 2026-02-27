// ==================== ANTI-REJOIN — NOVA XMD ====================

import fs from "fs";

const FILE = "./data/antirejoin.json";

if (!fs.existsSync("./data")) fs.mkdirSync("./data");
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}");

export function addBan(group, user) {
  const data = JSON.parse(fs.readFileSync(FILE));
  if (!data[group]) data[group] = [];
  if (!data[group].includes(user)) data[group].push(user);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function isBanned(group, user) {
  const data = JSON.parse(fs.readFileSync(FILE));
  return data[group]?.includes(user);
}