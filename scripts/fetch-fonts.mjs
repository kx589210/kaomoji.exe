// Downloads the OFL fonts listed in src/engine/fonts.ts, with their license texts.
//   node scripts/fetch-fonts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONT_FILES } from '../src/engine/fonts.ts';

const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(KX, 'public');
fs.mkdirSync(path.join(pub, 'fonts', 'licenses'), { recursive: true });

const get = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

for (const f of FONT_FILES) {
  const dest = path.join(pub, f.file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 10_000) {
    console.log(`have  ${f.file}`);
  } else {
    fs.writeFileSync(dest, await get(f.url));
    console.log(`fetch ${f.file}  (${(fs.statSync(dest).size / 1024).toFixed(0)} KiB)`);
  }
  const license = path.join(pub, 'fonts', 'licenses', `${path.basename(f.file, '.ttf')}.txt`);
  if (!fs.existsSync(license)) {
    const parts = await Promise.all(f.licenses.map(async (u) => `==== ${u}\n\n${(await get(u)).toString('utf8')}`));
    fs.writeFileSync(license, `${f.family} — ${f.url}\n\n${parts.join('\n\n')}`);
  }
}
