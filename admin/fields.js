// Конструктор форм админки: по описанию полей из schema.js рисует редакторы и пишет изменения прямо в объект контента.
import { ICONS, icon } from '../core/icons.js';
import { DAYS } from './schema.js';
import { plain } from '../core/render.js';

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const ic = (name, size = 16) => h('span', { class: 'i', html: icon(name, size, 1.8) });

const openState = new WeakMap();
let uid = 0;

function helpEl(f) { return f.help ? h('small', { class: 'help' }, f.help) : null; }
function mdHint(f) { return f.md ? h('small', { class: 'help md-hint' }, 'Можно: **жирный**, [текст ссылки](https://…), переменные {{price}}') : null; }

function counterEl(input, f) {
  if (!f.counter) return null;
  const el = h('small', { class: 'counter' });
  const upd = () => {
    const n = plain(input.value).length;
    el.textContent = `${n} симв.`;
    el.className = 'counter' + (n > f.counter[1] ? ' bad' : n < f.counter[0] ? ' warn' : ' ok');
  };
  input.addEventListener('input', upd); upd();
  return el;
}

function autosize(ta) {
  const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 640) + 'px'; };
  ta.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return ta;
}

export function renderFields(fields, obj, ctx) {
  const wrap = h('div', { class: 'fields' });
  for (const f of fields) {
    const el = renderField(f, obj, ctx);
    if (el) wrap.append(el);
  }
  return wrap;
}

function fieldBox(f, ...kids) {
  return h('div', { class: `f f-${f.t}${f.width ? ' w-' + f.width : ''}` }, kids);
}
function lbl(f, forId) { return f.label ? h('label', { class: 'fl', for: forId }, f.label) : null; }

