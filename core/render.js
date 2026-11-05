// Рендерер сайта «За горизонт».
// Превращает content/site.json в готовые файлы: index.html, 404.html, robots.txt, sitemap.xml, llms.txt, site.webmanifest.
// Один и тот же код работает в браузере (предпросмотр в админке) и в Node (сборка на GitHub Actions).
import { icon, SEED_SYMBOL } from './icons.js';

/* ---------- Утилиты ---------- */
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const has = (s) => s !== undefined && s !== null && String(s).trim() !== '';
const arr = (a) => (Array.isArray(a) ? a : []);

export function safeUrl(u) {
  const s = String(u ?? '').trim();
  if (!s) return '';
  if (/^(javascript|vbscript|data):/i.test(s)) return '';
  return s;
}

// Простая разметка в текстах: **жирный**, [ссылка](https://...), перенос строки.
export function md(s) {
  const links = [];
  const raw = String(s ?? '').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
    links.push([txt, url]);
    return `\u0001${links.length - 1}\u0001`;
  });
  let t = esc(raw).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  t = t.replace(/\u0001(\d+)\u0001/g, (m, i) => {
    const [txt, url] = links[+i];
    const u = safeUrl(url);
    const ext = /^https?:/i.test(u);
    return `<a href="${esc(u)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(txt).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</a>`;
  });
  return t;
}
// Текст без разметки (для мета-тегов и микроразметки)
export function plain(s) {
  return String(s ?? '').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\s*\n\s*/g, ' ').trim();
}
// Абзацы: разделяются пустой строкой
export function paras(s, cls = '') {
  return String(s ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p${cls ? ` class="${cls}"` : ''}>${md(p)}</p>`).join('');
}

const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
export function translit(s, max = 60) {
  return String(s ?? '').toLowerCase().split('').map((c) => (c in TR ? TR[c] : c)).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/, '') || 'item';
}

const safeColor = (c, def = '#7C875B') => (/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|[a-z]{3,20})$/i.test(String(c || '').trim()) ? String(c).trim() : def);
const pad2 = (n) => String(n).padStart(2, '0');
const dl = (i) => (i % 4 ? ` d${i % 4}` : '');

/* ---------- Переменные {{...}} ---------- */
export function tokenMap(c, now = new Date()) {
  const o = c.org || {}, l = o.links || {}, r = o.rating || {}, a = o.address || {};
  const t = {
    name: o.name, price: o.priceDisplay, phone: o.phone, tel: o.tel, phone2: o.phone2, tel2: o.tel2, email: o.email,
    address: a.short, hours: o.hoursText, classSize: o.classSize, grades: o.grades, director: o.director && o.director.name,
    gis: l.gis, vk: l.vk, max: l.max, telegram: l.telegram, yandexMaps: l.yandexMaps,
    rating: r.value, ratingCount: r.count, reviewsCount: r.reviews,
    year: String(now.getFullYear()), domain: c.site && c.site.domain,
    legalName: o.legalName, inn: o.inn, ogrn: o.ogrn, license: o.license,
  };
  for (const v of arr(c.vars)) if (v && v.key) t[v.key] = v.value;
  return t;
}
function applyTokens(x, t) {
  if (typeof x === 'string') return x.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (m, k) => (k in t ? String(t[k] ?? '') : m));
  if (Array.isArray(x)) return x.map((v) => applyTokens(v, t));
  if (x && typeof x === 'object') { const o = {}; for (const k in x) o[k] = applyTokens(x[k], t); return o; }
  return x;
}

/* ---------- Картинки ---------- */
function makeAsset(opts) {
  const base = opts.base || '';
  return (p) => {
    const s = String(p || '');
    if (!s || /^(https?:|data:|blob:|\/\/)/i.test(s)) return s;
    if (opts.asset) { const r = opts.asset(s); if (r) return r; }
    return base + s.replace(/^\//, '');
  };
}
function imgTag(A, im, { cls = '', sizes = '', eager = false, extra = '' } = {}) {
  if (!im || !im.src) return '';
  const set = has(im.srcset) ? im.srcset.split(',').map((p) => { const [u, w] = p.trim().split(/\s+/); return `${A(u)} ${w || ''}`.trim(); }).join(', ') : '';
  return `<img${cls ? ` class="${cls}"` : ''} src="${esc(A(im.src))}"${set ? ` srcset="${esc(set)}"` : ''}${set && sizes ? ` sizes="${sizes}"` : ''}${im.w ? ` width="${+im.w}"` : ''}${im.h ? ` height="${+im.h}"` : ''} alt="${esc(im.alt || '')}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}${extra}>`;
}

/* ---------- Общие куски разметки ---------- */
function eyebrow(text, { sprig = false, cls = 'reveal' } = {}) {
  if (!has(text)) return '';
  return `<span class="eyebrow${cls ? ' ' + cls : ''}"><span class="rule"></span>${sprig ? `<span class="sprig" aria-hidden="true">${icon('sprout', 20, 1.4)}</span>` : ''}${esc(text)}<span class="rule r"></span></span>`;
}
function secHead(s, { sprig = false } = {}) {
  return `<div class="sec-head center">${eyebrow(s.eyebrow, { sprig })}${has(s.title) ? `<h2 class="reveal d1">${md(s.title)}</h2>` : ''}${has(s.text) ? `<p class="reveal d2">${md(s.text)}</p>` : ''}</div>`;
}
const WASH = {
  hero: '<span class="wash moss" style="width:520px;height:520px;top:-140px;left:-160px;opacity:.5" aria-hidden="true"></span><span class="wash river" style="width:420px;height:420px;bottom:-160px;left:22%;opacity:.45" aria-hidden="true"></span>',
  cards3: '<span class="wash sand" style="width:520px;height:520px;top:-180px;right:-160px" aria-hidden="true"></span>',
  director: '<span class="wash river" style="width:460px;height:460px;top:-160px;left:-170px;opacity:.4" aria-hidden="true"></span>',
  life: '<span class="wash moss" style="width:440px;height:440px;top:5%;left:-190px;opacity:.4" aria-hidden="true"></span>',
  subjects: '<span class="wash river" style="width:460px;height:460px;bottom:-160px;right:-190px;opacity:.35" aria-hidden="true"></span>',
  perks: '<span class="wash river" style="width:480px;height:480px;bottom:-180px;left:-180px;opacity:.4" aria-hidden="true"></span>',
  awards: '<span class="wash sand" style="width:520px;height:520px;top:-190px;left:-170px" aria-hidden="true"></span>',
  env: '<span class="wash moss" style="width:440px;height:440px;top:-120px;right:-160px;opacity:.4" aria-hidden="true"></span>',
  day: '<span class="wash sand" style="width:420px;height:420px;top:12%;right:-170px;opacity:.5" aria-hidden="true"></span>',
  reviews: '<span class="wash sand" style="width:440px;height:440px;bottom:-160px;left:-160px;opacity:.5" aria-hidden="true"></span>',
  faq: '<span class="wash moss" style="width:420px;height:420px;top:-140px;right:-160px;opacity:.35" aria-hidden="true"></span>',
  contacts: '<span class="wash moss" style="width:460px;height:460px;bottom:-180px;right:-140px;opacity:.45" aria-hidden="true"></span>',
  text: '<span class="wash sand" style="width:420px;height:420px;top:-150px;left:-160px;opacity:.4" aria-hidden="true"></span>',
};
const BASECLS = { cards3: 'safety', director: 'director', life: 'life', subjects: 'subjects', perks: 'perks', docs: 'docs', awards: 'awards', env: 'env', day: 'day', steps: 'steps', talents: 'talents', reviews: 'reviews', faq: 'faq', contacts: 'contacts', text: 'textsec', html: 'htmlsec' };
const DEFAULT_BG = { faq: 'deep' };
function wrap(s, inner) {
  const bg = s.bg && s.bg !== 'auto' ? s.bg : DEFAULT_BG[s.type];
  const cls = `${BASECLS[s.type] || s.type} pad${bg ? ' bg-' + bg : ''}`;
  return `<section class="${cls}"${has(s.id) ? ` id="${esc(s.id)}"` : ''}>${s.decor === false ? '' : (WASH[s.type] || '')}<div class="container">${inner}</div></section>`;
}
// Префикс для внутренних ссылок на вложенных страницах (sveden/...): '#safety' -> '../#safety'
let PRE = '';
export function fixHref(h) {
  const u = safeUrl(h);
  if (!PRE || !u || /^(https?:|tel:|mailto:|\/\/|\/)/i.test(u)) return u;
  return PRE + u;
}
function linkAttrs(href) {
  const u = fixHref(href);
  return `href="${esc(u)}"${/^https?:/i.test(u) ? ' target="_blank" rel="noopener noreferrer"' : ''}`;
}

/* ---------- Разделы ---------- */
const R = {};

R.hero = (s, c, A) => {
  const logo = c.org.logo || {};
  const v = s.video || {};
  const seeds = [1, 2, 3, 4, 5, 6].map((n) => `<span class="seed s${n}"><svg viewBox="0 0 34 58"><use href="#dseed"/></svg></span>`).join('');
  return `<section class="hero"${has(s.id) ? ` id="${esc(s.id)}"` : ''}>${WASH.hero}<div class="seeds" aria-hidden="true">${seeds}</div><div class="container">`
    + (arr(s.badges).length ? `<div class="hero-badges reveal">${arr(s.badges).map((b) => `<span class="hbadge"><span class="bi" aria-hidden="true">${icon(b.icon, 15, 1.8)}</span>${md(b.text)}</span>`).join('')}</div>` : '')
    + `<div class="hero-grid"><div class="hero-copy"><h1 class="reveal d1">`
    + `<img class="logo-hero" src="${esc(A(logo.src))}" width="${+logo.w || 840}" height="${+logo.h || 409}" alt="${esc(logo.alt || c.org.name)}" fetchpriority="high">`
    + (has(s.slogan) ? `<span class="stage-line">${md(s.slogan)}</span>` : '')
    + (has(s.h1sub) ? `<span class="h1-sub">${md(s.h1sub)}</span>` : '')
    + `</h1>`
    + (has(s.lead) ? `<p class="lead reveal d2">${md(s.lead)}</p>` : '')
    + (has(s.sub) ? `<p class="sub reveal d2">${md(s.sub)}</p>` : '')
    + `<div class="hero-actions reveal d3">`
    + (s.primary && has(s.primary.label) ? `<a ${linkAttrs(s.primary.href)} class="btn btn-primary">${esc(s.primary.label)} ${icon('arrow', 18, 2)}</a>` : '')
    + (s.secondary && has(s.secondary.label) ? `<a ${linkAttrs(s.secondary.href)} class="btn btn-quiet">${esc(s.secondary.label)}</a>` : '')
    + `</div>`
    + (arr(s.chips).length ? `<div class="hero-chips reveal d4">${arr(s.chips).map((ch) => `<div class="chip"><div class="n">${md(ch.n)}</div><div class="t">${md(ch.t)}</div></div>`).join('')}</div>` : '')
    + (has(s.incl) ? `<p class="hero-incl reveal d4">${md(s.incl)}</p>` : '')
    + (has(s.place) ? `<p class="hero-place reveal d4">${icon('pin', 16, 1.8)}<span>${md(s.place)}</span></p>` : '')
    + `</div><div class="hero-visual"><div class="hero-stage" aria-hidden="true">`
    + (has(v.src) || has(v.poster) ? `<video id="heroVideo" muted loop playsinline disablepictureinpicture preload="none"${has(v.poster) ? ` poster="${esc(A(v.poster))}"` : ''}${has(v.src) ? ` data-src="${esc(A(v.src))}"` : ''}></video>` : '')
    + `</div></div></div></div></section>`;
};

R.cards3 = (s, c, A) => wrap(s, secHead(s, { sprig: true })
  + `<div class="safe-grid">${arr(s.cards).map((k, i) => `<article class="safe-card reveal${dl(i)}">`
    + (k.image && k.image.src ? `<div class="safe-photo">${imgTag(A, k.image, { sizes: '(max-width: 980px) 92vw, 380px' })}</div>` : '')
    + `<div class="safe-body"${k.image && k.image.src ? '' : ' style="padding-top:2.1rem"'}><span class="badge" aria-hidden="true">${icon(k.icon, 24, 1.6)}</span><h3>${md(k.title)}</h3>${paras(k.text)}${has(k.pull) ? `<p class="pull">${md(k.pull)}</p>` : ''}</div></article>`).join('')}</div>`);

R.director = (s, c, A) => wrap(s, `<div class="dir-wrap">`
  + (s.image && s.image.src ? `<div class="dir-media reveal"><div class="frame">${imgTag(A, s.image, { sizes: '(max-width: 1100px) 92vw, 520px' })}</div></div>` : '')
  + `<div class="dir-body reveal d1">${eyebrow(s.eyebrow, { cls: '' })}<span class="quote-mark" aria-hidden="true">“</span>`
  + arr(s.paragraphs).map((p) => `<p${p.soft ? ' class="soft"' : ''}>${md(p.text)}</p>`).join('')
  + `<div class="dir-sign"><div class="who"><div class="nm">${esc(s.name)}</div><div class="role">${md(s.role)}</div></div></div></div></div>`);

R.life = (s, c, A) => wrap(s, secHead(s) + `<div class="life-grid">${arr(s.cards).map((k, i) => `<article class="life-card reveal${dl(i)}">${imgTag(A, k.image, { sizes: '(max-width: 980px) 92vw, 600px' })}<span class="veil" aria-hidden="true"></span><div class="life-body"><h3>${md(k.title)}</h3><p>${md(k.text)}</p>${arr(k.tags).length ? `<div class="life-tags">${arr(k.tags).map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div></article>`).join('')}</div>`);

R.subjects = (s) => wrap(s, secHead(s) + `<div class="subj-grid">${arr(s.items).map((it, i) => `<div class="subj reveal${dl(i % 3)}" tabindex="0"><span class="ico" aria-hidden="true">${icon(it.icon, 20, 1.6)}</span><div><h3 class="nm">${esc(it.name)}</h3><p class="why">${md(it.why)}</p></div></div>`).join('')}</div>`);

R.perks = (s) => {
  const items = arr(s.items);
  const a = s.accent || {};
  return wrap(s, secHead(s) + `<div class="perks-grid">${items.map((p, i) => `<article class="perk reveal${dl(i)}"><div class="num">${pad2(i + 1)}</div><h3>${md(p.title)}</h3><p>${md(p.text)}</p></article>`).join('')}`
    + (a.enabled !== false && has(a.title) ? `<article class="perk accent reveal${dl(items.length)}"><div class="accent-main"><div class="num">${pad2(items.length + 1)}</div><h3>${md(a.title)}</h3><p>${md(a.text)}</p>${arr(a.list).length ? `<ul class="accent-list">${arr(a.list).map((li) => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}</div>${has(a.price) ? `<div class="price">${esc(a.price)}</div>` : ''}</article>` : '')
    + `</div>`);
};

