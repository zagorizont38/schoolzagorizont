// Проверка контента перед публикацией. Ошибки блокируют сборку, предупреждения только подсказывают.
import { SECTION_TYPES, plain } from './render.js';

const has = (s) => s !== undefined && s !== null && String(s).trim() !== '';
const arr = (a) => (Array.isArray(a) ? a : []);

export function validate(c) {
  const errors = [], warnings = [];
  const err = (where, msg) => errors.push({ where, msg });
  const warn = (where, msg) => warnings.push({ where, msg });
  if (!c || typeof c !== 'object') { err('Файл', 'Контент пустой или повреждён'); return { errors, warnings }; }
  if (!c.site || !has(c.site.url)) err('Настройки сайта', 'Не указан адрес сайта (site.url)');
  if (!c.org || !has(c.org.name)) err('Организация', 'Не указано название');
  if (!c.seo || !has(c.seo.title)) err('SEO', 'Не заполнен заголовок страницы (title)');
  if (!Array.isArray(c.sections)) err('Разделы', 'Список разделов повреждён');

  const seo = c.seo || {};
  const tl = plain(seo.title).length, dl = plain(seo.description).length;
  if (tl > 75) warn('SEO', `Заголовок страницы длинный: ${tl} символов. Поисковики покажут примерно 60–70.`);
  if (tl && tl < 30) warn('SEO', `Заголовок страницы короткий: ${tl} символов. Добавьте город и тип школы.`);
  if (!has(seo.description)) warn('SEO', 'Нет описания страницы (description)');
  else if (dl > 180) warn('SEO', `Описание длинное: ${dl} символов. Хорошо 120–170.`);
  else if (dl < 90) warn('SEO', `Описание короткое: ${dl} символов. Хорошо 120–170.`);
  if (!seo.ogImage || !has(seo.ogImage.src)) warn('SEO', 'Нет картинки для соцсетей и мессенджеров (OG)');
  if (!has(seo.yandexVerification)) warn('SEO', 'Не подтверждены права в Яндекс Вебмастере (код yandex-verification)');
  if (!has(seo.metrikaId)) warn('SEO', 'Не подключена Яндекс Метрика');

  const o = c.org || {};
  if (!has(o.phone)) warn('Организация', 'Не указан телефон');
  if (!o.address || !has(o.address.short)) warn('Организация', 'Не указан адрес');
  if (!has(o.legalName) && !has(o.inn)) warn('Организация', 'Не заполнены юрлицо и ИНН: нейросети и родители больше доверяют сайтам с реквизитами');
  if (!has(o.license)) warn('Организация', 'Не указана образовательная лицензия');

  const ids = new Set();
  let h1 = 0;
  arr(c.sections).forEach((s, i) => {
    const where = `Раздел ${i + 1}${s && s.title ? ' «' + plain(s.title).slice(0, 40) + '»' : s && s.type ? ' (' + s.type + ')' : ''}`;
    if (!s || !SECTION_TYPES.includes(s.type)) { err(where, `Неизвестный тип раздела: ${s && s.type}`); return; }
    if (s.enabled === false) return;
    if (s.type === 'hero') h1++;
    if (has(s.id)) {
      if (!/^[a-z][a-z0-9_-]*$/i.test(s.id)) err(where, `Якорь «${s.id}» должен быть латиницей без пробелов`);
      if (ids.has(s.id)) err(where, `Якорь «${s.id}» уже используется в другом разделе`);
      ids.add(s.id);
    }
    // картинки без описания
    const walk = (x, path) => {
      if (!x || typeof x !== 'object') return;
      if (typeof x.src === 'string' && /\.(webp|jpe?g|png)$/i.test(x.src) && 'alt' in x && !has(x.alt) && !/gerb/.test(x.src)) warn(where, `Картинка без описания (alt): ${x.src.split('/').pop()}`);
      for (const k in x) walk(x[k], path + '.' + k);
    };
    walk(s, '');
    if (s.type === 'faq') {
      const qs = arr(s.items).filter((f) => f.enabled !== false);
      if (qs.length < 5) warn(where, 'Мало вопросов в FAQ: нейросети охотнее цитируют сайты с 8–15 ответами');
      qs.forEach((f) => { if (!has(f.a)) warn(where, `Вопрос без ответа: ${plain(f.q)}`); });
    }
  });
  if (h1 === 0) warn('Разделы', 'Нет первого экрана: у страницы не будет заголовка H1');
  if (h1 > 1) warn('Разделы', 'Первых экранов больше одного: на странице будет несколько H1');

  // ссылки меню на несуществующие якоря
  const checkLinks = (list, where) => arr(list).forEach((l) => {
    if (l && /^#/.test(l.href || '') && l.href.length > 1 && !ids.has(l.href.slice(1)) && !/^#q-/.test(l.href)) warn(where, `Ссылка «${l.label}» ведёт на якорь ${l.href}, которого нет или раздел выключен`);
  });
  checkLinks(c.header && c.header.nav, 'Меню');
  checkLinks(c.header && c.header.mobileNav, 'Мобильное меню');
  arr(c.footer && c.footer.columns).forEach((col) => checkLinks(col.links, 'Подвал'));

  // «Сведения об образовательной организации» (приказ Рособрнадзора № 1493)
  const sv = c.sveden;
  if (has(o.license) && (!sv || sv.enabled === false)) warn('Сведения', 'Раздел «Сведения об образовательной организации» выключен. При наличии лицензии он обязателен.');
  if (sv && sv.enabled !== false) {
    const ids2 = new Set();
    arr(sv.pages).forEach((p) => {
      const where = `Сведения → ${plain(p.title || p.id)}`;
      if (!has(p.id) || !/^[a-zA-Z_]+$/.test(p.id)) err(where, 'Адрес подраздела (id) должен быть латиницей без пробелов, например common');
      else if (ids2.has(p.id)) err(where, `Адрес подраздела ${p.id} повторяется`);
      ids2.add(p.id);
      arr(p.rows).forEach((r) => { if (!has(r.value)) warn(where, `Не заполнено: «${r.label}» (строка не показывается на сайте)`); });
      arr(p.docs).forEach((d) => { if (!has(d.href)) warn(where, `Нет файла: «${d.title}» (документ не показывается на сайте)`); });
      if (p.id === 'employees' && !arr(p.people).some((x) => has(x.fio))) warn(where, 'Не указан педагогический состав');
    });
  }

  // длинные тире: стиль сайта без них
  const dash = JSON.stringify(c.sections || []).match(/—/g);
  if (dash) warn('Тексты', `Найдено длинных тире: ${dash.length}. В текстах сайта их принято заменять на точку, двоеточие или запятую.`);
  return { errors, warnings };
}
