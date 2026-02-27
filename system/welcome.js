import fs from "fs";
import path from "path";

/**
 * Envoie le message de bienvenue
 * @param {*} sock
 * @param {*} update
 */
export async function sendWelcome(sock, update) {
  try {
    const { id, participants, action } = update;
    if (action !== "add") return;

    const user = participants?.[0];
    if (!user) return;

    const meta = await sock.groupMetadata(id);
    const groupName = meta?.subject || "Groupe";
    const membersCount = meta?.participants?.length || 0;

    const text =
`👋 BIENVENUE !

👤 @${user.split("@")[0]}
🏷 Groupe : ${groupName}
👥 Membres : ${membersCount}

✨ Bienvenue dans la famille *NOVA XMD*
📌 Lis la description du groupe
🤝 Respecte les règles
`;

    await sock.sendMessage(id, {
      text,
      mentions: [user]
    });
  } catch (e) {
    console.log("❌ sendWelcome error:", e?.message || e);
  }
}

/**
 * Envoie le message d'au revoir
 * @param {*} sock
 * @param {*} update
 */
export async function sendGoodbye(sock, update) {
  try {
    const { id, participants, action } = update;
    if (action !== "remove") return;

    const user = participants?.[0];
    if (!user) return;

    const meta = await sock.groupMetadata(id);
    const groupName = meta?.subject || "Groupe";
    const membersCount = meta?.participants?.length || 0;

    const text =
`👋 AU REVOIR !

👤 @${user.split("@")[0]}
🏷 Groupe : ${groupName}
👥 Membres restants : ${membersCount}

😢 Un membre a quitté le groupe
🔒 Bonne continuation
`;

    await sock.sendMessage(id, {
      text,
      mentions: [user]
    });
  } catch (e) {
    console.log("❌ sendGoodbye error:", e?.message || e);
  }
}