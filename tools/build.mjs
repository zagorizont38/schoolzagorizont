// Сборка сайта: content/site.json -> папка _site (её публикует GitHub Pages).
// Запуск: node tools/build.mjs [папка]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSite } from '../core/render.js';
import { validate } from '../core/validate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.argv[2] || '_site');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let content;
try {
  content = JSON.parse(rd('content/site.json'));
} catch (e) {
  console.error('Ошибка: content/site.json не читается как JSON.\n' + e.message);
  process.exit(1);
}
const { errors, warnings } = validate(content);
warnings.forEach((w) => console.log(`Предупреждение [${w.where}]: ${w.msg}`));
if (errors.length) {
  errors.forEach((e) => console.error(`ОШИБКА [${e.where}]: ${e.msg}`));
  console.error('Сборка остановлена, сайт остаётся в прежней версии.');
  process.exit(1);
}

const files = renderSite(content, { css: rd('assets/css/site.css'), js: rd('assets/js/site.js'), base: '' });

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const dir of ['assets', 'admin', 'core', 'content']) {
  if (fs.existsSync(path.join(ROOT, dir))) fs.cpSync(path.join(ROOT, dir), path.join(OUT, dir), { recursive: true });
}
for (const f of ['favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'CNAME', '.nojekyll']) {
  if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
}
for (const [name, data] of Object.entries(files)) {
  fs.mkdirSync(path.dirname(path.join(OUT, name)), { recursive: true });
  fs.writeFileSync(path.join(OUT, name), data);
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

const kb = (n) => (n / 1024).toFixed(1) + ' КБ';
console.log(`Готово: ${OUT}`);
for (const [name, data] of Object.entries(files)) if (!name.startsWith('sveden/') || name === 'sveden/index.html') console.log(`  ${name.padEnd(18)} ${kb(Buffer.byteLength(data))}`);
const svCount = Object.keys(files).filter((n) => n.startsWith('sveden/')).length;
if (svCount) console.log(`  + страниц «Сведений»: ${svCount}`);
