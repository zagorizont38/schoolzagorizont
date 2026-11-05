// Админка сайта «За горизонт». Работает целиком в браузере, хранит контент в репозитории GitHub.
import { GitHub, MockGitHub } from './github.js';
import { renderSite, plain, translit, esc } from '../core/render.js';
import { validate } from '../core/validate.js';
import { ICONS, icon } from '../core/icons.js';
import * as S from './schema.js';
import { CONFIG } from './config.js';
import { h, ic, renderFields, smallest } from './fields.js';
import { processImage, readAsDataURL, blobToBase64, usedPaths, groupKey, pendingStore, IMG_DIR } from './media.js';

if (window.top !== window.self) { try { window.top.location = window.location.href; } catch (e) { document.body.innerHTML = ''; } }

const CONTENT = CONFIG.contentPath;
const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const MOCK = isLocal && new URLSearchParams(location.search).has('mock');
const LS = { session: 'zg-session', draft: (r) => 'zg-draft:' + r, pv: 'zg-preview' };

const st = {
  gh: null, user: null, content: null, original: '', baseSha: null,
  pending: new Map(), deletions: new Set(), repoFiles: null,
  view: 'dashboard', css: '', js: '', lastRun: null,
  device: 'desktop', previewOpen: true, lastY: 0, scrollTo: null, previewPage: null,
};

/* ================= Утилиты интерфейса ================= */
const $ = (sel, root = document) => root.querySelector(sel);
function toast(msg, type = 'info', ms = 4200) {
  const t = h('div', { class: 'toast ' + type, role: 'status' }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}
function modal({ title, body, actions = [], wide = false, onClose }) {
  const root = $('#modal-root');
  const close = () => { wrap.remove(); document.removeEventListener('keydown', esc_); if (onClose) onClose(); };
  const esc_ = (e) => { if (e.key === 'Escape') close(); };
  const box = h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'modal-head' }, h('h3', null, title), h('button', { type: 'button', class: 'ib', 'aria-label': 'Закрыть', onclick: close }, ic('close', 18))),
    h('div', { class: 'modal-body' }, body),
    actions.length ? h('div', { class: 'modal-foot' }, actions.map((a) => h('button', { type: 'button', class: 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : '') + (a.ghost ? ' ghost' : ''), onclick: () => a.onClick(close) }, a.label))) : null);
  const wrap = h('div', { class: 'overlay', onclick: (e) => { if (e.target === wrap) close(); } }, box);
  root.append(wrap);
  document.addEventListener('keydown', esc_);
  setTimeout(() => { const f = box.querySelector('input,textarea,button.primary'); if (f) f.focus(); }, 30);
  return { close, box };
}
const fmtDate = (d) => new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(n / 1024)) + ' КБ');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const assetUrl = (p) => {
  if (!p) return '';
  if (/^(https?:|data:|blob:)/.test(p)) return p;
  const pe = st.pending.get(p) || (st.recent && st.recent.get(p));
  return pe ? pe.url : '../' + p.replace(/^\//, '');
};

/* ================= Вход ================= */
function loadSession() {
  try { return JSON.parse(localStorage.getItem(LS.session) || sessionStorage.getItem(LS.session) || 'null'); } catch (e) { return null; }
}
function saveSession(s, remember) {
  const v = JSON.stringify(s);
  if (remember) { localStorage.setItem(LS.session, v); sessionStorage.removeItem(LS.session); } else { sessionStorage.setItem(LS.session, v); localStorage.removeItem(LS.session); }
}
function logout() {
  localStorage.removeItem(LS.session); sessionStorage.removeItem(LS.session);
  location.reload();
}

function showLogin(err) {
  document.body.className = 'login-page';
  const s = loadSession() || {};
  const repo = h('input', { id: 'lg-repo', type: 'text', value: s.repo || CONFIG.repo, spellcheck: 'false', autocomplete: 'off' });
  const branch = h('input', { id: 'lg-branch', type: 'text', value: s.branch || CONFIG.branch, spellcheck: 'false' });
  const token = h('input', { id: 'lg-token', type: 'password', value: '', placeholder: 'github_pat_…', spellcheck: 'false', autocomplete: 'off' });
  const remember = h('input', { type: 'checkbox', class: 'sw' });
  remember.checked = true;
  const eye = h('button', { type: 'button', class: 'ib', title: 'Показать токен', onclick: () => { token.type = token.type === 'password' ? 'text' : 'password'; } }, ic('eye', 16));
  const errBox = h('div', { class: 'login-err', role: 'alert' }, err || '');
  const owner = (repo.value.split('/')[0] || '').trim();
  const tokenUrl = `https://github.com/settings/personal-access-tokens/new?name=${encodeURIComponent('Админка сайта За горизонт')}&description=${encodeURIComponent('Редактирование сайта загоризонт38.рф')}&target_name=${encodeURIComponent(owner)}&expires_in=366&contents=write&actions=read`;
  const btn = h('button', { type: 'submit', class: 'btn primary wide' }, 'Войти');
  const form = h('form', { class: 'login-card', onsubmit: async (e) => {
    e.preventDefault();
    errBox.textContent = '';
    const sess = { repo: repo.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, ''), branch: branch.value.trim() || 'main', token: token.value.trim() };
    if (!/^[\w.-]+\/[\w.-]+$/.test(sess.repo)) { errBox.textContent = 'Репозиторий пишется так: владелец/название, например zagorizont38/schoolzagorizont'; return; }
    if (!sess.token) { errBox.textContent = 'Вставьте токен GitHub'; return; }
    btn.disabled = true; btn.textContent = 'Проверяю…';
    try {
      await connect(sess);
      saveSession(sess, remember.checked);
    } catch (er) {
      errBox.textContent = er.message || String(er);
      btn.disabled = false; btn.textContent = 'Войти';
    }
  } },
  h('img', { src: '../assets/img/logo-za-gorizont.webp', alt: 'За горизонт', class: 'login-logo', width: 200, height: 97 }),
  h('h1', null, 'Админка сайта'),
  h('p', { class: 'muted' }, 'Все изменения сохраняются прямо в репозиторий GitHub, сайт обновляется сам за 1–2 минуты.'),
  h('label', { class: 'fl', for: 'lg-token' }, 'Токен GitHub'),
  h('div', { class: 'pw-row' }, token, eye),
  h('details', { class: 'more' }, h('summary', null, 'Репозиторий и ветка'),
    h('label', { class: 'fl', for: 'lg-repo' }, 'Репозиторий (владелец/название)'), repo,
    h('label', { class: 'fl', for: 'lg-branch' }, 'Ветка'), branch),
  h('label', { class: 'switch' }, remember, h('span', { class: 'track' }), h('span', null, 'Запомнить на этом устройстве')),
  errBox, btn,
  h('details', { class: 'more how' }, h('summary', null, 'Где взять токен'),
    h('ol', null,
      h('li', null, 'Откройте ', h('a', { href: tokenUrl, target: '_blank', rel: 'noopener' }, 'страницу создания токена на GitHub'), ' (нужно войти в аккаунт-владелец репозитория).'),
      h('li', null, 'Token name: любое, например «Админка сайта». Expiration: до года.'),
      h('li', null, 'Repository access: Only select repositories → выберите репозиторий сайта.'),
      h('li', null, 'Permissions → Repository permissions → Contents: Read and write. По желанию Actions: Read-only, тогда админка покажет, когда сайт обновился.'),
      h('li', null, 'Нажмите Generate token, скопируйте строку github_pat_… и вставьте сюда.')),
    h('p', { class: 'muted small' }, 'Токен хранится только в этом браузере и отправляется только на api.github.com. Не входите с чужих компьютеров с галочкой «Запомнить».')),
  MOCK ? h('p', { class: 'mock-note' }, 'Тестовый режим: подойдёт любой текст вместо токена, изменения никуда не отправляются.') : null);
  document.body.innerHTML = '';
  document.body.append(h('main', { class: 'login-wrap' }, form), h('div', { id: 'toasts' }));
  setTimeout(() => token.focus(), 50);
}