export function renderField(f, obj, ctx) {
  const id = 'f' + (++uid);
  const set = (v) => { obj[f.k] = v; ctx.onChange(f); };
  const val = obj[f.k];

  switch (f.t) {
    case 'text': case 'link': {
      const input = h('input', { id, type: 'text', value: val ?? '', list: f.t === 'link' ? 'zg-links' : null, placeholder: f.placeholder, spellcheck: f.t === 'link' ? 'false' : 'true' });
      input.addEventListener('input', () => set(input.value));
      return fieldBox(f, lbl(f, id), input, counterEl(input, f), mdHint(f), helpEl(f));
    }
    case 'textarea': case 'code': {
      const ta = h('textarea', { id, rows: f.rows || (f.t === 'code' ? 6 : 3), class: f.t === 'code' ? 'code' : null, spellcheck: f.t === 'code' ? 'false' : 'true' });
      ta.value = val ?? '';
      ta.addEventListener('input', () => set(ta.value));
      if (f.t === 'textarea') autosize(ta);
      return fieldBox(f, lbl(f, id), ta, counterEl(ta, f), mdHint(f), helpEl(f));
    }
    case 'number': {
      const input = h('input', { id, type: 'number', value: val ?? '', min: f.min, max: f.max, step: f.step || 1 });
      input.addEventListener('input', () => set(input.value === '' ? null : Number(input.value)));
      return fieldBox(f, lbl(f, id), input, helpEl(f));
    }
    case 'bool': {
      const cb = h('input', { id, type: 'checkbox', class: 'sw' });
      cb.checked = val === undefined ? f.def !== false : !!val;
      cb.addEventListener('change', () => set(cb.checked));
      return h('div', { class: 'f f-bool' }, h('label', { class: 'switch', for: id }, cb, h('span', { class: 'track' }), h('span', null, f.label)), helpEl(f));
    }
    case 'select': {
      const s = h('select', { id }, f.options.map(([v, t]) => h('option', { value: v, selected: (val ?? f.options[0][0]) === v }, t)));
      s.addEventListener('change', () => set(s.value));
      return fieldBox(f, lbl(f, id), s, helpEl(f));
    }
    case 'color': {
      const norm = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#000000');
      const pick = h('input', { type: 'color', value: norm(val), 'aria-label': f.label });
      const input = h('input', { id, type: 'text', value: val ?? '', spellcheck: 'false' });
      pick.addEventListener('input', () => { input.value = pick.value; set(pick.value); });
      input.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(input.value)) pick.value = input.value; set(input.value); });
      return fieldBox(f, lbl(f, id), h('div', { class: 'color-row' }, pick, input), helpEl(f));
    }
    case 'icon': {
      const btn = h('button', { type: 'button', class: 'icon-btn', id });
      const draw = () => { btn.innerHTML = ''; btn.append(h('span', { class: 'i', html: icon(obj[f.k] || 'checkCircle', 20, 1.7) }), h('span', null, (ICONS[obj[f.k]] || {}).label || 'Выбрать')); };
      draw();
      btn.addEventListener('click', () => ctx.pickIcon(obj[f.k], (name) => { set(name); draw(); }));
      return fieldBox(f, lbl(f, id), btn);
    }
    case 'image': return imageField(f, obj, ctx, set);
    case 'imagelist': {
      if (!Array.isArray(obj[f.k])) obj[f.k] = [];
      const list = obj[f.k];
      const box = h('div', { class: 'imagelist' });
      const n = f.max || Math.max(list.length + 1, 1);
      for (let i = 0; i < n; i++) {
        const holder = {}; Object.defineProperty(holder, 'v', { get: () => list[i] || null, set: (x) => { list[i] = x; }, enumerable: true });
        box.append(imageField({ k: 'v', label: `Фото ${i + 1}` }, holder, ctx, (x) => { list[i] = x; ctx.onChange(f); }));
      }
      return fieldBox(f, lbl(f, id), box, helpEl(f));
    }
    case 'file': {
      const input = h('input', { id, type: 'text', value: val ?? '', spellcheck: 'false', placeholder: 'assets/… или https://…' });
      input.addEventListener('input', () => set(input.value));
      const file = h('input', { type: 'file', accept: f.accept || '*/*', hidden: true });
      const up = h('button', { type: 'button', class: 'btn sm' }, ic('plus', 14), 'Загрузить файл');
      up.addEventListener('click', () => file.click());
      file.addEventListener('change', async () => {
        if (!file.files[0]) return;
        const p = await ctx.uploadFile(file.files[0], f.dir || 'assets/files');
        if (p) { input.value = p; set(p); }
        file.value = '';
      });
      return fieldBox(f, lbl(f, id), h('div', { class: 'file-row' }, input, up, file), helpEl(f));
    }
    case 'group': {
      if (!obj[f.k] || typeof obj[f.k] !== 'object') obj[f.k] = {};
      return h('fieldset', { class: 'group' }, h('legend', null, f.label), renderFields(f.fields, obj[f.k], ctx), helpEl(f));
    }
    case 'tags': {
      const input = h('input', { id, type: 'text', value: Array.isArray(val) ? val.join(', ') : (val || '') });
      input.addEventListener('input', () => set(input.value.split(',').map((s) => s.trim()).filter(Boolean)));
      return fieldBox(f, lbl(f, id), input, helpEl(f));
    }
    case 'days': {
      if (!Array.isArray(obj[f.k])) obj[f.k] = [];
      const box = h('div', { class: 'days' }, DAYS.map(([code, name]) => {
        const cb = h('input', { type: 'checkbox' });
        cb.checked = obj[f.k].includes(code);
        cb.addEventListener('change', () => {
          const s = new Set(obj[f.k]); cb.checked ? s.add(code) : s.delete(code);
          set(DAYS.map((d) => d[0]).filter((d) => s.has(d)));
        });
        return h('label', { class: 'day' }, cb, h('span', null, name));
      }));
      return fieldBox(f, lbl(f, id), box);
    }
    case 'strings': return stringsField(f, obj, ctx);
    case 'list': return listField(f, obj, ctx);
    default: return null;
  }
}