R.docs = (s, c, A) => wrap(s, `<div class="docs-card reveal">`
  + (s.gerb && s.gerb.src ? `<img class="gerb" src="${esc(A(s.gerb.src))}" width="${+s.gerb.w || 420}" height="${+s.gerb.h || 462}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : '')
  + `<div class="docs-inner"><div class="docs-lead">`
  + (has(s.eyebrow) ? `<span class="eyebrow" style="color:var(--navy)"><span class="rule" style="background:linear-gradient(90deg,transparent,var(--navy))"></span>${esc(s.eyebrow)}<span class="rule r" style="background:linear-gradient(90deg,var(--navy),transparent)"></span></span>` : '')
  + (has(s.title) ? `<h2 style="margin-top:1rem">${md(s.title)}</h2>` : '') + (has(s.text) ? `<p>${md(s.text)}</p>` : '')
  + `</div><div class="docs-points">${arr(s.points).map((p) => `<div class="docs-point${p.warm ? ' warm' : ''}"><span class="ic" aria-hidden="true">${icon(p.icon, 21, 1.7)}</span><div><h3 class="k">${md(p.title)}</h3><p class="v">${md(p.text)}</p></div></div>`).join('')}</div></div></div>`);

R.awards = (s, c, A) => wrap(s, secHead(s)
  + (arr(s.stats).length ? `<div class="aw-strip reveal d2">${arr(s.stats).map((st) => `<div class="aw-stat"><span class="ic" aria-hidden="true">${icon(st.icon, 20, 1.7)}</span><span class="t"><b>${esc(st.bold)}</b>${esc(st.text)}</span></div>`).join('')}</div>` : '')
  + `<div class="aw-grid">${arr(s.items).map((a, i) => `<button class="aw reveal${dl(i % 3)}" type="button" data-aw="${i}" data-title="${esc(plain(a.title))}" data-sub="${esc(plain(a.caption))}" data-full="${esc(A(a.image && a.image.src))}" aria-label="Открыть документ: ${esc(plain(a.title))}">`
    + `<span class="aw-shot">${imgTag(A, a.image, { sizes: '(max-width: 640px) 92vw, 360px' })}<span class="aw-zoom" aria-hidden="true">${icon('zoom', 17, 1.9)}</span></span>`
    + `<span class="aw-body"><span class="aw-meta">${esc(a.kind)}${has(a.year) ? `<span class="dot" aria-hidden="true"></span><span class="yr">${esc(a.year)}</span>` : ''}</span><span class="aw-h">${md(a.title)}</span><span class="aw-p">${md(a.text)}</span></span></button>`).join('')}</div>`
  + (has(s.note) ? `<p class="aw-note reveal">${md(s.note)}</p>` : ''));

R.env = (s, c, A) => wrap(s, `<div class="env-wrap"><div class="env-copy">${eyebrow(s.eyebrow)}`
  + (has(s.title) ? `<h2 class="reveal d1" style="margin-top:1.1rem">${md(s.title)}</h2>` : '')
  + (has(s.lead) ? `<p class="lead reveal d1" style="margin-top:1.2rem">${md(s.lead)}</p>` : '')
  + (arr(s.list).length ? `<ul class="env-list reveal d2">${arr(s.list).map((t) => `<li><span class="tick" aria-hidden="true">${icon('check', 13, 3)}</span><span>${md(t)}</span></li>`).join('')}</ul>` : '')
  + `</div><div class="env-bento reveal d1">${['b1', 'b2', 'b3'].map((b, i) => { const im = arr(s.images)[i]; return im && im.src ? `<figure class="${b}">${imgTag(A, im, { sizes: '(max-width: 1100px) 46vw, 340px' })}</figure>` : ''; }).join('')}</div></div>`);

R.day = (s) => wrap(s, secHead(s)
  + (arr(s.stats).length ? `<div class="day-stats reveal d1">${arr(s.stats).map((st) => `<div class="day-stat${st.zero ? ' zero' : ''}"><div class="v">${esc(st.v)}</div><div class="l">${esc(st.l)}</div></div>`).join('')}</div>` : '')
  + `<ol class="day-line-wrap" style="list-style:none">${arr(s.items).map((it) => `<li class="day-item reveal" style="--c:${safeColor(it.color)}"><div class="day-row"><div class="t"><time>${esc(it.time)}</time></div><div><h3>${md(it.title)}</h3><p>${md(it.text)}</p>${arr(it.chips).length ? `<div class="day-chips">${arr(it.chips).map((ch) => `<span>${esc(ch)}</span>`).join('')}</div>` : ''}</div></div></li>`).join('')}</ol>`
  + (has(s.note) ? `<p class="day-note reveal">${md(s.note)}</p>` : ''));

R.steps = (s) => wrap(s, secHead(s) + `<ol class="steps-grid" style="list-style:none">${arr(s.items).map((st, i) => `<li class="step reveal${dl(i)}"><div class="no" aria-hidden="true">${i + 1}</div><h3>${md(st.title)}</h3><p>${md(st.text)}</p></li>`).join('')}</ol>`);

R.talents = (s, c, A) => wrap(s, secHead(s) + `<div class="tal-grid">${arr(s.items).map((t, i) => `<article class="tal reveal${dl(i)}">${t.image && t.image.src ? `<div class="tal-photo">${imgTag(A, t.image, { sizes: '(max-width: 980px) 92vw, 380px' })}</div>` : ''}<div class="tal-body"><h3>${md(t.title)}</h3><p>${md(t.text)}</p></div></article>`).join('')}</div>`);

R.reviews = (s, c) => {
  const r = c.org.rating || {};
  const badge = has(r.value) ? `<a class="rev-badge reveal d2" ${linkAttrs(r.url || c.org.links.gis)} aria-label="${esc(`Рейтинг ${r.value} из ${r.best || 5} на ${r.source}: ${r.count}, ${r.reviews}`)}"><span class="score">${esc(r.value)}</span><span><span class="stars" aria-hidden="true">★★★★★</span><span class="cap"><b>Рейтинг на ${esc(r.source)}</b>${esc([r.count, r.reviews].filter(has).join(', '))}</span></span></a>` : '';
  const head = `<div class="sec-head center">${eyebrow(s.eyebrow)}${has(s.title) ? `<h2 class="reveal d1">${md(s.title)}</h2>` : ''}${has(s.text) ? `<p class="reveal d2">${md(s.text)}</p>` : ''}${badge}</div>`;
  return wrap(s, head + `<div class="rev-grid">${arr(s.items).map((rv, i) => `<figure class="rev reveal${dl(i % 3)}"><div class="rstars" aria-hidden="true">${'★'.repeat(Math.max(1, Math.min(5, +rv.stars || 5)))}</div><blockquote><p>«${md(rv.text)}»</p></blockquote><figcaption class="who"><span class="ava" aria-hidden="true">${esc((rv.name || '?').trim().charAt(0))}</span><span><span class="nm">${esc(rv.name)}</span><br><span class="src">${esc(rv.source)}</span></span></figcaption></figure>`).join('')}</div>`
    + (has(s.allLabel) && has(r.url || c.org.links.gis) ? `<div class="rev-all reveal"><a class="btn btn-quiet" ${linkAttrs(r.url || c.org.links.gis)}>${esc(s.allLabel)} ${icon('external', 17, 2)}</a></div>` : ''));
};

export function faqId(q) { return 'q-' + translit(plain(q), 48); }
R.faq = (s) => {
  const items = arr(s.items).filter((f) => f && f.enabled !== false && has(f.q));
  return wrap(s, secHead(s) + `<div class="faq-list">${items.map((f, i) => `<details class="faq-item reveal" id="${faqId(f.q)}"${i === 0 ? ' open' : ''}><summary><h3>${md(f.q)}</h3><span class="pm" aria-hidden="true">${icon('plus', 16, 2)}</span></summary><div class="faq-a">${paras(f.a)}</div></details>`).join('')}</div>`
    + (has(s.more) ? `<p class="faq-more reveal">${md(s.more)}</p>` : ''));
};

R.contacts = (s) => wrap(s, `<div class="cont-grid"><div>${eyebrow(s.eyebrow)}`
  + (has(s.title) ? `<h2 class="reveal d1" style="margin-top:1.1rem">${md(s.title)}</h2>` : '')
  + (has(s.lead) ? `<p class="lead reveal d1" style="margin-top:1.2rem">${md(s.lead)}</p>` : '')
  + (has(s.script) ? `<p class="script reveal d2" style="font-size:1.6rem;color:var(--moss);margin-top:1.2rem">${md(s.script)}</p>` : '')
  + (s.button && has(s.button.label) ? `<a ${linkAttrs(s.button.href)} class="btn btn-primary reveal d3" style="margin-top:1.8rem">${esc(s.button.label)} ${icon('phone', 18, 2)}</a>` : '')
  + `</div><address class="cont-card reveal d1">${arr(s.items).filter((it) => has(it.k) || has(it.v)).map((it) => {
    const tag = has(it.href) ? 'a' : 'div';
    return `<${tag} class="cont-item"${tag === 'a' ? ' ' + linkAttrs(it.href) : ''}><span class="ic" aria-hidden="true">${icon(it.icon, 21, 1.7)}</span><span><span class="k">${md(it.k)}</span><br><span class="v">${md(it.v)}</span></span></${tag}>`;
  }).join('')}</address></div>`);

R.text = (s, c, A) => wrap(s, secHead({ eyebrow: s.eyebrow, title: s.title }) + (has(s.body) ? `<div class="tx reveal">${paras(s.body)}</div>` : '')
  + (s.image && s.image.src ? `<figure class="tx-img reveal">${imgTag(A, s.image, { sizes: '(max-width: 1000px) 92vw, 980px' })}</figure>` : ''));

R.html = (s) => wrap(s, String(s.html || ''));

export const SECTION_TYPES = Object.keys(R);

/* ---------- Шапка, подвал, лайтбокс ---------- */
function headerHtml(c, A) {
  const h = c.header || {}, o = c.org, logo = o.logo || {};
  const logoImg = (w, hh, eager) => `<img class="logo-mark" src="${esc(A(logo.src))}" width="${w}" height="${hh}" alt="${esc(logo.alt || o.name)}"${eager ? '' : ' loading="lazy" decoding="async"'} style="width:${w}px;height:${hh}px">`;
  const top = arr(c.sections).find((s) => s.type === 'hero' && s.enabled !== false);
  const topHref = top && has(top.id) ? '#' + top.id : '#main';
  return `<header id="header"><div class="container"><nav class="nav" aria-label="Основное меню"><a href="${esc(fixHref(topHref))}" class="brand" aria-label="${esc(o.name)}: в начало страницы">${logoImg(107, 52, true)}</a>`
    + `<ul class="nav-links">${arr(h.nav).map((n) => `<li><a ${linkAttrs(n.href)}>${esc(n.label)}</a></li>`).join('')}</ul>`
    + `<div class="nav-cta">${h.showPhone !== false && has(o.phone) ? `<a href="tel:${esc(o.tel)}" class="nav-phone">${esc(o.phone)}</a>` : ''}`
    + (h.cta && has(h.cta.label) ? `<a ${linkAttrs(h.cta.href)} class="btn btn-primary">${esc(h.cta.label)}</a>` : '')
    + `<button class="menu-toggle" id="menuToggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobileMenu">${icon('menu', 24, 1.8)}</button></div></nav></div></header>`
    + `<div class="mobile-menu" id="mobileMenu" aria-hidden="true"><button class="mobile-close" id="mobileClose" type="button" aria-label="Закрыть меню">${icon('close', 26, 1.8)}</button>`
    + arr(h.mobileNav).map((n) => `<a ${linkAttrs(n.href)} data-close>${esc(n.label)}</a>`).join('')
    + (has(o.phone) ? `<a href="tel:${esc(o.tel)}" data-close>${esc(o.phone)}</a>` : '')
    + (h.mobileCta && has(h.mobileCta.label) ? `<a ${linkAttrs(h.mobileCta.href)} class="btn btn-primary" data-close>${esc(h.mobileCta.label)}</a>` : '')
    + `</div>`;
}
function legalLine(o) {
  const parts = [];
  if (has(o.legalName)) parts.push(esc(o.legalName));
  if (has(o.inn)) parts.push('ИНН ' + esc(o.inn));
  if (has(o.ogrn)) parts.push('ОГРН ' + esc(o.ogrn));
  if (has(o.license)) parts.push((has(o.licenseUrl) ? `<a ${linkAttrs(o.licenseUrl)}>${esc(o.license)}</a>` : esc(o.license)) + (has(o.licenseNote) ? ` (${esc(o.licenseNote)})` : ''));
  return parts.join(' · ');
}
function footerHtml(c, A) {
  const f = c.footer || {}, o = c.org, logo = o.logo || {}, a = o.address || {};
  const top = arr(c.sections).find((s) => s.type === 'hero' && s.enabled !== false);
  const legal = legalLine(o);
  const svOn = c.sveden && c.sveden.enabled !== false && arr(c.sveden.pages).length;
  return `<footer><div class="container"><div class="foot-top"><div class="foot-brand"><a href="${esc(fixHref(top && has(top.id) ? '#' + top.id : '#main'))}" class="brand" aria-label="${esc(o.name)}: в начало страницы"><img class="logo-mark" src="${esc(A(logo.src))}" width="119" height="58" alt="${esc(logo.alt || o.name)}" loading="lazy" decoding="async" style="width:119px;height:58px"></a>`
    + (has(f.about) ? `<p>${md(f.about)}</p>` : '')
    + (f.showAddress !== false && has(a.short) ? `<address class="foot-addr">${esc(a.short)}${has(a.floor) ? ', ' + esc(a.floor) : ''}${has(o.phone) ? `<br><a href="tel:${esc(o.tel)}">${esc(o.phone)}</a>` : ''}${has(o.hoursText) ? `<br>${esc(o.hoursText)}` : ''}</address>` : '')
    + `</div>${arr(f.columns).map((col) => `<div class="foot-col"><h4>${esc(col.title)}</h4>${arr(col.links).map((l) => `<a ${linkAttrs(l.href)}>${esc(l.label)}</a>`).join('')}</div>`).join('')}</div>`
    + (legal || svOn ? `<div class="foot-legal">${legal}${svOn ? `${legal ? ' · ' : ''}<a href="${esc(fixHref('sveden/'))}">Сведения об образовательной организации</a>` : ''}</div>` : '')
    + `<div class="foot-bottom">${has(f.copyright) ? `<p>${md(f.copyright)}</p>` : ''}${has(f.note) ? `<p>${md(f.note)}</p>` : ''}${f.credit && has(f.credit.label) ? `<a class="credit" ${linkAttrs(f.credit.href)}>${esc(f.credit.label)}</a>` : ''}</div></div></footer>`;
}
const LIGHTBOX = `<div class="aw-lb" id="awLb" role="dialog" aria-modal="true" aria-labelledby="awLbTitle" hidden><button class="aw-lb-btn aw-lb-close" id="awLbClose" type="button" aria-label="Закрыть">${icon('close', 24, 1.8)}</button><button class="aw-lb-btn aw-lb-prev" id="awLbPrev" type="button" aria-label="Предыдущий документ">${icon('chevronLeft', 24, 1.8)}</button><button class="aw-lb-btn aw-lb-next" id="awLbNext" type="button" aria-label="Следующий документ">${icon('chevronRight', 24, 1.8)}</button><div class="aw-lb-inner"><img id="awLbImg" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt=""><div class="aw-lb-cap"><b id="awLbTitle"></b><span id="awLbSub"></span></div></div></div>`;

/* ---------- Микроразметка Schema.org ---------- */
const DAYS = { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' };
export function jsonLd(c, abs) {
  const o = c.org, a = o.address || {}, l = o.links || {}, seo = c.seo || {};
  const url = c.site.url;
  const sec = (t) => arr(c.sections).find((s) => s.type === t && s.enabled !== false);
  const hero = sec('hero'), faq = sec('faq');
  const images = [];
  const pushImg = (im) => { if (im && im.src) images.push(abs(im.src)); };
  pushImg(seo.ogImage); arr(sec('life') && sec('life').cards).forEach((k) => pushImg(k.image)); arr(sec('talents') && sec('talents').items).forEach((k) => pushImg(k.image));
  const school = {
    '@type': ['School', 'LocalBusiness'],
    '@id': url + '#school',
    name: o.name,
    alternateName: arr(o.alternateNames).concat(has(o.fullName) ? [o.fullName] : []),
    description: plain(o.descriptor) + '. ' + plain(seo.description),
    url,
    logo: abs(o.logo && (o.logo.png || o.logo.src)),
    image: images.slice(0, 6),
    telephone: [o.tel, o.tel2].filter(has),
    address: {
      '@type': 'PostalAddress',
      streetAddress: [a.microdistrict, a.street, a.floor].filter(has).join(', '),
      addressLocality: a.locality, addressRegion: a.region, postalCode: a.postalCode, addressCountry: 'RU',
    },
    geo: o.geo && o.geo.lat ? { '@type': 'GeoCoordinates', latitude: +o.geo.lat, longitude: +o.geo.lng } : undefined,
    hasMap: l.gis || l.yandexMaps || undefined,
    openingHoursSpecification: arr(o.hours).filter((h) => arr(h.days).length && h.opens).map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: arr(h.days).map((d) => 'https://schema.org/' + (DAYS[d] || d)), opens: h.opens, closes: h.closes })),
    priceRange: has(o.priceDisplay) ? `${o.priceDisplay} в ${o.pricePeriod || 'месяц'}` : undefined,
    currenciesAccepted: 'RUB',
    paymentAccepted: o.paymentAccepted || undefined,
    areaServed: arr(seo.areaServed).filter(has).map((n) => ({ '@type': 'Place', name: n })),
    knowsAbout: arr(seo.knowsAbout).filter(has),
    slogan: hero ? plain(hero.slogan) : undefined,
    sameAs: [l.gis, l.vk, l.max, l.telegram, l.yandexMaps].filter(has),
    email: has(o.email) ? o.email : undefined,
    legalName: has(o.legalName) ? o.legalName : undefined,
    taxID: has(o.inn) ? o.inn : undefined,
    hasCredential: has(o.license) ? { '@type': 'EducationalOccupationalCredential', credentialCategory: 'Лицензия на осуществление образовательной деятельности', name: plain(o.license) + (has(o.licenseNote) ? ` (${plain(o.licenseNote)})` : ''), url: has(o.licenseUrl) ? o.licenseUrl : undefined, recognizedBy: { '@type': 'GovernmentOrganization', name: 'Министерство образования Иркутской области' } } : undefined,
    identifier: has(o.ogrn) ? { '@type': 'PropertyValue', propertyID: 'ОГРН', value: o.ogrn } : undefined,
    foundingDate: has(o.foundingYear) ? String(o.foundingYear) : undefined,
    employee: o.director && has(o.director.name) ? { '@type': 'Person', '@id': url + '#director', name: o.director.name, jobTitle: 'Директор', image: o.director.image && o.director.image.src ? abs(o.director.image.src) : undefined, worksFor: { '@id': url + '#school' } } : undefined,
    makesOffer: has(o.priceValue) ? {
      '@type': 'Offer',
      name: `Обучение в начальной школе полного дня, ${o.grades || '1–4 класс'}`,
      price: +o.priceValue, priceCurrency: 'RUB',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: +o.priceValue, priceCurrency: 'RUB', unitText: o.pricePeriod || 'месяц' },
      availability: 'https://schema.org/InStock',
      url: url + '#perks',
    } : undefined,
  };
  const graph = [
    school,
    { '@type': 'WebSite', '@id': url + '#website', url, name: o.name, inLanguage: 'ru-RU', publisher: { '@id': url + '#school' } },
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: plain(seo.title), description: plain(seo.description), inLanguage: 'ru-RU', isPartOf: { '@id': url + '#website' }, about: { '@id': url + '#school' }, primaryImageOfPage: seo.ogImage && seo.ogImage.src ? { '@type': 'ImageObject', url: abs(seo.ogImage.src) } : undefined, dateModified: c.updated },
  ];
  if (faq) {
    const qs = arr(faq.items).filter((f) => f && f.enabled !== false && has(f.q) && has(f.a));
    if (qs.length) graph.push({ '@type': 'FAQPage', '@id': url + '#faq', isPartOf: { '@id': url + '#webpage' }, mainEntity: qs.map((f) => ({ '@type': 'Question', name: plain(f.q), acceptedAnswer: { '@type': 'Answer', text: plain(f.a) } })) });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, (k, v) => (v === undefined || (Array.isArray(v) && !v.length) ? undefined : v)).replace(/</g, '\\u003c');
}

/* ---------- llms.txt: краткая справка для нейросетей ---------- */
export function llmsTxt(c) {
  const o = c.org, a = o.address || {}, l = o.links || {}, r = o.rating || {}, seo = c.seo || {};
  const sec = (t) => arr(c.sections).find((s) => s.type === t && s.enabled !== false);
  const L = [];
  L.push(`# ${o.name}`, '');
  L.push(`> ${plain(o.descriptor)}. ${a.short}${has(a.floor) ? ', ' + a.floor : ''}. Сайт: https://${c.site.domain}/`, '');
  L.push('## Главное');
  L.push(`- Что это: ${plain(o.fullName)} (${arr(o.alternateNames).join('; ')})`);
  if (has(o.grades)) L.push(`- Классы: ${o.grades}`);
  if (has(o.classSize)) L.push(`- В классе: до ${o.classSize} детей`);
  if (has(o.hoursText)) L.push(`- Режим работы: ${o.hoursText}`);
  if (has(o.priceDisplay)) {
    const p = sec('perks');
    const incl = p && p.accent && arr(p.accent.list).length ? ` Включено: ${arr(p.accent.list).join(', ').toLowerCase()}.` : '';
    L.push(`- Стоимость: ${o.priceDisplay} в ${o.pricePeriod || 'месяц'}.${incl}`);
  }
  if (has(o.paymentAccepted)) L.push(`- Оплата: ${o.paymentAccepted}`);
  L.push(`- Адрес: ${a.region}, ${a.district}, ${a.locality}, ${a.microdistrict}, ${a.street}${has(a.floor) ? ', ' + a.floor : ''}, индекс ${a.postalCode}`);
  if (o.geo && o.geo.lat) L.push(`- Координаты: ${o.geo.lat}, ${o.geo.lng}`);
  L.push(`- Телефоны: ${[o.phone, o.phone2].filter(has).join(', ')}`);
  if (has(o.email)) L.push(`- Почта: ${o.email}`);
  if (has(r.value)) L.push(`- Рейтинг: ${r.value} из ${r.best || 5} на ${r.source} (${[r.count, r.reviews].filter(has).join(', ')}; проверено: ${r.checked || c.updated})`);
  if (o.director && has(o.director.name)) L.push(`- Директор: ${o.director.name}`);
  if (has(o.legalName)) L.push(`- Юрлицо: ${o.legalName}${has(o.inn) ? ', ИНН ' + o.inn : ''}${has(o.ogrn) ? ', ОГРН ' + o.ogrn : ''}`);
  if (has(o.license)) L.push(`- ${/^лиценз/i.test(o.license) ? "" : "Лицензия: "}${o.license}${has(o.licenseNote) ? ' (' + o.licenseNote + ')' : ''}${has(o.licenseUrl) ? ', реестр: ' + o.licenseUrl : ''}`);
  if (c.sveden && c.sveden.enabled !== false) L.push(`- Сведения об образовательной организации: https://${c.site.domain}/sveden/`);
  if (arr(seo.areaServed).length) L.push(`- Откуда приезжают: ${arr(seo.areaServed).join(', ')}`);
  L.push('');
  const subj = sec('subjects');
  if (subj) { L.push('## Программа'); L.push(plain(subj.text)); L.push(`Предметы: ${arr(subj.items).map((i) => i.name).join(', ')}.`, ''); }
  const life = sec('life');
  if (life) { L.push('## Жизнь школы'); arr(life.cards).forEach((k) => L.push(`- ${plain(k.title)}: ${plain(k.text)}`)); L.push(''); }
  const perks = sec('perks');
  if (perks) { L.push('## Преимущества'); arr(perks.items).forEach((k) => L.push(`- ${plain(k.title)}: ${plain(k.text)}`)); L.push(''); }
  const day = sec('day');
  if (day) { L.push('## Распорядок дня'); arr(day.items).forEach((k) => L.push(`- ${k.time} ${plain(k.title)}: ${plain(k.text)}`)); L.push(''); }
  const steps = sec('steps');
  if (steps) { L.push('## Как поступить'); arr(steps.items).forEach((k, i) => L.push(`${i + 1}. ${plain(k.title)}: ${plain(k.text)}`)); L.push(''); }
  const env = sec('env');
  if (env) { L.push('## Помещение и территория'); arr(env.list).forEach((k) => L.push(`- ${plain(k)}`)); L.push(''); }
  const faq = sec('faq');
  if (faq) {
    L.push('## Частые вопросы');
    arr(faq.items).filter((f) => f.enabled !== false && has(f.q)).forEach((f) => { L.push(`### ${plain(f.q)}`, plain(f.a), ''); });
  }
  const aw = sec('awards');
  if (aw) { L.push('## Достижения директора и команды'); arr(aw.items).forEach((k) => L.push(`- ${plain(k.title)}${has(k.year) ? ' (' + k.year + ')' : ''}: ${plain(k.caption)}`)); L.push(''); }
  L.push('## Ссылки');
  L.push(`- Сайт: https://${c.site.domain}/ (${c.site.url})`);
  if (has(l.gis)) L.push(`- 2ГИС: ${l.gis}`);
  if (has(l.yandexMaps)) L.push(`- Яндекс Карты: ${l.yandexMaps}`);
  if (has(l.vk)) L.push(`- ВКонтакте: ${l.vk}`);
  if (has(l.max)) L.push(`- MAX: ${l.max}`);
  if (has(l.telegram)) L.push(`- Telegram: ${l.telegram}`);
  if (has(seo.llmsExtra)) L.push('', '## Дополнительно', String(seo.llmsExtra));
  L.push('', `Обновлено: ${c.updated}`);
  return L.join('\n') + '\n';
}

/* ---------- Подраздел «Сведений»: таблица, люди, документы ---------- */
const PERSON_FIELDS = [
  ['phone', 'Телефон', 'telephone'], ['email', 'Почта', 'email'],
  ['disciplines', 'Преподаваемые дисциплины', 'teachingDiscipline'], ['education', 'Уровень образования', 'teachingLevel'],
  ['qualification', 'Квалификация', 'teachingQual'], ['experience', 'Стаж работы по специальности', 'specExperience'],
  ['courses', 'Повышение квалификации', 'profDevelopment'],
];
function svContent(p, A) {
  let out = '';
  if (has(p.text)) out += `<div class="sv-text">${paras(p.text)}</div>`;
  const rows = arr(p.rows).filter((r) => r && has(r.value));
  if (rows.length) {
    out += `<table class="sv-tbl"><tbody>${rows.map((r) => {
      if (r.prop === 'structOrgUprav') return `<tr itemprop="structOrgUprav"><th scope="row">${esc(r.label)}</th><td itemprop="name">${md(r.value)}</td></tr>`;
      return `<tr><th scope="row">${esc(r.label)}</th><td${has(r.prop) ? ` itemprop="${esc(r.prop)}"` : ''}>${md(r.value)}</td></tr>`;
    }).join('')}</tbody></table>`;
  }
  const people = arr(p.people).filter((x) => x && has(x.fio));
  if (people.length) {
    out += `<div class="sv-people">${people.map((x) => `<div class="sv-person"${has(x.prop) ? ` itemprop="${esc(x.prop)}"` : ''}><div class="sv-pn"><b itemprop="fio">${esc(x.fio)}</b>${has(x.post) ? `<span itemprop="post">${esc(x.post)}</span>` : ''}</div>`
      + `<dl>${PERSON_FIELDS.filter(([k]) => has(x[k])).map(([k, label, prop]) => `<dt>${label}</dt><dd itemprop="${prop}">${k === 'phone' ? `<a href="tel:${esc(String(x[k]).replace(/[^\d+]/g, ''))}">${esc(x[k])}</a>` : k === 'email' ? `<a href="mailto:${esc(x[k])}">${esc(x[k])}</a>` : md(x[k])}</dd>`).join('')}</dl></div>`).join('')}</div>`;
  }
  const docs = arr(p.docs).filter((d) => d && has(d.href));
  if (docs.length) {
    out += `<ul class="sv-docs">${docs.map((d) => {
      const u = /^https?:/i.test(d.href) ? d.href : A(d.href);
      const pdf = /\.pdf$/i.test(d.href);
      return `<li${has(d.prop) ? ` itemprop="${esc(d.prop)}"` : ''}><a href="${esc(u)}" target="_blank" rel="noopener">${icon('document', 20, 1.7)}<span>${esc(d.title)}${pdf ? ' <small>PDF</small>' : ''}</span></a>${has(d.note) ? `<p>${md(d.note)}</p>` : ''}</li>`;
    }).join('')}</ul>`;
  }
  if (has(p.note)) out += `<div class="sv-note">${paras(p.note)}</div>`;
  if (!out) out = `<p class="sv-empty">Информация в этом подразделе обновляется.</p>`;
  return out;
}

/* ---------- Главная функция ---------- */
export function renderSite(content, opts = {}) {
  const now = opts.now || new Date();
  const raw = JSON.parse(JSON.stringify(content));
  const t = tokenMap(raw, now);
  const c = applyTokens(applyTokens(raw, t), t);
  c.org = c.org || {}; c.org.links = c.org.links || {}; c.site = c.site || {}; c.seo = c.seo || {};
  c.site.url = String(c.site.url || '/').replace(/\/?$/, '/');
  const abs = (p) => (/^https?:/i.test(p || '') ? p : c.site.url + String(p || '').replace(/^\//, ''));
  const seo = c.seo, th = c.theme || {};
  const metrika = String(seo.metrikaId || '').replace(/\D/g, '');
  const colors = Object.entries(th.colors || {}).map(([k, v]) => `--${k.replace(/[^a-z0-9-]/gi, '')}: ${safeColor(v)}`).join(';');
  const og = seo.ogImage && seo.ogImage.src ? seo.ogImage : null;
  const logo = c.org.logo || {};
  const sv = c.sveden && c.sveden.enabled !== false ? c.sveden : null;
  const svPages = sv ? arr(sv.pages).filter((p) => p && has(p.id) && p.enabled !== false) : [];

  // Полная HTML-страница. depth: вложенность (0 главная, 1 sveden/, 2 sveden/common/)
  function page({ depth = 0, title, description, canonical, ld, body, index = true }) {
    PRE = depth && !opts.preview ? '../'.repeat(depth) : '';
    const A = makeAsset({ ...opts, base: opts.preview ? (opts.base || '') : '../'.repeat(depth) });
    const css = String(opts.css || '').replace(/url\(\.\.\/(fonts|img)\//g, (m, d) => `url(${A('assets/' + d + '/')}`);
    const htmlCls = [th.noise === false ? 'no-noise' : '', opts.preview ? 'preview' : '', depth ? 'inner' : ''].filter(Boolean).join(' ');
    const robotsMeta = seo.index === false || !index ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
    const head = `<!DOCTYPE html><html lang="ru"${htmlCls ? ` class="${htmlCls}"` : ''}${metrika && !opts.preview ? ` data-metrika="${metrika}"` : ''}><head>`
      + `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
      + `<title>${esc(title)}</title>`
      + `<meta name="description" content="${esc(description)}">`
      + `<link rel="canonical" href="${esc(canonical)}">`
      + `<meta name="robots" content="${robotsMeta}">`
      + `<meta name="theme-color" content="${esc(safeColor(th.colors && th.colors.moss))}">`
      + `<meta name="format-detection" content="telephone=no">`
      + (c.org.geo && c.org.geo.lat ? `<meta name="geo.region" content="RU-IRK"><meta name="geo.placename" content="${esc([c.org.address && c.org.address.locality, 'Иркутский район'].filter(has).join(', '))}"><meta name="geo.position" content="${+c.org.geo.lat};${+c.org.geo.lng}"><meta name="ICBM" content="${+c.org.geo.lat}, ${+c.org.geo.lng}">` : '')
      + `<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(c.org.name)}"><meta property="og:locale" content="ru_RU"><meta property="og:url" content="${esc(canonical)}">`
      + `<meta property="og:title" content="${esc(depth ? title : plain(seo.ogTitle || seo.title))}"><meta property="og:description" content="${esc(depth ? description : plain(seo.ogDescription || seo.description))}">`
      + (og ? `<meta property="og:image" content="${esc(abs(og.src))}"><meta property="og:image:width" content="${+og.w || 1200}"><meta property="og:image:height" content="${+og.h || 630}"><meta property="og:image:alt" content="${esc(og.alt || '')}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(abs(og.src))}">` : '')
      + (has(seo.yandexVerification) ? `<meta name="yandex-verification" content="${esc(seo.yandexVerification)}">` : '')
      + (has(seo.googleVerification) ? `<meta name="google-site-verification" content="${esc(seo.googleVerification)}">` : '')
      + `<link rel="icon" href="${esc(A('favicon.ico'))}" sizes="48x48"><link rel="icon" type="image/png" sizes="32x32" href="${esc(A('favicon-32.png'))}"><link rel="apple-touch-icon" href="${esc(A('apple-touch-icon.png'))}"><link rel="manifest" href="${esc(A('site.webmanifest'))}">`
      + `<link rel="preload" href="${esc(A('assets/fonts/roboto-flex-cyrillic.woff2'))}" as="font" type="font/woff2" crossorigin><link rel="preload" href="${esc(A('assets/fonts/lora-cyrillic.woff2'))}" as="font" type="font/woff2" crossorigin>`
      + (!depth && logo.src ? `<link rel="preload" as="image" href="${esc(A(logo.src))}" fetchpriority="high">` : '')
      + `<style>${css}</style>`
      + (colors ? `<style>:root{${colors}}</style>` : '')
      + (has(th.customCss) ? `<style>${String(th.customCss).replace(/<\/style/gi, '')}</style>` : '')
      + (ld ? `<script type="application/ld+json">${ld}</script>` : '')
      + (opts.preview ? '' : String(seo.headCode || ''))
      + `</head>`;
    const metrikaCode = metrika && !opts.preview ? `<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${metrika},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});</script><noscript><div><img src="https://mc.yandex.ru/watch/${metrika}" style="position:absolute;left:-9999px" alt=""></div></noscript>` : '';
    const html = head + `<body><a class="skip" href="#main">Перейти к содержанию</a><div class="progress-bar" id="progressBar" aria-hidden="true"></div>`
      + `<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs>${SEED_SYMBOL}</defs></svg>`
      + (th.seeds === false ? '' : '<div class="seeds-fixed" id="seedsFixed" aria-hidden="true"></div>')
      + headerHtml(c, A) + body(A) + footerHtml(c, A)
      + `<script>${String(opts.js || '').replace(/<\/script/gi, '<\\/script')}</script>`
      + metrikaCode + (opts.preview ? '' : String(seo.bodyCode || ''))
      + `</body></html>`;
    PRE = '';
    return html;
  }

  const sections = arr(c.sections).filter((s) => s && s.enabled !== false && R[s.type]);
  const hasAwards = sections.some((s) => s.type === 'awards');
  const mainPage = () => page({
    depth: 0, title: plain(seo.title), description: plain(seo.description), canonical: c.site.url, ld: jsonLd(c, abs),
    body: (A) => `<main id="main">${sections.map((s) => { try { return R[s.type](s, c, A); } catch (e) { return `<!-- ошибка в разделе ${esc(s.type)}: ${esc(e.message)} -->`; } }).join('')}</main>` + (hasAwards ? LIGHTBOX : ''),
  });
  if (opts.only === 'html') return { 'index.html': mainPage() };

  // Раздел «Сведения об образовательной организации» (приказ Рособрнадзора № 1493)
  const svTitle = sv ? plain(sv.title || 'Сведения об образовательной организации') : '';
  const crumbsLd = (items) => JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) }).replace(/</g, '\\u003c');
  const svNav = (cur) => `<nav class="sv-nav" aria-label="Подразделы сведений">${svPages.map((p, i) => `<a href="${esc(fixHref('sveden/' + p.id + '/'))}"${p.id === cur ? ' aria-current="page"' : ''}><em>${i + 1}</em><span>${esc(p.title)}</span></a>`).join('')}</nav>`;
  const crumbs = (depth, last) => `<nav class="sv-crumbs" aria-label="Вы здесь"><a href="${opts.preview ? '#' : '../'.repeat(depth)}">Главная</a><span aria-hidden="true">/</span>${last ? `<a href="${esc(fixHref('sveden/'))}">${esc(svTitle)}</a><span aria-hidden="true">/</span><span>${esc(last)}</span>` : `<span>${esc(svTitle)}</span>`}</nav>`;
  const svPage = (p, depth) => page({
    depth, title: `${plain(p.title)} · ${svTitle} · ${c.org.name}`,
    description: `${plain(p.title)}. ${c.org.legalName ? c.org.legalName + ', ' : ''}школа «${c.org.name}», ${c.org.address && c.org.address.short ? c.org.address.short : ''}.`,
    canonical: c.site.url + 'sveden/' + p.id + '/',
    ld: crumbsLd([['Главная', c.site.url], [svTitle, c.site.url + 'sveden/'], [plain(p.title), c.site.url + 'sveden/' + p.id + '/']]),
    body: (A) => `<main id="main" class="sv-main"><div class="container">${crumbs(depth, plain(p.title))}<h1 class="sv-h1">${esc(p.title)}</h1><div class="sv-layout">${svNav(p.id)}<article class="sv-body">${svContent(p, A)}</article></div></div></main>`,
  });
  const svIndex = () => page({
    depth: 1, title: `${svTitle} · ${c.org.name}`,
    description: `${svTitle}: ${c.org.legalName || c.org.name}, лицензия, документы, руководство, платные услуги, питание.`,
    canonical: c.site.url + 'sveden/',
    ld: crumbsLd([['Главная', c.site.url], [svTitle, c.site.url + 'sveden/']]),
    body: () => `<main id="main" class="sv-main"><div class="container">${crumbs(1, '')}<h1 class="sv-h1">${esc(svTitle)}</h1>${has(sv.intro) ? `<div class="sv-lead">${paras(sv.intro)}</div>` : ''}<div class="sv-layout">${svNav('')}<article class="sv-body"><h2>Подразделы</h2><ol class="sv-list">${svPages.map((p) => `<li><a href="${esc(fixHref('sveden/' + p.id + '/'))}">${esc(p.title)}</a></li>`).join('')}</ol></article></div></div></main>`,
  });
  if (opts.page && sv) {
    if (opts.page === 'sveden') return { 'index.html': svIndex() };
    const p = svPages.find((x) => 'sveden/' + x.id === opts.page);
    if (p) return { 'index.html': svPage(p, 2) };
  }
  const html = mainPage();
  const svFiles = {};
  if (sv && svPages.length) {
    svFiles['sveden/index.html'] = svIndex();
    svPages.forEach((p) => { svFiles[`sveden/${p.id}/index.html`] = svPage(p, 2); });
  }

  // robots.txt: разрешаем всем поисковикам и ИИ-ботам, закрываем админку
  const bots = ['*', 'Yandex', 'Googlebot', 'YandexAdditional', 'YandexAdditionalBot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'];
  const dis = seo.index === false ? 'Disallow: /' : 'Allow: /\nDisallow: /admin/\nDisallow: /core/\nDisallow: /content/';
  const robots = bots.map((b) => `User-agent: ${b}\n${dis}${b === 'Yandex' ? '\nClean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&gclid&fbclid&from /' : ''}`).join('\n\n')
    + `\n\nSitemap: ${c.site.url}sitemap.xml\n`;

  // sitemap.xml с картинками
  const imgs = [];
  const seen = new Set();
  const walk = (x) => {
    if (!x || typeof x !== 'object') return;
    if (typeof x.src === 'string' && /\.(webp|jpe?g|png)$/i.test(x.src) && !seen.has(x.src) && x.alt !== undefined) { seen.add(x.src); imgs.push(x.src); }
    for (const k in x) walk(x[k]);
  };
  walk(sections);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n<url><loc>${esc(c.site.url)}</loc><lastmod>${esc(c.updated || now.toISOString().slice(0, 10))}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority>`
    + imgs.map((p) => `\n<image:image><image:loc>${esc(abs(p))}</image:loc></image:image>`).join('') + `\n</url>`
    + Object.keys(svFiles).map((f) => `\n<url><loc>${esc(c.site.url + f.replace(/index\.html$/, ''))}</loc><lastmod>${esc(c.updated || now.toISOString().slice(0, 10))}</lastmod><changefreq>monthly</changefreq><priority>0.3</priority></url>`).join('')
    + `\n</urlset>\n`;

  const manifest = JSON.stringify({ name: plain(c.org.fullName || c.org.name), short_name: c.org.name, lang: 'ru', start_url: '/', display: 'browser', background_color: safeColor(th.colors && th.colors.linen, '#FAF5EF'), theme_color: safeColor(th.colors && th.colors.moss), icons: [{ src: 'assets/img/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'assets/img/icon-512.png', sizes: '512x512', type: 'image/png' }] }, null, 2);

  const page404 = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Страница не найдена · ${esc(c.org.name)}</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.ico"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:${safeColor(th.colors && th.colors.linen, '#FAF5EF')};color:#4A3D30;font:17px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center;padding:24px}img{width:220px;height:auto}h1{font:600 28px/1.3 Georgia,serif;color:#5A493A;margin:24px 0 8px}a{display:inline-block;margin-top:18px;background:${safeColor(th.colors && th.colors.moss)};color:#fff;padding:12px 26px;border-radius:999px;text-decoration:none;font-weight:600}</style></head><body><div><img src="${esc(abs(logo.src))}" alt="${esc(c.org.name)}" width="220" height="107"><h1>Такой страницы нет</h1><p>Возможно, ссылка устарела. Вся информация о школе на главной странице.</p><a href="/">На главную</a>${has(c.org.phone) ? `<p style="margin-top:22px"><a href="tel:${esc(c.org.tel)}" style="background:none;color:#5A493A;padding:0">${esc(c.org.phone)}</a></p>` : ''}</div></body></html>`;

  return {
    'index.html': html,
    '404.html': page404,
    'robots.txt': robots,
    'sitemap.xml': sitemap,
    'llms.txt': llmsTxt(c),
    'site.webmanifest': manifest,
    ...svFiles,
  };
}