async function connect(sess) {
  const gh = MOCK ? new MockGitHub() : new GitHub(sess);
  const user = await gh.user();
  await gh.repoInfo();
  const sha = await gh.headSha();
  let content;
  try { content = await gh.readJson(CONTENT, sha); } catch (e) {
    if (e.status === 404) throw new Error(`В репозитории нет файла ${CONTENT}. Проверьте, что залили содержимое папки ИТОГ целиком.`);
    throw e;
  }
  st.gh = gh; st.user = user; st.baseSha = sha;
  st.content = content; st.original = JSON.stringify(content);
  const [css, js] = await Promise.all([
    fetch('../assets/css/site.css', { cache: 'no-store' }).then((r) => r.text()).catch(() => ''),
    fetch('../assets/js/site.js', { cache: 'no-store' }).then((r) => r.text()).catch(() => ''),
  ]);
  st.css = css; st.js = js;
  for (const [path, blob] of await pendingStore.all()) {
    st.pending.set(path, { blob, url: await readAsDataURL(blob), size: blob.size });
  }
  try { const pv = JSON.parse(localStorage.getItem(LS.pv) || '{}'); if (pv.device) st.device = pv.device; if (pv.open === false) st.previewOpen = false; } catch (e) { }
  if (window.innerWidth < 1200) st.previewOpen = false;
  buildShell();
  offerDraft();
  go('dashboard');
}

/* ================= Черновик ================= */
let saveTimer = null;
function isDirty() { return JSON.stringify(st.content) !== st.original || st.pending.size > 0 || st.deletions.size > 0; }
function onChange() {
  updateStatus();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      if (JSON.stringify(st.content) !== st.original) localStorage.setItem(LS.draft(st.gh.repo), JSON.stringify({ baseSha: st.baseSha, at: Date.now(), json: JSON.stringify(st.content) }));
      else localStorage.removeItem(LS.draft(st.gh.repo));
    } catch (e) { /* переполнение хранилища */ }
  }, 700);
  schedulePreview();
}
function offerDraft() {
  let d;
  try { d = JSON.parse(localStorage.getItem(LS.draft(st.gh.repo)) || 'null'); } catch (e) { d = null; }
  if (!d || !d.json || d.json === st.original) return;
  const box = h('div', { class: 'banner' }, ic('clock', 18),
    h('span', null, `Есть неопубликованный черновик от ${fmtDate(d.at)}.`),
    h('button', { type: 'button', class: 'btn sm primary', onclick: () => { st.content = JSON.parse(d.json); box.remove(); onChange(); go(st.view); toast('Черновик восстановлен. Не забудьте опубликовать.', 'ok'); } }, 'Восстановить'),
    h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { localStorage.removeItem(LS.draft(st.gh.repo)); box.remove(); } }, 'Удалить черновик'));
  $('.main').prepend(box);
}
window.addEventListener('beforeunload', (e) => { if (st.content && isDirty()) { e.preventDefault(); e.returnValue = ''; } });

/* ================= Каркас ================= */
const NAV = [
  ['dashboard', 'Обзор', 'home'],
  ['sections', 'Разделы страницы', 'menu'],
  ['org', 'Организация и контакты', 'pin'],
  ['seo', 'SEO и нейропоиск', 'zoom'],
  ['header', 'Шапка и меню', 'menu'],
  ['footer', 'Подвал', 'document'],
  ['sveden', 'Сведения об организации', 'docCheck'],
  ['theme', 'Цвета и оформление', 'palette'],
  ['vars', 'Переменные', 'math'],
  ['media', 'Медиатека', 'card'],
  ['check', 'Проверка сайта', 'checkCircle'],
  ['history', 'История версий', 'calendar'],
  ['settings', 'Настройки', 'tools'],
];
function buildShell() {
  document.body.className = 'app-page';
  document.body.innerHTML = '';
  const side = h('aside', { class: 'side' },
    h('nav', { 'aria-label': 'Разделы админки' }, NAV.map(([id, label, i]) => h('button', { type: 'button', class: 'nav-i', 'data-view': id, onclick: () => go(id) }, ic(i, 17), h('span', null, label), id === 'check' ? h('span', { class: 'badge', id: 'checkBadge' }) : null))),
    h('div', { class: 'side-foot' }, h('div', { class: 'who' }, ic('users', 15), h('span', null, st.user && (st.user.name || st.user.login))), h('div', { class: 'repo' }, `${st.gh.repo} · ${st.gh.branch}`)));
  const top = h('header', { class: 'top' },
    h('button', { type: 'button', class: 'ib menu-btn', 'aria-label': 'Меню', onclick: () => document.body.classList.toggle('side-open') }, ic('menu', 20)),
    h('div', { class: 'brand' }, h('img', { src: '../assets/img/logo-za-gorizont.webp', alt: '', width: 80, height: 39 }), h('span', null, 'Админка')),
    h('div', { class: 'status', id: 'status' }),
    h('div', { class: 'top-actions' },
      h('a', { class: 'btn ghost hide-sm', href: CONFIG.siteUrl, target: '_blank', rel: 'noopener' }, ic('external', 15), 'Сайт'),
      h('button', { type: 'button', class: 'btn ghost', id: 'pvToggle', onclick: togglePreview }, ic('zoom', 15), h('span', { class: 'hide-sm' }, 'Предпросмотр')),
      h('button', { type: 'button', class: 'btn primary', id: 'publishBtn', onclick: publish }, ic('arrow', 15), 'Опубликовать')));
  const pv = h('section', { class: 'pv', id: 'pv', 'aria-label': 'Предпросмотр' },
    h('div', { class: 'pv-bar' },
      h('div', { class: 'seg' }, [['desktop', 'Компьютер'], ['tablet', 'Планшет'], ['mobile', 'Телефон']].map(([d, t]) => h('button', { type: 'button', 'data-dev': d, onclick: () => setDevice(d) }, t))),
      h('button', { type: 'button', class: 'ib', title: 'Обновить предпросмотр', onclick: () => renderPreview(true) }, ic('refresh', 16)),
      h('button', { type: 'button', class: 'ib pv-close', title: 'Закрыть', onclick: togglePreview }, ic('close', 16))),
    h('div', { class: 'pv-stage', id: 'pvStage' }, h('iframe', { id: 'pvFrame', title: 'Предпросмотр сайта', sandbox: 'allow-scripts allow-popups allow-popups-to-escape-sandbox' })));
  const app = h('div', { class: 'app' + (st.previewOpen ? ' with-pv' : '') }, top, side, h('main', { class: 'main' }, h('div', { class: 'view', id: 'view' })), pv);
  document.body.append(app, h('div', { id: 'modal-root' }), h('div', { id: 'toasts' }), h('datalist', { id: 'zg-links' }));
  window.addEventListener('message', (e) => {
    const fr = $('#pvFrame');
    if (!fr || e.source !== fr.contentWindow) return;
    if (e.data && e.data.type === 'zg-y') st.lastY = e.data.y;
  });
  $('#pvFrame').addEventListener('load', () => {
    const w = $('#pvFrame').contentWindow;
    if (st.scrollTo) { w.postMessage({ type: 'zg-scroll', id: st.scrollTo }, '*'); st.scrollTo = null; } else w.postMessage({ type: 'zg-scrollY', y: st.lastY }, '*');
  });
  new ResizeObserver(fitPreview).observe($('#pvStage'));
  setDevice(st.device, true);
  updateStatus();
  renderPreview(true);
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); publish(); } });
}
function togglePreview() {
  st.previewOpen = !st.previewOpen;
  $('.app').classList.toggle('with-pv', st.previewOpen);
  localStorage.setItem(LS.pv, JSON.stringify({ device: st.device, open: st.previewOpen }));
  if (st.previewOpen) { renderPreview(true); setTimeout(fitPreview, 50); }
}
function setDevice(d, silent) {
  st.device = d;
  document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.dev === d));
  localStorage.setItem(LS.pv, JSON.stringify({ device: st.device, open: st.previewOpen }));
  fitPreview();
}
function fitPreview() {
  const stage = $('#pvStage'), fr = $('#pvFrame');
  if (!stage || !fr) return;
  const W = { desktop: 1366, tablet: 820, mobile: 390 }[st.device];
  const sw = stage.clientWidth - 24, sh = stage.clientHeight - 24;
  const sc = Math.min(1, sw / W);
  fr.style.width = W + 'px';
  fr.style.height = Math.round(sh / sc) + 'px';
  fr.style.transform = `scale(${sc})`;
  fr.style.marginLeft = Math.max(0, (sw - W * sc) / 2) + 'px';
}
let pvTimer = null;
function schedulePreview() { clearTimeout(pvTimer); pvTimer = setTimeout(() => renderPreview(), 450); }
function renderPreview(force) {
  if (!st.previewOpen && !force) return;
  const fr = $('#pvFrame');
  if (!fr || !st.content) return;
  try {
    const files = renderSite(st.content, { css: st.css, js: st.js, base: '../', asset: (p) => (st.pending.get(p) || (st.recent && st.recent.get(p)) || {}).url, preview: true, only: st.previewPage ? undefined : 'html', page: st.previewPage || undefined });
    fr.srcdoc = files['index.html'];
  } catch (e) { console.error(e); toast('Ошибка предпросмотра: ' + e.message, 'err'); }
}