function imageField(f, obj, ctx, set) {
  const box = h('div', { class: 'f f-image' });
  const draw = () => {
    box.innerHTML = '';
    const v = obj[f.k];
    if (f.label) box.append(h('div', { class: 'fl' }, f.label));
    const card = h('div', { class: 'img-card' + (v && v.src ? '' : ' empty') });
    if (v && v.src) {
      const thumb = h('img', { src: ctx.asset(smallest(v)), alt: '', loading: 'lazy' });
      card.append(h('button', { type: 'button', class: 'thumb', title: 'Заменить', onclick: choose }, thumb));
      const altIn = h('input', { type: 'text', value: v.alt || '', placeholder: 'Что на фото (alt): важно для поиска и незрячих' });
      altIn.addEventListener('input', () => { v.alt = altIn.value; ctx.onChange(f); });
      card.append(h('div', { class: 'img-meta' },
        h('div', { class: 'img-name' }, v.src.split('/').pop(), v.w ? h('span', null, ` · ${v.w}×${v.h}`) : null),
        altIn,
        h('div', { class: 'img-actions' },
          h('button', { type: 'button', class: 'btn sm', onclick: choose }, ic('zoom', 14), 'Заменить'),
          h('button', { type: 'button', class: 'btn sm ghost danger', onclick: () => { set(null); draw(); } }, ic('close', 14), 'Убрать'))));
    } else {
      card.append(h('button', { type: 'button', class: 'btn', onclick: choose }, ic('plus', 16), 'Выбрать или загрузить фото'));
    }
    box.append(card);
  };
  function choose() {
    ctx.pickImage((picked) => {
      const old = obj[f.k];
      const nv = { ...picked, alt: picked.alt || (old && old.alt) || '' };
      set(nv); draw();
    }, { keepPng: f.keepPng, ogImage: f.ogImage });
  }
  draw();
  return box;
}

export function smallest(v) {
  if (!v) return '';
  if (v.srcset) {
    const first = v.srcset.split(',')[0].trim().split(/\s+/)[0];
    if (first) return first;
  }
  return v.src;
}

function moveBtns(arr, i, rerender, ctx) {
  const mv = (d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; ctx.onChange(); rerender(); };
  return [
    h('button', { type: 'button', class: 'ib rot', title: 'Выше', disabled: i === 0, onclick: (e) => { e.stopPropagation(); mv(-1); } }, ic('chevronLeft', 14)),
    h('button', { type: 'button', class: 'ib rot', title: 'Ниже', disabled: i === arr.length - 1, onclick: (e) => { e.stopPropagation(); mv(1); } }, ic('chevronRight', 14)),
  ];
}

function stringsField(f, obj, ctx) {
  if (!Array.isArray(obj[f.k])) obj[f.k] = [];
  const arr = obj[f.k];
  const box = h('div', { class: 'f f-strings' });
  const draw = () => {
    box.innerHTML = '';
    box.append(h('div', { class: 'fl' }, f.label));
    arr.forEach((s, i) => {
      const input = h('input', { type: 'text', value: s ?? '' });
      input.addEventListener('input', () => { arr[i] = input.value; ctx.onChange(f); });
      box.append(h('div', { class: 'str-row' }, input, moveBtns(arr, i, draw, ctx),
        h('button', { type: 'button', class: 'ib danger', title: 'Удалить', onclick: () => { arr.splice(i, 1); ctx.onChange(f); draw(); } }, ic('close', 14))));
    });
    box.append(h('button', { type: 'button', class: 'btn sm ghost add', onclick: () => { arr.push(''); ctx.onChange(f); draw(); setTimeout(() => { const ins = box.querySelectorAll('input'); ins[ins.length - 1]?.focus(); }); } }, ic('plus', 14), 'Добавить строку'));
    const hp = helpEl(f); if (hp) box.append(hp);
  };
  draw();
  return box;
}

function itemTitle(f, item, i) {
  const t = item && typeof item === 'object' ? [item[f.titleKey], f.titleKey2 ? item[f.titleKey2] : ''].filter(Boolean).map((x) => (Array.isArray(x) ? x.join(', ') : plain(x))).join(' · ') : String(item ?? '');
  return t ? (t.length > 70 ? t.slice(0, 68) + '…' : t) : `Элемент ${i + 1}`;
}

