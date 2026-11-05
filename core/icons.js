// Библиотека иконок сайта. Ключ используется в content/site.json, в админке их можно выбирать из списка.
// Все иконки рисуются в квадрате 24x24 обводкой currentColor.

export const ICONS = {
  document: { label: 'Документ', svg: '<path d="M9 12h6M9 16h4"/><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>' },
  docCheck: { label: 'Документ с галочкой', svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>' },
  card: { label: 'Банковская карта', svg: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/>' },
  wallet: { label: 'Кошелёк, оплата', svg: '<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.6"/><path d="M6 6V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>' },
  heart: { label: 'Сердце', svg: '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>' },
  sun: { label: 'Солнце', svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
  sprout: { label: 'Росток', svg: '<path d="M12 22V8"/><path d="M12 14c-5 0-7-3-6.5-7C10 6.5 12 9.5 12 14z" fill="currentColor" fill-opacity=".2"/><path d="M12 11c5-.5 6.5-3.5 6-7-4.5.5-6 3.5-6 7z" fill="currentColor" fill-opacity=".2"/>' },
  pencil: { label: 'Карандаш (русский язык)', svg: '<path d="m3 21 3-1 11-11a2.1 2.1 0 0 0-3-3L3 17l-1 3z"/>' },
  globe: { label: 'Глобус (иностранный язык)', svg: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>' },
  triangle: { label: 'Треугольник (геометрия)', svg: '<path d="M12 3 3 20h18L12 3z"/>' },
  book: { label: 'Книга (чтение)', svg: '<path d="M2 5s3-1.5 5-1.5S12 5 12 5v14s-3-1.5-5-1.5S2 19 2 19z"/><path d="M12 5s3-1.5 5-1.5S22 5 22 5v14s-3-1.5-5-1.5-5 1.5-5 1.5"/>' },
  palette: { label: 'Палитра (ИЗО)', svg: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="9.5" r="1.3"/><circle cx="15.5" cy="9.5" r="1.3"/><circle cx="8.5" cy="15" r="1.3"/><path d="M14 15.5c2 0 3.5-1 3.5-2.5"/>' },
  tools: { label: 'Инструменты (технология)', svg: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 21H8l6.7-14.7z"/><path d="m3 21 7-7"/><circle cx="6" cy="6" r="3"/>' },
  leaf: { label: 'Лист (окружающий мир)', svg: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12"/>' },
  math: { label: 'Знаки (математика)', svg: '<path d="M5 7h6M8 4v6"/><path d="M14 6h5M14 10h5"/><path d="M6 15h6M6 19h6"/><path d="m15 15 5 5M20 15l-5 5"/>' },
  person: { label: 'Человек (физкультура)', svg: '<circle cx="12" cy="4.5" r="2"/><path d="M12 6.5v6M12 9l-4 2M12 9l4 2M12 12.5 9 21M12 12.5 15 21"/>' },
  checkCircle: { label: 'Галочка в круге', svg: '<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>' },
  check: { label: 'Галочка', svg: '<path d="M20 6 9 17l-5-5"/>' },
  medal: { label: 'Медаль', svg: '<circle cx="12" cy="9" r="6"/><path d="m8.4 14.3-1.3 7.2 4.9-2.6 4.9 2.6-1.3-7.2"/>' },
  calendar: { label: 'Календарь', svg: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>' },
  clock: { label: 'Часы', svg: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
  star: { label: 'Звезда', svg: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>' },
  shield: { label: 'Щит', svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
  users: { label: 'Люди', svg: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1"/><path d="M16 4a4 4 0 0 1 0 8M22 21v-1a6 6 0 0 0-4-5.7"/>' },
  home: { label: 'Дом', svg: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/>' },
  cap: { label: 'Академическая шапочка', svg: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>' },
  music: { label: 'Музыка', svg: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' },
  food: { label: 'Питание', svg: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-2 0-3 2-3 5s1 4 3 4v9"/>' },
  tree: { label: 'Ёлка, природа', svg: '<path d="M12 22v-6"/><path d="M12 2 5 12h4l-3 4h12l-3-4h4z"/>' },
  bus: { label: 'Автобус', svg: '<rect x="4" y="3" width="16" height="15" rx="2"/><path d="M4 11h16M8 18v3M16 18v3"/><circle cx="8" cy="14.5" r=".8"/><circle cx="16" cy="14.5" r=".8"/>' },
  question: { label: 'Вопрос', svg: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7V14"/><path d="M12 17.5h.01"/>' },
  phone: { label: 'Телефон', svg: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.1 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z"/>' },
  mobile: { label: 'Смартфон', svg: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>' },
  chat: { label: 'Сообщение (MAX)', svg: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 20.5l1.6-4.9A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>' },
  vk: { label: 'ВКонтакте', fill: true, svg: '<path d="M12.8 16.9c-5.3 0-8.6-3.7-8.7-9.8h2.7c.1 4.5 2.1 6.4 3.6 6.8V7.1h2.5v3.9c1.5-.2 3-1.9 3.5-3.9h2.5c-.4 2.5-2 4.2-3.2 4.9 1.2.6 3 2.1 3.7 4.9h-2.7c-.5-1.7-1.9-3.1-3.8-3.3v3.3h-.1z"/>' },
  telegram: { label: 'Telegram', svg: '<path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/><path d="m9 13 8-6"/>' },
  mail: { label: 'Почта', svg: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>' },
  pin: { label: 'Метка на карте', svg: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>' },
  arrow: { label: 'Стрелка вправо', svg: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>' },
  external: { label: 'Внешняя ссылка', svg: '<path d="M7 17 17 7M8 7h9v9"/>' },
  zoom: { label: 'Лупа', svg: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M11 8.4v5.2M8.4 11h5.2"/>' },
  refresh: { label: 'Обновить', svg: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>' },
  eye: { label: 'Глаз', svg: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' },
  menu: { label: 'Меню', svg: '<path d="M4 7h16M4 12h16M4 17h16"/>' },
  close: { label: 'Крестик', svg: '<path d="M18 6 6 18M6 6l12 12"/>' },
  plus: { label: 'Плюс', svg: '<path d="M12 5v14M5 12h14"/>' },
  chevronLeft: { label: 'Назад', svg: '<path d="m15 5-7 7 7 7"/>' },
  chevronRight: { label: 'Вперёд', svg: '<path d="m9 5 7 7-7 7"/>' },
};

export const SEED_SYMBOL = '<symbol id="dseed" viewBox="0 0 34 58"><path d="M17 20V3M17 20 10 6M17 20l7-14M17 20 5 12M17 20l12-8M17 20H3M17 20h14M17 20 6 27M17 20l11 7" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M17 20c0 12 2 21-1 35" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="17" cy="20" r="1.3" fill="currentColor"/></symbol>';

// Возвращает готовый <svg>. size в пикселях, sw толщина линии.
export function icon(name, size = 20, sw = 1.7) {
  const ic = ICONS[name] || ICONS.checkCircle;
  if (ic.fill) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${ic.svg}</svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ic.svg}</svg>`;
}