function updateStatus() {
  const el = $('#status'); if (!el) return;
  const dirty = isDirty();
  if (st.publishing) { el.className = 'status busy'; el.textContent = st.publishing; }
  else if (dirty) { el.className = 'status warn'; el.textContent = 'Есть неопубликованные изменения'; }
  else if (st.lastRun && st.lastRun.state === 'building') { el.className = 'status busy'; el.textContent = 'Сайт обновляется…'; }
  else { el.className = 'status ok'; el.textContent = st.lastRun && st.lastRun.state === 'done' ? 'Опубликовано, сайт обновлён' : 'Все изменения опубликованы'; }
  const pb = $('#publishBtn'); if (pb) pb.disabled = !dirty || !!st.publishing;
  const { errors, warnings } = validate(st.content);
  const b = $('#checkBadge'); if (b) { b.textContent = errors.length ? String(errors.length) : warnings.length ? String(warnings.length) : ''; b.className = 'badge' + (errors.length ? ' err' : ''); }
  // подсказки для полей ссылок
  const dl = $('#zg-links');
  if (dl) {
    const ids = st.content.sections.filter((s) => s.id && s.enabled !== false).map((s) => ['#' + s.id, (S.SECTIONS[s.type] || {}).label]);
    dl.innerHTML = '';
    ids.concat([['tel:{{tel}}', 'Позвонить'], ['tel:{{tel2}}', 'Позвонить на мобильный'], ['{{gis}}', '2ГИС'], ['{{vk}}', 'ВКонтакте'], ['{{max}}', 'MAX']]).forEach(([v, t]) => dl.append(h('option', { value: v }, t || '')));
  }
}

/* ================= Навигация по экранам ================= */
function go(view, opts = {}) {
  if (st.previewPage && !view.startsWith('sveden')) { st.previewPage = null; st.lastY = 0; renderPreview(true); }
  st.view = view;
  document.body.classList.remove('side-open');
  document.querySelectorAll('.nav-i').forEach((b) => b.classList.toggle('on', b.dataset.view === view.split(':')[0] || (view.startsWith('section:') && b.dataset.view === 'sections')));
  const v = $('#view');
  v.innerHTML = '';
  const fn = VIEWS[view.split(':')[0]];
  v.append(fn ? fn(view.split(':')[1], opts) : h('p', null, 'Нет такого экрана'));
  $('.main').scrollTop = 0;
}
const ctx = () => ({
  onChange, asset: assetUrl,
  pickIcon, pickImage, uploadFile,
  confirmDelete: (t) => window.confirm(`Удалить «${t}»?`),
});
function viewHead(title, sub, ...extra) {
  return h('div', { class: 'view-head' }, h('div', null, h('h2', null, title), sub ? h('p', { class: 'muted' }, sub) : null), extra.length ? h('div', { class: 'vh-actions' }, extra) : null);
}
function groupsForm(groups, root) {
  return groups.map((g) => {
    const target = g.path ? (root[g.path] = root[g.path] || {}) : root;
    return h('section', { class: 'card' }, h('h3', null, g.group), g.help ? h('p', { class: 'muted small' }, g.help) : null,
      renderFields(g.fields, target, ctx()),
      g.mapLink && target.lat ? h('a', { class: 'link small', href: `https://yandex.ru/maps/?pt=${target.lng},${target.lat}&z=17&l=map`, target: '_blank', rel: 'noopener' }, 'Проверить точку на Яндекс Картах ↗') : null,
      g.snippet ? snippetPreview() : null);
  });
}

const VIEWS = {};

