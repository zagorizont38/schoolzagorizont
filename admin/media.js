// Обработка картинок в браузере: поворот по EXIF, уменьшение, WebP в двух размерах.
// И хранилище неопубликованных файлов в IndexedDB, чтобы они не терялись при перезагрузке.
import { translit } from '../core/render.js';

export const IMG_DIR = 'assets/img';

function rand(n = 4) { return Math.random().toString(36).slice(2, 2 + n); }

async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    // запасной путь через <img>
    const url = URL.createObjectURL(file);
    try {
      const im = new Image();
      im.decoding = 'async';
      im.src = url;
      await im.decode();
      return im;
    } catch (e2) {
      throw new Error(`Не получилось открыть «${file.name}». Сохраните фото как JPG или PNG и загрузите снова (формат HEIC браузеры не читают).`);
    } finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
  }
}

function toBlob(canvas, type, q) {
  return new Promise((res) => canvas.toBlob(res, type, q));
}

// widths: какие ширины сделать. Ширина больше оригинала не делается.
export async function processImage(file, { widths = [640, 1280], quality = 0.82, keepPng = false, ogImage = false } = {}) {
  const src = await decode(file);
  const W = src.width, H = src.height;
  const base = translit(file.name.replace(/\.[^.]+$/, ''), 40) + '-' + rand();
  const out = [];
  let targets = ogImage ? [1200] : widths.filter((w) => w < W).concat(W <= Math.max(...widths) ? [W] : [Math.max(...widths)]);
  targets = [...new Set(targets)].sort((a, b) => a - b);
  for (const w of targets) {
    let cw = w, ch = Math.round(H * w / W), sx = 0, sy = 0, sw = W, sh = H;
    if (ogImage) { // обрезка ровно 1200×630
      cw = 1200; ch = 630;
      const r = 1200 / 630;
      if (W / H > r) { sw = Math.round(H * r); sx = Math.round((W - sw) / 2); } else { sh = Math.round(W / r); sy = Math.round((H - sh) / 2); }
    }
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    if (ogImage) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); }
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, cw, ch);
    let type = ogImage ? 'image/jpeg' : 'image/webp';
    let blob = await toBlob(canvas, type, ogImage ? 0.86 : quality);
    let ext = ogImage ? 'jpg' : 'webp';
    if (!ogImage && (!blob || blob.type !== 'image/webp')) { // Safari без WebP
      type = keepPng ? 'image/png' : 'image/jpeg'; ext = keepPng ? 'png' : 'jpg';
      blob = await toBlob(canvas, type, quality);
    }
    out.push({ path: `${IMG_DIR}/${base}-${cw}.${ext}`, blob, w: cw, h: ch });
  }
  if (keepPng) { // логотип: дополнительно PNG для разметки
    const last = out[out.length - 1];
    const canvas = document.createElement('canvas'); canvas.width = last.w; canvas.height = last.h;
    canvas.getContext('2d').drawImage(src, 0, 0, last.w, last.h);
    const png = await toBlob(canvas, 'image/png');
    out.push({ path: `${IMG_DIR}/${base}-${last.w}.png`, blob: png, w: last.w, h: last.h, extra: true });
  }
  if (src.close) src.close();
  const main = out.filter((v) => !v.extra);
  const big = main[main.length - 1];
  const value = {
    src: big.path,
    srcset: main.length > 1 ? main.map((v) => `${v.path} ${v.w}w`).join(', ') : '',
    w: big.w, h: big.h, alt: '',
  };
  if (keepPng) value.png = out[out.length - 1].path;
  return { variants: out, value, bytes: out.reduce((s, v) => s + v.blob.size, 0) };
}

export function readAsDataURL(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}
export async function blobToBase64(blob) {
  const d = await readAsDataURL(blob);
  return String(d).slice(String(d).indexOf(',') + 1);
}

// Все пути картинок, на которые ссылается контент
export function usedPaths(content) {
  const set = new Set();
  const walk = (x) => {
    if (typeof x === 'string') {
      const re = /assets\/[\w./-]+\.(?:webp|jpe?g|png|gif|svg|mp4|webm|pdf)/gi;
      let m; while ((m = re.exec(x))) set.add(m[0]);
      return;
    }
    if (Array.isArray(x)) return x.forEach(walk);
    if (x && typeof x === 'object') for (const k in x) walk(x[k]);
  };
  walk(content);
  return set;
}

// Группировка вариантов одной картинки: name-640.webp + name-1280.webp -> name
export function groupKey(path) {
  return String(path).replace(/-\d{2,4}\.(webp|jpe?g|png)$/i, '').replace(/\.(webp|jpe?g|png|gif|svg)$/i, '');
}

/* ---------- IndexedDB для неопубликованных файлов ---------- */
const DB = 'zg-admin', STORE = 'pending';
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
// IndexedDB может «зависнуть» (другая вкладка держит базу). Не даём ему блокировать публикацию.
const withTimeout = (p, ms = 4000) => Promise.race([p, new Promise((res) => setTimeout(() => res(undefined), ms))]);
async function tx(mode, fn) {
  const d = await withTimeout(db());
  if (!d) return undefined;
  return withTimeout(new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const st = t.objectStore(STORE);
    const out = fn(st);
    t.oncomplete = () => { d.close(); res(out && out.result !== undefined ? out.result : out); };
    t.onerror = () => { d.close(); rej(t.error); };
  }));
}
export const pendingStore = {
  async put(path, blob) { try { await tx('readwrite', (s) => s.put(blob, path)); } catch (e) { /* без IndexedDB просто не сохраняем */ } },
  async del(path) { try { await tx('readwrite', (s) => s.delete(path)); } catch (e) { } },
  async clear() { try { await tx('readwrite', (s) => s.clear()); } catch (e) { } },
  async all() {
    try {
      const d = await withTimeout(db());
      if (!d) return [];
      return (await withTimeout(new Promise((res, rej) => {
        const out = [];
        const t = d.transaction(STORE, 'readonly');
        const req = t.objectStore(STORE).openCursor();
        req.onsuccess = () => { const c = req.result; if (c) { out.push([c.key, c.value]); c.continue(); } else { d.close(); res(out); } };
        req.onerror = () => { d.close(); rej(req.error); };
      }))) || [];
    } catch (e) { return []; }
  },
};
