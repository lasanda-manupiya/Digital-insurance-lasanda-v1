// Copies the web-ifc WASM binary into public/wasm/ so the browser can load it.
// Runs automatically after npm install (postinstall).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'node_modules', 'web-ifc');
const outDir = path.join(__dirname, '..', 'public', 'wasm');

mkdirSync(outDir, { recursive: true });
for (const file of ['web-ifc.wasm', 'web-ifc-mt.wasm']) {
  const src = path.join(srcDir, file);
  if (existsSync(src)) {
    copyFileSync(src, path.join(outDir, file));
    console.log(`Copied ${file} -> public/wasm/`);
  }
}
