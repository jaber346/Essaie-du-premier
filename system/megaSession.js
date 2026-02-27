// ================== MEGA SESSION LOADER ==================
import fs from 'fs';

let File;

async function initMega() {
  // ✅ En prod (Render/VPS), on n'installe JAMAIS des dépendances au runtime.
  // Ajoute "megajs" dans package.json.
  const megajs = await import('megajs');
  File = megajs?.default?.File || megajs.File;
}

export async function loadSessionFromMega(credsPath) {
  if (fs.existsSync(credsPath)) return;
  if (!global.SESSION_ID?.startsWith('nova~')) return;

  await initMega();

  const [fileID, key] = global.SESSION_ID.replace('nova~', '').split('#');
  if (!fileID || !key) {
    console.error('❌ SESSION_ID MEGA invalide');
    return;
  }

  console.log('⬇️ Téléchargement première session depuis MEGA...');
  const file = File.fromURL(`https://mega.nz/file/${fileID}#${key}`);

  await file.loadAttributes();

  const data = await new Promise((resolve, reject) =>
    file.download((err, d) => (err ? reject(err) : resolve(d)))
  );

  fs.writeFileSync(credsPath, data);
  console.log('✅ Session MEGA téléchargée (une seule fois)');
}