VIEWS.dashboard = () => {
  const dirty = isDirty();
  const { errors, warnings } = validate(st.content);
  const quick = [
    ['Цена, телефоны, адрес', 'org', 'wallet'],
    ['Первый экран', 'section:' + st.content.sections.findIndex((s) => s.type === 'hero'), 'home'],
    ['Частые вопросы', 'section:' + st.content.sections.findIndex((s) => s.type === 'faq'), 'question'],
    ['Отзывы и рейтинг', 'section:' + st.content.sections.findIndex((s) => s.type === 'reviews'), 'chat'],
    ['Фото и картинки', 'media', 'card'],
    ['SEO и нейропоиск', 'seo', 'zoom'],
  ];
  return h('div', null,
    viewHead(`Здравствуйте${st.user && st.user.name ? ', ' + st.user.name.split(' ')[0] : ''}!`, 'Здесь редактируется весь сайт. Меняйте что угодно, справа сразу видно, как это будет выглядеть. Когда готово, нажмите «Опубликовать».'),
    h('div', { class: 'tiles' },
      h('div', { class: 'card tile ' + (dirty ? 'warn' : 'ok') }, h('div', { class: 'tile-ic' }, ic(dirty ? 'clock' : 'checkCircle', 22)),
        h('div', null, h('b', null, dirty ? 'Есть неопубликованные изменения' : 'Всё опубликовано'),
          h('p', { class: 'muted small' }, dirty ? changeSummary().join(', ') || 'Новые файлы' : 'Сайт совпадает с тем, что в админке.'),
          dirty ? h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn sm primary', onclick: publish }, 'Опубликовать'), h('button', { type: 'button', class: 'btn sm ghost', onclick: revertAll }, 'Отменить все изменения')) : null)),
      h('div', { class: 'card tile ' + (errors.length ? 'err' : warnings.length ? 'warn' : 'ok') }, h('div', { class: 'tile-ic' }, ic('zoom', 22)),
        h('div', null, h('b', null, errors.length ? `Ошибок: ${errors.length}` : warnings.length ? `Что можно улучшить: ${warnings.length}` : 'Проверка пройдена'),
          h('p', { class: 'muted small' }, 'SEO, описания картинок, ссылки меню и что осталось заполнить в «Сведениях».'),
          h('button', { type: 'button', class: 'btn sm ghost', onclick: () => go('check') }, 'Открыть проверку')))),
    h('h3', { class: 'sub-h' }, 'Быстрые действия'),
    h('div', { class: 'quick' }, quick.filter((q) => !q[1].endsWith(':-1')).map(([t, v, i]) => h('button', { type: 'button', class: 'card quick-i', onclick: () => go(v) }, ic(i, 22), h('span', null, t)))),
    h('section', { class: 'card how' }, h('h3', null, 'Как это работает'),
      h('ol', null,
        h('li', null, 'Вы правите тексты, фото и настройки. Черновик сохраняется в этом браузере автоматически.'),
        h('li', null, 'Кнопка «Опубликовать» (или Ctrl+S) отправляет изменения одним коммитом в репозиторий ', h('b', null, st.gh.repo), '.'),
        h('li', null, 'GitHub сам собирает сайт и выкладывает его на загоризонт38.рф за 1–2 минуты. Статус видно вверху.'),
        h('li', null, 'Любую прошлую версию можно вернуть в «Истории версий».'))));
};

VIEWS.sections = () => {
  const list = st.content.sections;
  const box = h('div', { class: 'sec-list' });
  const draw = () => {
    box.innerHTML = '';
    list.forEach((s, i) => {
      const def = S.SECTIONS[s.type] || { label: s.type, icon: 'document' };
      const sw = h('input', { type: 'checkbox', class: 'sw', title: 'Показывать на сайте' });
      sw.checked = s.enabled !== false;
      sw.addEventListener('change', () => { s.enabled = sw.checked; onChange(); draw(); });
      const row = h('div', { class: 'card sec-row' + (s.enabled === false ? ' off' : ''), draggable: 'true' },
        h('span', { class: 'drag', html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>' }),
        h('span', { class: 'sec-ic' }, ic(def.icon || 'document', 18)),
        h('button', { type: 'button', class: 'sec-name', onclick: () => go('section:' + i) }, h('b', null, plain(s.title || s.slogan || def.label)), h('small', null, `${def.label}${s.id ? ' · #' + s.id : ''}`)),
        h('label', { class: 'switch mini', title: 'Показывать на сайте' }, sw, h('span', { class: 'track' })),
        h('span', { class: 'it-actions' },
          h('button', { type: 'button', class: 'ib rot', title: 'Выше', disabled: i === 0, onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; onChange(); draw(); } }, ic('chevronLeft', 14)),
          h('button', { type: 'button', class: 'ib rot', title: 'Ниже', disabled: i === list.length - 1, onclick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; onChange(); draw(); } }, ic('chevronRight', 14)),
          def.single ? null : h('button', { type: 'button', class: 'ib', title: 'Дублировать', onclick: () => { const c = JSON.parse(JSON.stringify(s)); c.id = uniqueId(c.id || c.type); list.splice(i + 1, 0, c); onChange(); draw(); } }, ic('plus', 14)),
          def.single ? null : h('button', { type: 'button', class: 'ib danger', title: 'Удалить раздел', onclick: () => { if (confirm(`Удалить раздел «${plain(s.title || def.label)}»? Его можно вернуть через «Историю версий».`)) { list.splice(i, 1); onChange(); draw(); } } }, ic('close', 14)),
          h('button', { type: 'button', class: 'btn sm', onclick: () => go('section:' + i) }, 'Изменить')));
      row.addEventListener('dragstart', (e) => { row.classList.add('dragging'); e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('over'); });
      row.addEventListener('dragleave', () => row.classList.remove('over'));
      row.addEventListener('drop', (e) => { e.preventDefault(); row.classList.remove('over'); const from = +e.dataTransfer.getData('text/plain'); if (isNaN(from) || from === i) return; const [m] = list.splice(from, 1); list.splice(i, 0, m); onChange(); draw(); });
      box.append(row);
    });
  };
  draw();
  return h('div', null,
    viewHead('Разделы страницы', 'Порядок как на сайте. Перетаскивайте за точки слева, выключайте переключателем, нажмите на раздел, чтобы изменить.',
      h('button', { type: 'button', class: 'btn primary', onclick: addSection }, ic('plus', 15), 'Добавить раздел')),
    box);
};
function uniqueId(base) {
  const ids = new Set(st.content.sections.map((s) => s.id));
  let b = translit(base || 'block', 20), id = b, n = 2;
  while (ids.has(id)) id = `${b}-${n++}`;
  return id;
}
function addSection() {
  const grid = h('div', { class: 'type-grid' }, Object.keys(S.NEW_SECTION).map((t) => h('button', { type: 'button', class: 'card type-i', onclick: () => {
    const s = JSON.parse(JSON.stringify(S.NEW_SECTION[t]));
    s.id = uniqueId(s.id);
    const ci = st.content.sections.findIndex((x) => x.type === 'contacts');
    const at = ci >= 0 ? ci : st.content.sections.length;
    st.content.sections.splice(at, 0, s);
    m.close(); onChange(); go('section:' + at);
  } }, ic(S.SECTIONS[t].icon, 22), h('b', null, S.SECTIONS[t].label))));
  const m = modal({ title: 'Какой раздел добавить?', body: grid, wide: true });
}

VIEWS.section = (idx) => {
  const i = +idx, s = st.content.sections[i];
  if (!s) return h('p', null, 'Раздел не найден');
  const def = S.SECTIONS[s.type] || { label: s.type, fields: [] };
  if (s.id) { st.scrollTo = s.id; const w = $('#pvFrame') && $('#pvFrame').contentWindow; if (w) { w.postMessage({ type: 'zg-scroll', id: s.id }, '*'); st.scrollTo = null; } }
  const sw = h('input', { type: 'checkbox', class: 'sw' });
  sw.checked = s.enabled !== false;
  sw.addEventListener('change', () => { s.enabled = sw.checked; onChange(); });
  const prev = st.content.sections[i - 1], next = st.content.sections[i + 1];
  const common = S.SECTION_COMMON.filter((f) => !(s.type === 'hero' && (f.k === 'bg' || f.k === 'decor')));
  return h('div', null,
    h('button', { type: 'button', class: 'back', onclick: () => go('sections') }, '← Все разделы'),
    viewHead(def.label, plain(s.title || ''), h('label', { class: 'switch' }, sw, h('span', { class: 'track' }), h('span', null, 'Показывать'))),
    def.help ? h('p', { class: 'note' }, ic('question', 16), def.help) : null,
    h('section', { class: 'card' }, renderFields(def.fields, s, ctx())),
    h('details', { class: 'card more' }, h('summary', null, 'Настройки раздела: якорь, фон'), renderFields(common, s, ctx())),
    h('div', { class: 'pager' },
      prev ? h('button', { type: 'button', class: 'btn ghost', onclick: () => go('section:' + (i - 1)) }, '← ', plain(prev.title || (S.SECTIONS[prev.type] || {}).label)) : h('span'),
      next ? h('button', { type: 'button', class: 'btn ghost', onclick: () => go('section:' + (i + 1)) }, plain(next.title || (S.SECTIONS[next.type] || {}).label), ' →') : h('span')));
};

VIEWS.sveden = () => {
  const sv = st.content.sveden = st.content.sveden || { enabled: true, title: 'Сведения об образовательной организации', intro: '', pages: [] };
  const sel = h('select', { 'aria-label': 'Какую страницу показать в предпросмотре' }, h('option', { value: 'sveden' }, 'Обзор раздела'), (sv.pages || []).map((p) => h('option', { value: 'sveden/' + p.id }, p.title)));
  sel.value = st.previewPage || 'sveden';
  sel.addEventListener('change', () => { st.previewPage = sel.value; st.lastY = 0; if (!st.previewOpen) togglePreview(); else renderPreview(true); });
  if (!st.previewPage) { st.previewPage = 'sveden'; st.lastY = 0; renderPreview(true); }
  const missing = validate(st.content).warnings.filter((w) => w.where.startsWith('Сведения')).length;
  return h('div', null,
    viewHead('Сведения об образовательной организации', 'Обязательный раздел по приказу Рособрнадзора № 1493: страницы /sveden/… с микроразметкой для автоматической проверки. Пустые строки и документы без файла на сайте не показываются.',
      h('a', { class: 'btn ghost', href: '../sveden/', target: '_blank', rel: 'noopener' }, ic('external', 15), 'Открыть на сайте')),
    missing ? h('p', { class: 'note' }, ic('question', 16), `Осталось заполнить пунктов: ${missing}. Список в разделе «Проверка сайта».`) : null,
    h('section', { class: 'card' }, renderFields(S.SVEDEN_MAIN, sv, ctx()), h('div', { class: 'f' }, h('label', { class: 'fl' }, 'Показать в предпросмотре'), sel)),
    h('section', { class: 'card' }, renderFields([S.SVEDEN_PAGES], sv, ctx())));
};

VIEWS.org = () => h('div', null, viewHead('Организация и контакты', 'Эти данные подставляются по всему сайту через переменные ({{phone}}, {{price}}, {{address}}…), а также в разметку для Яндекса, Google и нейросетей.'), groupsForm(S.ORG, st.content.org));

function snippetPreview() {
  const box = h('div', { class: 'snippet' });
  const draw = () => {
    const files = renderSite(st.content, { only: 'html', preview: true });
    const t = (files['index.html'].match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const d = (files['index.html'].match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    const dec = (x) => { const e = document.createElement('textarea'); e.innerHTML = x; return e.value; };
    box.innerHTML = '';
    box.append(h('div', { class: 'sn-url' }, ic('sun', 14), st.content.site.domain), h('div', { class: 'sn-title' }, dec(t)), h('div', { class: 'sn-desc' }, dec(d)));
  };
  draw();
  const t = setInterval(() => { if (!document.body.contains(box)) { clearInterval(t); return; } draw(); }, 1500);
  return h('div', null, h('div', { class: 'fl' }, 'Так страница выглядит в поиске (примерно)'), box);
}
VIEWS.seo = () => {
  const url = st.content.site.url;
  const enc = encodeURIComponent(url);
  return h('div', null,
    viewHead('SEO и нейропоиск', 'Заголовок и описание для поисковиков, картинка для мессенджеров, подключение Яндекс Вебмастера и Метрики.'),
    groupsForm(S.SEO, st.content.seo),
    h('section', { class: 'card' }, h('h3', null, 'Проверить сайт'),
      h('div', { class: 'links' },
        h('a', { href: '../llms.txt', target: '_blank' }, 'llms.txt (справка для нейросетей)'),
        h('a', { href: '../robots.txt', target: '_blank' }, 'robots.txt'),
        h('a', { href: '../sitemap.xml', target: '_blank' }, 'sitemap.xml'),
        h('a', { href: 'https://webmaster.yandex.ru/tools/microtest/', target: '_blank', rel: 'noopener' }, 'Валидатор микроразметки Яндекса'),
        h('a', { href: 'https://search.google.com/test/rich-results?url=' + enc, target: '_blank', rel: 'noopener' }, 'Проверка расширенных результатов Google'),
        h('a', { href: 'https://pagespeed.web.dev/analysis?url=' + enc, target: '_blank', rel: 'noopener' }, 'Скорость загрузки (PageSpeed)'),
        h('a', { href: 'https://webmaster.yandex.ru/', target: '_blank', rel: 'noopener' }, 'Яндекс Вебмастер'))));
};
VIEWS.header = () => h('div', null, viewHead('Шапка и меню', 'Ссылка вида #safety ведёт на раздел с таким якорем. Список якорей подсказывается при вводе.'), groupsForm(S.HEADER, st.content.header));
VIEWS.footer = () => h('div', null, viewHead('Подвал', 'Нижняя часть страницы.'), groupsForm(S.FOOTER, st.content.footer));

const DEFAULT_COLORS = { moss: '#7C875B', 'moss-deep': '#66714A', 'moss-tint': '#EDF0E3', wood: '#5A493A', river: '#7EAEC2', linen: '#FAF5EF', 'linen-deep': '#F3EADC', cream: '#FFFDF9', navy: '#2E376B', 'navy-soft': '#E6E8F0', sun: '#EE3723', 'sun-soft': '#FCEAE6', ink: '#4A3D30', muted: '#736456', hairline: '#E4D9C9' };
VIEWS.theme = () => {
  const th = st.content.theme = st.content.theme || {};
  th.colors = th.colors || {};
  const colorFields = Object.keys(S.COLOR_LABELS).map((k) => ({ k, t: 'color', label: S.COLOR_LABELS[k], width: 'half' }));
  const colorsCard = h('section', { class: 'card' }, h('h3', null, 'Цвета'), renderFields(colorFields, th.colors, ctx()),
    h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { if (confirm('Вернуть исходные цвета сайта?')) { th.colors = { ...DEFAULT_COLORS }; onChange(); go('theme'); } } }, 'Вернуть исходные цвета'));
  return h('div', null, viewHead('Цвета и оформление', 'Цвета применяются ко всему сайту сразу. Шрифты: Lora (заголовки), Roboto Flex (текст), Marck Script (рукописные фразы).'), colorsCard, groupsForm(S.THEME, th));
};

VIEWS.vars = () => {
  st.content.vars = st.content.vars || [];
  const cur = renderTokenValues();
  return h('div', null,
    viewHead('Переменные', 'Пишите {{имя}} в любом тексте сайта, и при сборке туда подставится значение. Поменяли цену в одном месте, и она обновилась везде.'),
    h('section', { class: 'card' }, h('h3', null, 'Свои переменные'),
      renderFields([{ k: 'vars', t: 'list', label: 'Переменные', titleKey: 'key', item: [{ k: 'key', t: 'text', label: 'Имя (латиницей)', width: 'half' }, { k: 'value', t: 'text', label: 'Значение', width: 'half' }, { k: 'note', t: 'text', label: 'Где используется (для себя)' }], add: { key: 'newVar', value: '', note: '' } }], st.content, ctx())),
    h('section', { class: 'card' }, h('h3', null, 'Встроенные переменные'), h('p', { class: 'muted small' }, 'Берутся из раздела «Организация и контакты».'),
      h('table', { class: 'tbl' }, h('tbody', null, S.BUILTIN_TOKENS.map(([k, t]) => h('tr', null, h('td', null, h('code', null, `{{${k}}}`)), h('td', null, t), h('td', { class: 'muted' }, cur[k] || '')))))));
};
function renderTokenValues() {
  const o = st.content.org || {}, l = o.links || {}, r = o.rating || {};
  return { price: o.priceDisplay, phone: o.phone, tel: o.tel, phone2: o.phone2, tel2: o.tel2, email: o.email, address: o.address && o.address.short, hours: o.hoursText, classSize: o.classSize, grades: o.grades, director: o.director && o.director.name, gis: l.gis, vk: l.vk, max: l.max, telegram: l.telegram, yandexMaps: l.yandexMaps, rating: r.value, ratingCount: r.count, reviewsCount: r.reviews, year: String(new Date().getFullYear()), name: o.name, domain: st.content.site.domain };
}

/* ================= Медиатека ================= */
async function loadRepoImages(force) {
  if (st.repoFiles && !force) return st.repoFiles;
  const files = await st.gh.listDir(IMG_DIR);
  st.repoFiles = files.filter((f) => f.type === 'file' && /\.(webp|jpe?g|png|gif|svg)$/i.test(f.name));
  return st.repoFiles;
}
function mediaGroups(files) {
  const groups = new Map();
  const add = (path, size, pending, dl) => {
    if (st.deletions.has(path)) return;
    const key = groupKey(path);
    if (!groups.has(key)) groups.set(key, { key, files: [], pending: false, size: 0 });
    const g = groups.get(key);
    const m = path.match(/-(\d{2,4})\.(webp|jpe?g|png)$/i);
    g.files.push({ path, w: m ? +m[1] : 0, size, dl });
    g.size += size || 0; if (pending) g.pending = true;
  };
  files.forEach((f) => add(f.path, f.size, false, f.download_url));
  st.pending.forEach((p, path) => { if (path.startsWith(IMG_DIR + '/')) add(path, p.size, true); });
  const used = usedPaths(st.content);
  return [...groups.values()].map((g) => {
    g.files.sort((a, b) => a.w - b.w);
    const imgs = g.files.filter((f) => /\.(webp|jpe?g)$/i.test(f.path));
    g.thumb = (imgs[0] || g.files[0]).path;
    g.thumbDl = (imgs[0] || g.files[0]).dl;
    g.used = g.files.some((f) => used.has(f.path));
    g.name = g.key.split('/').pop();
    g.system = /^(icon-\d+|logo-za-gorizont|og-za-gorizont)$/.test(g.name);
    return g;
  }).sort((a, b) => (b.pending - a.pending) || a.name.localeCompare(b.name));
}
function groupToValue(g) {
  const imgs = g.files.filter((f) => /\.(webp|jpe?g)$/i.test(f.path) && f.w);
  const main = imgs.length ? imgs : g.files;
  const big = main[main.length - 1];
  const png = g.files.find((f) => /\.png$/i.test(f.path));
  return new Promise((res) => {
    const im = new Image();
    const done = () => res({ src: big.path, srcset: main.length > 1 ? main.map((f) => `${f.path} ${f.w}w`).join(', ') : '', w: im.naturalWidth || big.w || 0, h: im.naturalHeight || 0, alt: '', ...(png && png.path !== big.path ? { png: png.path } : {}) });
    im.onload = done; im.onerror = done;
    im.src = assetUrl(big.path);
  });
}
function thumbImg(g) {
  const im = h('img', { src: assetUrl(g.thumb), alt: '', loading: 'lazy' });
  im.addEventListener('error', () => { if (g.thumbDl && im.src !== g.thumbDl) im.src = g.thumbDl; }, { once: true });
  return im;
}
async function handleUploads(fileList, opts = {}) {
  const files = [...fileList].filter((f) => /^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name));
  if (!files.length) { toast('Выберите картинки (JPG, PNG, WebP)', 'err'); return []; }
  const out = [];
  for (const f of files) {
    try {
      toast(`Обрабатываю ${f.name}…`, 'info', 1800);
      const r = await processImage(f, opts);
      for (const v of r.variants) {
        st.pending.set(v.path, { blob: v.blob, url: await readAsDataURL(v.blob), size: v.blob.size });
        await pendingStore.put(v.path, v.blob);
      }
      out.push(r.value);
      toast(`Готово: ${f.name} → ${r.variants.length} файла, ${kb(r.bytes)}`, 'ok');
    } catch (e) { toast(e.message, 'err', 7000); }
  }
  onChange();
  return out;
}
async function uploadFile(file, dir) {
  if (file.size > 25 * 1048576) { toast('Файл больше 25 МБ. Сожмите его, иначе сайт будет грузиться долго.', 'err', 7000); return null; }
  if (/^image\//.test(file.type) && dir.startsWith('assets/img')) { const v = await handleUploads([file]); return v[0] && v[0].src; }
  const ext = (file.name.match(/\.([a-z0-9]+)$/i) || [, 'bin'])[1].toLowerCase();
  const path = `${dir}/${translit(file.name.replace(/\.[^.]+$/, ''), 40)}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  st.pending.set(path, { blob: file, url: file.size < 6 * 1048576 ? await readAsDataURL(file) : URL.createObjectURL(file), size: file.size });
  await pendingStore.put(path, file);
  onChange();
  toast(`Файл добавлен: ${file.name}. Отправится при публикации.`, 'ok');
  return path;
}
function dropZone(onFiles, text = 'Перетащите фото сюда или нажмите, чтобы выбрать') {
  const input = h('input', { type: 'file', accept: 'image/*,.heic,.heif', multiple: true, hidden: true });
  const z = h('div', { class: 'drop', tabindex: '0', role: 'button', onclick: () => input.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); } }, ic('plus', 22), h('span', null, text), h('small', { class: 'muted' }, 'Фото сами уменьшатся и сохранятся в WebP двух размеров'), input);
  input.addEventListener('change', () => { onFiles(input.files); input.value = ''; });
  z.addEventListener('dragover', (e) => { e.preventDefault(); z.classList.add('over'); });
  z.addEventListener('dragleave', () => z.classList.remove('over'));
  z.addEventListener('drop', (e) => { e.preventDefault(); z.classList.remove('over'); onFiles(e.dataTransfer.files); });
  return z;
}
VIEWS.media = () => {
  const grid = h('div', { class: 'media-grid' }, h('p', { class: 'muted' }, 'Загружаю список файлов…'));
  const draw = async (force) => {
    let files = [];
    try { files = await loadRepoImages(force); } catch (e) { toast(e.message, 'err'); }
    const groups = mediaGroups(files);
    grid.innerHTML = '';
    if (!groups.length) grid.append(h('p', { class: 'muted' }, 'Пока пусто.'));
    groups.forEach((g) => {
      grid.append(h('figure', { class: 'card m-tile' + (g.used ? '' : ' unused') },
        h('div', { class: 'm-img' }, thumbImg(g)),
        h('figcaption', null, h('b', { title: g.name }, g.name),
          h('div', { class: 'm-tags' }, g.pending ? h('span', { class: 'tag blue' }, 'новое') : null, g.used ? h('span', { class: 'tag green' }, 'на сайте') : g.system ? h('span', { class: 'tag' }, 'служебный') : h('span', { class: 'tag' }, 'не используется'), h('span', { class: 'muted small' }, `${g.files.length} файл. · ${kb(g.size)}`)),
          h('div', { class: 'row' },
            h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(g.files[g.files.length - 1].path); toast('Путь скопирован', 'ok', 1500); } }, 'Путь'),
            !g.used && !g.system ? h('button', { type: 'button', class: 'btn sm ghost danger', onclick: async () => {
              if (!confirm(`Удалить «${g.name}» из репозитория? Файлы удалятся при публикации.`)) return;
              for (const f of g.files) { if (st.pending.has(f.path)) { st.pending.delete(f.path); await pendingStore.del(f.path); } else st.deletions.add(f.path); }
              onChange(); draw();
            } }, 'Удалить') : null))));
    });
  };
  draw();
  return h('div', null,
    viewHead('Медиатека', 'Все картинки сайта. Новые файлы и удаления применяются при публикации.', h('button', { type: 'button', class: 'btn ghost', onclick: () => draw(true) }, ic('refresh', 15), 'Обновить список')),
    dropZone(async (fl) => { await handleUploads(fl); draw(); }),
    st.deletions.size ? h('p', { class: 'note' }, `Будет удалено файлов: ${st.deletions.size}. `, h('button', { type: 'button', class: 'link', onclick: () => { st.deletions.clear(); onChange(); go('media'); } }, 'Отменить удаление')) : null,
    grid);
};
function pickImage(cb, opts = {}) {
  const grid = h('div', { class: 'media-grid pick' }, h('p', { class: 'muted' }, 'Загружаю…'));
  const m = modal({ title: 'Выберите картинку', wide: true, body: h('div', null, dropZone(async (fl) => {
    const vals = await handleUploads([fl[0]], opts);
    if (vals[0]) { cb(vals[0]); m.close(); }
  }, opts.ogImage ? 'Загрузить картинку (обрежется до 1200×630)' : 'Загрузить новое фото'), grid) });
  loadRepoImages().catch(() => []).then((files) => {
    const groups = mediaGroups(files || []).filter((g) => !/^(icon-|favicon)/.test(g.name));
    grid.innerHTML = '';
    groups.forEach((g) => grid.append(h('button', { type: 'button', class: 'card m-tile pickable', onclick: async () => { cb(await groupToValue(g)); m.close(); } },
      h('div', { class: 'm-img' }, thumbImg(g)), h('span', { class: 'm-name' }, g.name))));
  });
}
function pickIcon(cur, cb) {
  const q = h('input', { type: 'search', placeholder: 'Поиск иконки…' });
  const grid = h('div', { class: 'icon-grid' });
  const draw = () => {
    grid.innerHTML = '';
    Object.entries(ICONS).filter(([k, v]) => !q.value || (v.label + k).toLowerCase().includes(q.value.toLowerCase())).forEach(([k, v]) => {
      grid.append(h('button', { type: 'button', class: 'icon-i' + (k === cur ? ' on' : ''), title: v.label, onclick: () => { cb(k); m.close(); } }, h('span', { class: 'i', html: icon(k, 24, 1.7) }), h('small', null, v.label)));
    });
  };
  q.addEventListener('input', draw);
  draw();
  const m = modal({ title: 'Выберите иконку', body: h('div', null, q, grid), wide: true });
}

/* ================= Проверка ================= */
VIEWS.check = () => {
  const { errors, warnings } = validate(st.content);
  const item = (x, cls) => h('li', { class: cls }, h('b', null, x.where), ' ', x.msg);
  return h('div', null,
    viewHead('Проверка сайта', 'Ошибки не дают опубликовать сайт. Подсказки помогают поиску и нейросетям, но не обязательны.'),
    h('section', { class: 'card' }, h('h3', null, errors.length ? `Ошибки: ${errors.length}` : 'Ошибок нет'), errors.length ? h('ul', { class: 'checks' }, errors.map((x) => item(x, 'err'))) : h('p', { class: 'muted' }, 'Сайт можно публиковать.')),
    h('section', { class: 'card' }, h('h3', null, `Подсказки: ${warnings.length}`), warnings.length ? h('ul', { class: 'checks' }, warnings.map((x) => item(x, 'warn'))) : h('p', { class: 'muted' }, 'Всё отлично.')));
};

/* ================= История ================= */
VIEWS.history = () => {
  const box = h('div', null, h('p', { class: 'muted' }, 'Загружаю историю…'));
  st.gh.commits(CONTENT, 40).then((list) => {
    box.innerHTML = '';
    if (!list.length) { box.append(h('p', { class: 'muted' }, 'История пуста.')); return; }
    list.forEach((c, i) => {
      box.append(h('div', { class: 'card hist' },
        h('div', null, h('b', null, c.commit.message.split('\n')[0]), h('div', { class: 'muted small' }, `${fmtDate(c.commit.author.date)} · ${c.commit.author.name}${i === 0 ? ' · текущая версия' : ''}`)),
        h('div', { class: 'row' },
          i === 0 ? null : h('button', { type: 'button', class: 'btn sm ghost', onclick: async () => {
            try { const old = await st.gh.readJson(CONTENT, c.sha); const files = renderSite(old, { css: st.css, js: st.js, base: '../', preview: true, only: 'html' }); if (!st.previewOpen) togglePreview(); $('#pvFrame').srcdoc = files['index.html']; toast('В предпросмотре старая версия. Нажмите «Обновить» над предпросмотром, чтобы вернуть текущую.', 'info', 6000); } catch (e) { toast(e.message, 'err'); }
          } }, 'Посмотреть'),
          i === 0 ? null : h('button', { type: 'button', class: 'btn sm', onclick: async () => {
            if (!confirm('Загрузить эту версию в редактор? Текущие неопубликованные правки заменятся. После этого нажмите «Опубликовать».')) return;
            try { st.content = await st.gh.readJson(CONTENT, c.sha); onChange(); toast('Версия загружена. Проверьте и опубликуйте.', 'ok'); go('dashboard'); } catch (e) { toast(e.message, 'err'); }
          } }, 'Вернуть эту версию'),
          c.html_url && c.html_url !== '#' ? h('a', { class: 'btn sm ghost', href: c.html_url, target: '_blank', rel: 'noopener' }, 'На GitHub') : null)));
    });
  }).catch((e) => { box.innerHTML = ''; box.append(h('p', { class: 'err' }, e.message)); });
  return h('div', null, viewHead('История версий', 'Каждая публикация сохраняется. Можно посмотреть и вернуть любую.'), box);
};

/* ================= Настройки ================= */
VIEWS.settings = () => {
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  file.addEventListener('change', async () => {
    try { const j = JSON.parse(await file.files[0].text()); if (!j.sections || !j.org) throw new Error('Это не файл контента сайта'); st.content = j; onChange(); toast('Контент загружен из файла. Проверьте и опубликуйте.', 'ok'); go('dashboard'); } catch (e) { toast('Не удалось прочитать файл: ' + e.message, 'err'); }
  });
  const exp = st.gh.tokenExpires ? new Date(st.gh.tokenExpires.replace(' UTC', 'Z').replace(' ', 'T')) : null;
  const daysLeft = exp ? Math.round((exp - Date.now()) / 864e5) : null;
  return h('div', null,
    viewHead('Настройки', ''),
    h('section', { class: 'card' }, h('h3', null, 'Подключение'),
      h('table', { class: 'tbl' }, h('tbody', null,
        h('tr', null, h('td', null, 'Репозиторий'), h('td', null, st.gh.repo)),
        h('tr', null, h('td', null, 'Ветка'), h('td', null, st.gh.branch)),
        h('tr', null, h('td', null, 'Пользователь'), h('td', null, st.user ? `${st.user.login}${st.user.name ? ' (' + st.user.name + ')' : ''}` : '')),
        h('tr', null, h('td', null, 'Токен действует до'), h('td', { class: daysLeft !== null && daysLeft < 14 ? 'err' : '' }, exp ? `${exp.toLocaleDateString('ru-RU')} (осталось ${daysLeft} дн.)` : 'без срока или неизвестно')))),
      h('button', { type: 'button', class: 'btn ghost danger', onclick: () => { if (!isDirty() || confirm('Есть неопубликованные изменения. Выйти всё равно? Черновик текста останется в браузере.')) logout(); } }, 'Выйти и забыть токен')),
    h('section', { class: 'card' }, h('h3', null, 'Резервная копия'),
      h('p', { class: 'muted small' }, 'Весь текст сайта хранится в одном файле content/site.json. Его можно скачать и потом загрузить обратно.'),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn', onclick: () => { const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(st.content, null, 2)], { type: 'application/json' })), download: `site-${today()}.json` }); a.click(); } }, 'Скачать контент'),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => file.click() }, 'Загрузить из файла'), file)),
    h('section', { class: 'card' }, h('h3', null, 'Адрес сайта'), renderFields([{ k: 'domain', t: 'text', label: 'Домен (как пишется)', width: 'half' }, { k: 'url', t: 'text', label: 'Адрес для поисковиков (punycode)', width: 'half', help: 'Для кириллического домена: https://xn--38-6kcmscg5bgct2a.xn--p1ai/' }], st.content.site, ctx())));
};

/* ================= Публикация ================= */
function changeSummary() {
  const o = JSON.parse(st.original), c = st.content, out = [];
  const names = { org: 'Организация и контакты', seo: 'SEO', header: 'Шапка и меню', footer: 'Подвал', theme: 'Оформление', vars: 'Переменные', site: 'Адрес сайта' };
  for (const k of Object.keys(names)) if (JSON.stringify(o[k]) !== JSON.stringify(c[k])) out.push(names[k]);
  const os = o.sections || [], cs = c.sections || [];
  if (os.map((s) => s.type + s.id).join() !== cs.map((s) => s.type + s.id).join()) out.push('Порядок или состав разделов');
  cs.forEach((s) => {
    const prev = os.find((x) => x.id === s.id && x.type === s.type);
    if (prev && JSON.stringify(prev) !== JSON.stringify(s)) out.push((S.SECTIONS[s.type] || {}).label + (s.title ? ` «${plain(s.title).slice(0, 30)}»` : ''));
  });
  return out;
}
function revertAll() {
  if (!confirm('Отменить все неопубликованные изменения и новые файлы?')) return;
  st.content = JSON.parse(st.original);
  st.pending.clear(); st.deletions.clear(); pendingStore.clear();
  localStorage.removeItem(LS.draft(st.gh.repo));
  onChange(); go(st.view.startsWith('section:') ? 'sections' : st.view);
  toast('Изменения отменены', 'ok');
}
async function publish() {
  if (!isDirty() || st.publishing) return;
  const { errors, warnings } = validate(st.content);
  if (errors.length) {
    modal({ title: 'Сначала исправьте ошибки', body: h('ul', { class: 'checks' }, errors.map((x) => h('li', { class: 'err' }, h('b', null, x.where), ' ', x.msg))), actions: [{ label: 'Понятно', primary: true, onClick: (c) => { c(); go('check'); } }] });
    return;
  }
  const changes = changeSummary();
  const used = usedPaths(st.content);
  const pend = [...st.pending.entries()];
  const unusedNew = pend.filter(([p]) => !used.has(p) && !used.has(p.replace(/-\d+\.\w+$/, '')));
  const bytes = pend.reduce((s, [, v]) => s + (v.size || 0), 0);
  const msg = h('input', { type: 'text', value: changes.length ? 'Изменено: ' + changes.slice(0, 4).join(', ') + (changes.length > 4 ? ' и др.' : '') : 'Обновление файлов сайта' });
  modal({
    title: 'Опубликовать изменения?',
    body: h('div', null,
      changes.length ? h('div', null, h('div', { class: 'fl' }, 'Что изменилось'), h('ul', { class: 'chg' }, changes.map((c) => h('li', null, c)))) : null,
      pend.length ? h('p', null, `Новых файлов: ${pend.length} (${kb(bytes)})${unusedNew.length ? `, из них пока не стоят на сайте: ${unusedNew.length}` : ''}.`) : null,
      st.deletions.size ? h('p', null, `Удалить файлов: ${st.deletions.size}.`) : null,
      warnings.length ? h('p', { class: 'muted small' }, `Подсказок по SEO: ${warnings.length}. Они не мешают публикации.`) : null,
      h('label', { class: 'fl' }, 'Комментарий к версии'), msg),
    actions: [{ label: 'Отмена', ghost: true, onClick: (c) => c() }, { label: 'Опубликовать', primary: true, onClick: (c) => { c(); doPublish(msg.value.trim() || 'Правка сайта через админку'); } }],
  });
}
async function doPublish(message, force = false) {
  st.publishing = 'Подготовка…'; updateStatus();
  try {
    st.content.updated = today();
    const files = [];
    const pend = [...st.pending.entries()];
    let done = 0;
    for (const [path, p] of pend) {
      files.push({ path, base64: await blobToBase64(p.blob), onDone: () => { done++; st.publishing = `Отправка файлов ${done}/${pend.length}…`; updateStatus(); } });
    }
    for (const path of st.deletions) files.push({ path, delete: true });
    files.push({ path: CONTENT, text: JSON.stringify(st.content, null, 2) + '\n' });
    // Готовые страницы кладём в репозиторий вместе с контентом: сайт обновится, даже если сборка на GitHub Actions не настроена
    try {
      const built = renderSite(st.content, { css: st.css, js: st.js, base: '' });
      for (const [name, text] of Object.entries(built)) files.push({ path: name, text });
    } catch (e) { throw new Error('Не удалось собрать страницы сайта: ' + e.message); }
    st.publishing = 'Сохраняю в GitHub…'; updateStatus();
    let sha;
    try {
      sha = await st.gh.commitFiles(files, message + '\n\nОпубликовано из админки сайта', force ? null : st.baseSha);
    } catch (e) {
      if (!e.conflict) throw e;
      // кто-то изменил репозиторий: если сам файл контента не менялся, просто публикуем поверх
      const [a, b] = await Promise.all([st.gh.fileSha(CONTENT, st.baseSha), st.gh.fileSha(CONTENT, e.head || st.gh.branch)]);
      if (a && a === b) sha = await st.gh.commitFiles(files, message + '\n\nОпубликовано из админки сайта', null);
      else { st.publishing = null; updateStatus(); conflictDialog(message); return; }
    }
    st.baseSha = sha;
    st.original = JSON.stringify(st.content);
    await pendingStore.clear();
    const keep = new Map(st.pending); st.pending.clear();
    st.recent = new Map([...(st.recent || new Map()), ...keep]); // сайт обновится не сразу: пока показываем новые фото из памяти
    st.deletions.clear(); st.repoFiles = null;
    localStorage.removeItem(LS.draft(st.gh.repo));
    st.publishing = null;
    st.lastRun = { sha, state: 'building', at: Date.now() };
    updateStatus();
    toast('Сохранено в GitHub. Сайт обновится через 1–2 минуты.', 'ok', 6000);
    if (st.view === 'dashboard' || st.view === 'media') go(st.view);
    watchRun(sha);
  } catch (e) {
    st.publishing = null; updateStatus();
    modal({ title: 'Не получилось опубликовать', body: h('div', null, h('p', null, e.message), h('p', { class: 'muted small' }, 'Изменения не потеряны: они остаются в админке и в черновике браузера. Попробуйте ещё раз.')), actions: [{ label: 'Понятно', primary: true, onClick: (c) => c() }] });
  }
}
function conflictDialog(message) {
  modal({
    title: 'Сайт изменили параллельно',
    body: h('div', null, h('p', null, 'После того как вы открыли админку, кто-то опубликовал другую версию (возможно, вы сами в другой вкладке или на другом устройстве).'),
      h('p', null, 'Можно перезаписать её вашими изменениями или скачать ваши правки в файл и загрузить свежую версию.')),
    actions: [
      { label: 'Скачать мои правки и обновить', ghost: true, onClick: (c) => { const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(st.content, null, 2)])), download: `moi-pravki-${today()}.json` }); a.click(); localStorage.removeItem(LS.draft(st.gh.repo)); st.original = JSON.stringify(st.content); setTimeout(() => location.reload(), 600); c(); } },
      { label: 'Перезаписать моими', danger: true, onClick: (c) => { c(); doPublish(message, true); } },
    ],
  });
}
async function watchRun(sha) {
  const started = Date.now();
  let warned = false;
  while (Date.now() - started < 8 * 60 * 1000) {
    await new Promise((r) => setTimeout(r, 6000));
    if (!st.lastRun || st.lastRun.sha !== sha) return;
    try {
      const r = await st.gh.runsFor(sha);
      const run = r && r.workflow_runs && r.workflow_runs[0];
      if (!run) continue;
      if (run.status === 'completed') {
        if (run.conclusion === 'success') { st.lastRun.state = 'done'; updateStatus(); toast('Сайт обновлён!', 'ok', 6000); }
        else { st.lastRun.state = 'failed'; updateStatus(); modal({ title: 'Сборка сайта не прошла', body: h('div', null, h('p', null, 'Изменения сохранены в репозитории, но GitHub не смог собрать сайт. На сайте пока предыдущая версия.'), h('p', null, h('a', { href: run.html_url, target: '_blank', rel: 'noopener' }, 'Открыть журнал сборки на GitHub'))), actions: [{ label: 'Понятно', primary: true, onClick: (c) => c() }] }); }
        return;
      }
    } catch (e) {
      if ((e.status === 403 || e.status === 404) && !warned) { warned = true; st.lastRun.state = 'unknown'; updateStatus(); return; }
    }
  }
}

/* ================= Старт ================= */
(async function start() {
  const s = loadSession();
  if (MOCK && !new URLSearchParams(location.search).has('login')) { try { await connect({ repo: 'demo/zagorizont', branch: 'main', token: 'mock' }); return; } catch (e) { showLogin(e.message); return; } }
  if (s && s.token) {
    document.body.innerHTML = '<div class="loading">Подключаюсь к GitHub…</div>';
    try { await connect(s); return; } catch (e) { showLogin(e.message); return; }
  }
  showLogin();
})();