let dragSrc = null;
function listField(f, obj, ctx) {
  if (!Array.isArray(obj[f.k])) obj[f.k] = [];
  const arr = obj[f.k];
  const box = h('div', { class: 'f f-list' + (f.compact ? ' compact' : '') });
  const draw = () => {
    box.innerHTML = '';
    box.append(h('div', { class: 'list-head' }, h('span', { class: 'fl' }, f.label), h('span', { class: 'count' }, String(arr.length))));
    const ul = h('div', { class: 'items' });
    arr.forEach((item, i) => {
      if (item === null || typeof item !== 'object') return;
      const open = f.compact ? true : (openState.get(item) ?? false);
      const row = h('div', { class: 'item' + (open ? ' open' : '') + (f.toggleKey && item[f.toggleKey] === false ? ' off' : ''), draggable: 'false' });
      const handle = h('span', { class: 'drag', title: 'Перетащите, чтобы поменять порядок', html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>' });
      handle.addEventListener('mousedown', () => row.setAttribute('draggable', 'true'));
      handle.addEventListener('touchstart', () => row.setAttribute('draggable', 'true'), { passive: true });
      row.addEventListener('dragstart', (e) => { dragSrc = { arr, i }; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(i)); } catch (er) { } });
      row.addEventListener('dragend', () => { row.classList.remove('dragging'); row.setAttribute('draggable', 'false'); });
      row.addEventListener('dragover', (e) => { if (dragSrc && dragSrc.arr === arr) { e.preventDefault(); row.classList.add('over'); } });
      row.addEventListener('dragleave', () => row.classList.remove('over'));
      row.addEventListener('drop', (e) => {
        row.classList.remove('over');
        if (!dragSrc || dragSrc.arr !== arr) return;
        e.preventDefault();
        const [m] = arr.splice(dragSrc.i, 1); arr.splice(i, 0, m); dragSrc = null; ctx.onChange(f); draw();
      });
      const title = h('span', { class: 'it-title' }, f.compact ? '' : itemTitle(f, item, i));
      const head = h('div', { class: 'it-head' }, handle,
        f.compact ? null : h('button', { type: 'button', class: 'it-toggle', onclick: () => { openState.set(item, !open); draw(); } }, h('span', { class: 'caret' }, '›'), title),
        f.toggleKey ? (() => { const cb = h('input', { type: 'checkbox', class: 'sw', title: 'Показывать на сайте' }); cb.checked = item[f.toggleKey] !== false; cb.addEventListener('change', () => { item[f.toggleKey] = cb.checked; ctx.onChange(f); draw(); }); return h('label', { class: 'switch mini' }, cb, h('span', { class: 'track' })); })() : null,
        h('span', { class: 'it-actions' }, moveBtns(arr, i, draw, ctx),
          h('button', { type: 'button', class: 'ib', title: 'Дублировать', onclick: () => { arr.splice(i + 1, 0, JSON.parse(JSON.stringify(item))); ctx.onChange(f); draw(); } }, ic('plus', 14)),
          h('button', { type: 'button', class: 'ib danger', title: 'Удалить', onclick: () => { if (ctx.confirmDelete(itemTitle(f, item, i))) { arr.splice(i, 1); ctx.onChange(f); draw(); } } }, ic('close', 14))));
      row.append(head);
      if (open) {
        const body = renderFields(f.item, item, { ...ctx, onChange: (ff) => { ctx.onChange(ff); if (!f.compact && ff && (ff.k === f.titleKey || ff.k === f.titleKey2)) title.textContent = itemTitle(f, item, i); } });
        row.append(h('div', { class: 'it-body' }, body));
      }
      ul.append(row);
    });
    box.append(ul);
    box.append(h('button', { type: 'button', class: 'btn sm ghost add', onclick: () => {
      const n = JSON.parse(JSON.stringify(f.add || {}));
      arr.push(n); openState.set(n, true); ctx.onChange(f); draw();
    } }, ic('plus', 14), 'Добавить'));
    const hp = helpEl(f); if (hp) box.append(hp);
  };
  draw();
  return box;
}
