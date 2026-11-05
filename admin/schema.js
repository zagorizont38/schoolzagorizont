// Описание всех полей админки. По этому описанию строятся формы.
// Типы полей: text, textarea, number, bool, select, color, icon, image, file, link, group, list, strings, tags, days, code

const eyebrow = { k: 'eyebrow', t: 'text', label: 'Надзаголовок', help: 'Маленькая строка над заголовком раздела' };
const title = { k: 'title', t: 'text', label: 'Заголовок раздела (H2)', md: true };
const text = { k: 'text', t: 'textarea', label: 'Текст под заголовком', md: true };
const img = (k = 'image', label = 'Фото') => ({ k, t: 'image', label });

export const SECTION_COMMON = [
  { k: 'id', t: 'text', label: 'Якорь (латиницей)', help: 'Используется в ссылках меню: #safety, #faq. Только латиница, цифры и дефис.', width: 'half' },
  { k: 'bg', t: 'select', label: 'Фон раздела', width: 'half', options: [['auto', 'Как задумано'], ['plain', 'Светлый'], ['deep', 'Тёплый бежевый'], ['cream', 'Сливочный']] },
  { k: 'decor', t: 'bool', label: 'Декоративные цветные пятна на фоне', def: true },
];

export const SECTIONS = {
  hero: {
    label: 'Первый экран', icon: 'home', single: true,
    help: 'Первый экран содержит заголовок H1. Это самый важный текст для поисковиков и нейросетей.',
    fields: [
      { k: 'badges', t: 'list', label: 'Плашки над заголовком', titleKey: 'text', item: [{ k: 'icon', t: 'icon', label: 'Иконка' }, { k: 'text', t: 'text', label: 'Текст' }], add: { icon: 'checkCircle', text: 'Новая плашка' } },
      { k: 'slogan', t: 'text', label: 'Слоган под логотипом', md: true, help: 'Выделение цветом: **слово**' },
      { k: 'h1sub', t: 'text', label: 'Строка для поиска (часть H1)', help: 'Что это и где. Например: «Частная начальная школа полного дня в Иркутске, 1–4 класс». Главный сигнал для Яндекса и нейросетей.' },
      { k: 'lead', t: 'textarea', label: 'Главный абзац', md: true },
      { k: 'sub', t: 'textarea', label: 'Второй абзац (серым)', md: true },
      { k: 'primary', t: 'group', label: 'Главная кнопка', fields: [{ k: 'label', t: 'text', label: 'Надпись', width: 'half' }, { k: 'href', t: 'link', label: 'Ссылка', width: 'half' }] },
      { k: 'secondary', t: 'group', label: 'Вторая кнопка', fields: [{ k: 'label', t: 'text', label: 'Надпись', width: 'half' }, { k: 'href', t: 'link', label: 'Ссылка', width: 'half' }] },
      { k: 'chips', t: 'list', label: 'Цифры под кнопками', titleKey: 'n', item: [{ k: 'n', t: 'text', label: 'Крупно', width: 'half' }, { k: 't', t: 'text', label: 'Подпись', width: 'half' }], add: { n: '0', t: 'подпись' } },
      { k: 'incl', t: 'text', label: 'Строка «Всё включено»' },
      { k: 'place', t: 'text', label: 'Строка с местом (с иконкой метки)', help: 'Можно вставлять переменные, например {{trip}}' },
      { k: 'video', t: 'group', label: 'Видео справа', fields: [{ k: 'src', t: 'file', label: 'Видео MP4', accept: 'video/mp4', dir: 'assets/video' }, { k: 'poster', t: 'file', label: 'Картинка, пока видео грузится', accept: 'image/*', dir: 'assets/video' }] },
    ],
  },
  cards3: {
    label: 'Карточки с фото (Безопасность)', icon: 'shield',
    fields: [eyebrow, title, text,
      { k: 'cards', t: 'list', label: 'Карточки', titleKey: 'title', item: [img('image', 'Фото (можно убрать)'), { k: 'icon', t: 'icon', label: 'Иконка' }, { k: 'title', t: 'text', label: 'Заголовок', md: true }, { k: 'text', t: 'textarea', label: 'Текст (абзацы через пустую строку)', md: true }, { k: 'pull', t: 'text', label: 'Фраза рукописным шрифтом' }], add: { image: null, icon: 'heart', title: 'Новая карточка', text: '', pull: '' } }],
  },
  director: {
    label: 'Слово руководителя', icon: 'users',
    fields: [eyebrow, img('image', 'Фото руководителя'),
      { k: 'paragraphs', t: 'list', label: 'Абзацы', titleKey: 'text', item: [{ k: 'text', t: 'textarea', label: 'Текст', md: true }, { k: 'soft', t: 'bool', label: 'Серым цветом' }], add: { text: '', soft: false } },
      { k: 'name', t: 'text', label: 'Подпись: имя', width: 'half' }, { k: 'role', t: 'text', label: 'Подпись: должность', width: 'half' }],
  },
  life: {
    label: 'Большие карточки с фото (Жизнь школы)', icon: 'sun',
    fields: [eyebrow, title, text,
      { k: 'cards', t: 'list', label: 'Карточки', titleKey: 'title', item: [img(), { k: 'title', t: 'text', label: 'Заголовок' }, { k: 'text', t: 'textarea', label: 'Текст', md: true }, { k: 'tags', t: 'tags', label: 'Метки через запятую' }], add: { image: null, title: 'Новая карточка', text: '', tags: [] } }],
  },
  subjects: {
    label: 'Дисциплины', icon: 'book',
    fields: [eyebrow, title, text,
      { k: 'items', t: 'list', label: 'Предметы', titleKey: 'name', item: [{ k: 'icon', t: 'icon', label: 'Иконка' }, { k: 'name', t: 'text', label: 'Название' }, { k: 'why', t: 'textarea', label: 'Зачем ребёнку (появляется при наведении)', md: true }], add: { icon: 'book', name: 'Новый предмет', why: '' } }],
  },
  perks: {
    label: 'Преимущества', icon: 'star',
    fields: [eyebrow, title,
      { k: 'items', t: 'list', label: 'Карточки преимуществ (номер ставится сам)', titleKey: 'title', item: [{ k: 'title', t: 'text', label: 'Заголовок' }, { k: 'text', t: 'textarea', label: 'Текст', md: true }], add: { title: 'Новое преимущество', text: '' } },
      { k: 'accent', t: 'group', label: 'Зелёная карточка с ценой', fields: [{ k: 'enabled', t: 'bool', label: 'Показывать', def: true }, { k: 'title', t: 'text', label: 'Заголовок', width: 'half' }, { k: 'price', t: 'text', label: 'Цена', width: 'half', help: '{{price}} подставит цену из раздела «Организация»' }, { k: 'text', t: 'textarea', label: 'Текст' }, { k: 'list', t: 'tags', label: 'Что входит (через запятую)' }] }],
  },
  docs: {
    label: 'Документы', icon: 'document',
    fields: [eyebrow, title, text, img('gerb', 'Фоновый герб'),
      { k: 'points', t: 'list', label: 'Пункты', titleKey: 'title', item: [{ k: 'icon', t: 'icon', label: 'Иконка' }, { k: 'title', t: 'text', label: 'Заголовок' }, { k: 'text', t: 'textarea', label: 'Текст', md: true }, { k: 'warm', t: 'bool', label: 'Зелёная иконка вместо синей' }], add: { icon: 'checkCircle', title: 'Новый пункт', text: '', warm: false } }],
  },
  awards: {
    label: 'Достижения и награды', icon: 'medal',
    fields: [eyebrow, title, text,
      { k: 'stats', t: 'list', label: 'Плашки над документами', titleKey: 'bold', item: [{ k: 'icon', t: 'icon', label: 'Иконка' }, { k: 'bold', t: 'text', label: 'Жирно', width: 'half' }, { k: 'text', t: 'text', label: 'Пояснение', width: 'half' }], add: { icon: 'medal', bold: '', text: '' } },
      { k: 'items', t: 'list', label: 'Документы (открываются по клику)', titleKey: 'title', item: [img('image', 'Скан документа'), { k: 'kind', t: 'text', label: 'Тип (Награда, Сертификат…)', width: 'half' }, { k: 'year', t: 'text', label: 'Год', width: 'half' }, { k: 'title', t: 'text', label: 'Название' }, { k: 'text', t: 'textarea', label: 'Описание на карточке', md: true }, { k: 'caption', t: 'text', label: 'Подпись в увеличенном виде (кто выдал, где, когда)' }], add: { image: null, kind: 'Сертификат', year: String(new Date().getFullYear()), title: 'Новый документ', text: '', caption: '' } },
      { k: 'note', t: 'text', label: 'Строка под документами' }],
  },
  env: {
    label: 'Комфортная среда', icon: 'home',
    fields: [eyebrow, title, { k: 'lead', t: 'textarea', label: 'Текст', md: true }, { k: 'list', t: 'strings', label: 'Список с галочками' },
      { k: 'images', t: 'imagelist', label: 'Три фото (первое высокое)', max: 3 }],
  },
  day: {
    label: 'Пример дня', icon: 'clock',
    fields: [eyebrow, title, text,
      { k: 'stats', t: 'list', label: 'Цифры дня', titleKey: 'v', item: [{ k: 'v', t: 'text', label: 'Цифра', width: 'half' }, { k: 'l', t: 'text', label: 'Подпись', width: 'half' }, { k: 'zero', t: 'bool', label: 'Красным (как «0 домашки»)' }], add: { v: '', l: '', zero: false } },
      { k: 'items', t: 'list', label: 'Распорядок', titleKey: 'time', titleKey2: 'title', item: [{ k: 'time', t: 'text', label: 'Время', width: 'third' }, { k: 'color', t: 'color', label: 'Цвет точки', width: 'third' }, { k: 'title', t: 'text', label: 'Заголовок' }, { k: 'text', t: 'textarea', label: 'Текст', md: true }, { k: 'chips', t: 'tags', label: 'Метки через запятую' }], add: { time: '00:00', color: '#7C875B', title: 'Новый пункт', text: '', chips: [] } },
      { k: 'note', t: 'text', label: 'Строка под расписанием' }],
  },
  steps: {
    label: 'Шаги поступления', icon: 'checkCircle',
    fields: [eyebrow, title, { k: 'items', t: 'list', label: 'Шаги (номер ставится сам)', titleKey: 'title', item: [{ k: 'title', t: 'text', label: 'Заголовок' }, { k: 'text', t: 'textarea', label: 'Текст', md: true }], add: { title: 'Новый шаг', text: '' } }],
  },
  talents: {
    label: 'Карточки на тёмном фоне (Таланты)', icon: 'star',
    fields: [eyebrow, title, { k: 'items', t: 'list', label: 'Карточки', titleKey: 'title', item: [img(), { k: 'title', t: 'text', label: 'Заголовок' }, { k: 'text', t: 'textarea', label: 'Текст', md: true }], add: { image: null, title: 'Новая карточка', text: '' } }],
  },
  reviews: {
    label: 'Отзывы', icon: 'chat',
    help: 'Цифры рейтинга (4,9 и количество оценок) редактируются в разделе «Организация и контакты» → Рейтинг.',
    fields: [eyebrow, title, text,
      { k: 'items', t: 'list', label: 'Отзывы', titleKey: 'name', item: [{ k: 'text', t: 'textarea', label: 'Текст отзыва (без кавычек)' }, { k: 'name', t: 'text', label: 'Имя', width: 'half' }, { k: 'source', t: 'text', label: 'Откуда', width: 'half' }, { k: 'stars', t: 'number', label: 'Звёзд', min: 1, max: 5, width: 'half' }], add: { text: '', name: '', source: 'отзыв на 2ГИС', stars: 5 } },
      { k: 'allLabel', t: 'text', label: 'Кнопка «Все отзывы»' }],
  },
  faq: {
    label: 'Частые вопросы', icon: 'question',
    help: 'Вопросы попадают в разметку FAQPage и в llms.txt. Пишите вопрос так, как его задаёт родитель, а ответ начинайте сразу с сути.',
    fields: [eyebrow, title, text,
      { k: 'items', t: 'list', label: 'Вопросы', titleKey: 'q', toggleKey: 'enabled', item: [{ k: 'enabled', t: 'bool', label: 'Показывать на сайте', def: true }, { k: 'q', t: 'text', label: 'Вопрос' }, { k: 'a', t: 'textarea', label: 'Ответ', md: true, rows: 4 }], add: { enabled: true, q: 'Новый вопрос?', a: '' } },
      { k: 'more', t: 'text', label: 'Строка под вопросами (необязательно)', md: true }],
  },
  contacts: {
    label: 'Контакты', icon: 'phone',
    help: 'Телефоны и ссылки подставляются переменными {{phone}}, {{tel}}, {{gis}} и т. д. из раздела «Организация». Меняйте их там, и они обновятся по всему сайту.',
    fields: [eyebrow, title, { k: 'lead', t: 'textarea', label: 'Текст', md: true }, { k: 'script', t: 'text', label: 'Фраза рукописным шрифтом' },
      { k: 'button', t: 'group', label: 'Кнопка', fields: [{ k: 'label', t: 'text', label: 'Надпись', width: 'half' }, { k: 'href', t: 'link', label: 'Ссылка', width: 'half' }] },
      { k: 'items', t: 'list', label: 'Строки в карточке', titleKey: 'k', item: [{ k: 'icon', t: 'icon', label: 'Иконка' }, { k: 'k', t: 'text', label: 'Маленькая подпись' }, { k: 'v', t: 'text', label: 'Крупный текст' }, { k: 'href', t: 'link', label: 'Ссылка (пусто = без ссылки)' }], add: { icon: 'pin', k: '', v: '', href: '' } }],
  },
  text: {
    label: 'Текстовый блок', icon: 'document',
    fields: [eyebrow, title, { k: 'body', t: 'textarea', label: 'Текст (абзацы через пустую строку)', md: true, rows: 8 }, img('image', 'Картинка под текстом (необязательно)')],
  },
  html: {
    label: 'Свой HTML-код', icon: 'tools',
    help: 'Для опытных: вставка любого кода (например, виджета карты). Код выводится внутри контейнера страницы.',
    fields: [{ k: 'html', t: 'code', label: 'HTML' }],
  },
};

export const NEW_SECTION = {
  text: { type: 'text', id: 'text', enabled: true, eyebrow: 'Надзаголовок', title: 'Новый раздел', body: 'Текст раздела.', image: null },
  cards3: { type: 'cards3', id: 'cards', enabled: true, eyebrow: '', title: 'Новый раздел', text: '', cards: [{ image: null, icon: 'heart', title: 'Карточка', text: 'Текст', pull: '' }] },
  life: { type: 'life', id: 'photos', enabled: true, eyebrow: '', title: 'Новый раздел', text: '', cards: [] },
  subjects: { type: 'subjects', id: 'list', enabled: true, eyebrow: '', title: 'Новый раздел', text: '', items: [] },
  perks: { type: 'perks', id: 'perks2', enabled: true, eyebrow: '', title: 'Новый раздел', items: [], accent: { enabled: false } },
  docs: { type: 'docs', id: 'docs2', enabled: true, eyebrow: '', title: 'Новый раздел', text: '', gerb: null, points: [] },
  awards: { type: 'awards', id: 'awards2', enabled: true, eyebrow: '', title: 'Новый раздел', text: '', stats: [], items: [], note: '' },
  steps: { type: 'steps', id: 'steps2', enabled: true, eyebrow: '', title: 'Новый раздел', items: [] },
  talents: { type: 'talents', id: 'cards2', enabled: true, eyebrow: '', title: 'Новый раздел', items: [] },
  reviews: { type: 'reviews', id: 'reviews2', enabled: true, eyebrow: 'Отзывы', title: 'Новый раздел', items: [] },
  faq: { type: 'faq', id: 'faq2', enabled: true, eyebrow: 'Вопросы', title: 'Частые вопросы', text: '', items: [] },
  day: { type: 'day', id: 'day2', enabled: true, eyebrow: '', title: 'Новый раздел', text: '', stats: [], items: [], note: '' },
  html: { type: 'html', id: 'custom', enabled: true, html: '<p>Ваш код</p>' },
};

const daysField = { k: 'days', t: 'days', label: 'Дни' };
export const ORG = [
  { group: 'Основное', fields: [
    { k: 'name', t: 'text', label: 'Короткое название', width: 'half', help: 'Без кавычек: За горизонт' },
    { k: 'fullName', t: 'text', label: 'Полное название', width: 'half' },
    { k: 'descriptor', t: 'text', label: 'Кто вы одной фразой', help: 'Используется в разметке и llms.txt. Например: «Частная начальная школа полного дня и семейные классы для детей 1–4 класса».' },
    { k: 'alternateNames', t: 'strings', label: 'Другие названия (как вас могут искать)' },
    { k: 'grades', t: 'text', label: 'Классы', width: 'third' }, { k: 'classSize', t: 'text', label: 'Детей в классе', width: 'third' }, { k: 'foundingYear', t: 'text', label: 'Год основания', width: 'third' },
  ] },
  { group: 'Цена и оплата', fields: [
    { k: 'priceDisplay', t: 'text', label: 'Цена на сайте ({{price}})', width: 'third' }, { k: 'priceValue', t: 'number', label: 'Цена числом (для разметки)', width: 'third' }, { k: 'pricePeriod', t: 'text', label: 'За период', width: 'third' },
    { k: 'paymentAccepted', t: 'text', label: 'Способы оплаты (для разметки)', help: 'Например: наличные, безналичный перевод, QR-код, материнский капитал' },
  ] },
  { group: 'Телефоны и почта', fields: [
    { k: 'phone', t: 'text', label: 'Основной телефон, как показывать ({{phone}})', width: 'half' }, { k: 'tel', t: 'text', label: 'Для звонка по клику ({{tel}})', width: 'half', help: '+7 и цифры без пробелов' },
    { k: 'phone2', t: 'text', label: 'Второй телефон ({{phone2}})', width: 'half' }, { k: 'tel2', t: 'text', label: 'Для звонка ({{tel2}})', width: 'half' },
    { k: 'email', t: 'text', label: 'Почта ({{email}})' },
  ] },
  { group: 'Адрес и карта', path: 'address', fields: [
    { k: 'short', t: 'text', label: 'Адрес одной строкой ({{address}})' },
    { k: 'region', t: 'text', label: 'Регион', width: 'half' }, { k: 'district', t: 'text', label: 'Район', width: 'half' },
    { k: 'locality', t: 'text', label: 'Населённый пункт', width: 'half' }, { k: 'microdistrict', t: 'text', label: 'Микрорайон', width: 'half' },
    { k: 'street', t: 'text', label: 'Улица и дом', width: 'third' }, { k: 'floor', t: 'text', label: 'Этаж, вход', width: 'third' }, { k: 'postalCode', t: 'text', label: 'Индекс', width: 'third' },
  ] },
  { group: 'Координаты', path: 'geo', fields: [
    { k: 'lat', t: 'number', label: 'Широта', width: 'half', step: 'any' }, { k: 'lng', t: 'number', label: 'Долгота', width: 'half', step: 'any' },
  ], mapLink: true },
  { group: 'Режим работы', fields: [
    { k: 'hoursText', t: 'text', label: 'Как показывать на сайте ({{hours}})' },
    { k: 'hours', t: 'list', label: 'Для разметки (поисковики, карты)', titleKey: 'opens', item: [daysField, { k: 'opens', t: 'text', label: 'С', width: 'half' }, { k: 'closes', t: 'text', label: 'До', width: 'half' }], add: { days: ['Mo', 'Tu', 'We', 'Th', 'Fr'], opens: '08:00', closes: '18:00' } },
  ] },
  { group: 'Ссылки на площадки', path: 'links', fields: [
    { k: 'gis', t: 'text', label: '2ГИС ({{gis}})' }, { k: 'yandexMaps', t: 'text', label: 'Яндекс Карты ({{yandexMaps}})', help: 'Ссылка на вашу карточку организации. Сильно помогает нейропоиску Яндекса.' },
    { k: 'vk', t: 'text', label: 'ВКонтакте ({{vk}})' }, { k: 'max', t: 'text', label: 'MAX ({{max}})' }, { k: 'telegram', t: 'text', label: 'Telegram ({{telegram}})' },
  ] },
  { group: 'Рейтинг на картах', path: 'rating', fields: [
    { k: 'value', t: 'text', label: 'Оценка', width: 'third' }, { k: 'count', t: 'text', label: 'Оценок (текстом)', width: 'third' }, { k: 'reviews', t: 'text', label: 'Отзывов (текстом)', width: 'third' },
    { k: 'source', t: 'text', label: 'Площадка', width: 'half' }, { k: 'checked', t: 'text', label: 'Когда сверяли', width: 'half' },
    { k: 'url', t: 'text', label: 'Ссылка на отзывы' },
  ] },
  { group: 'Руководитель', path: 'director', fields: [
    { k: 'name', t: 'text', label: 'Имя', width: 'half' }, { k: 'role', t: 'text', label: 'Должность', width: 'half' }, { k: 'image', t: 'image', label: 'Фото для разметки' },
  ] },
  { group: 'Реквизиты и лицензия', help: 'Показываются в подвале, в разметке и в разделе «Сведения». Нейросети и поисковики сильнее доверяют сайтам с реквизитами.', fields: [
    { k: 'legalName', t: 'text', label: 'Юрлицо коротко ({{legalName}})', width: 'half' }, { k: 'legalFullName', t: 'text', label: 'Юрлицо полностью', width: 'half' },
    { k: 'inn', t: 'text', label: 'ИНН', width: 'third' }, { k: 'kpp', t: 'text', label: 'КПП', width: 'third' }, { k: 'ogrn', t: 'text', label: 'ОГРН', width: 'third' },
    { k: 'regDate', t: 'text', label: 'Дата регистрации', width: 'half' }, { k: 'legalAddress', t: 'text', label: 'Юридический адрес', width: 'half' },
    { k: 'license', t: 'text', label: 'Лицензия (номер и дата)' }, { k: 'licenseNote', t: 'text', label: 'Лицензия: вид и кем выдана' }, { k: 'licenseUrl', t: 'text', label: 'Ссылка на запись в реестре лицензий' },
    { k: 'ceo', t: 'group', label: 'Руководитель юрлица', fields: [{ k: 'name', t: 'text', label: 'ФИО', width: 'half' }, { k: 'post', t: 'text', label: 'Должность', width: 'half' }] },
  ] },
  { group: 'Логотип', fields: [{ k: 'logo', t: 'image', label: 'Логотип (прозрачный PNG или WebP)', keepPng: true }] },
];

export const SEO = [
  { group: 'Сниппет в поиске', fields: [
    { k: 'title', t: 'text', label: 'Заголовок страницы (title)', counter: [50, 75], help: 'Что и где: тип школы, город, название. До 70 символов.' },
    { k: 'description', t: 'textarea', label: 'Описание (description)', counter: [120, 170], rows: 3, help: 'Факты: классы, адрес, цена, главное отличие. 120–170 символов.' },
  ], snippet: true },
  { group: 'Соцсети и мессенджеры', fields: [
    { k: 'ogTitle', t: 'text', label: 'Заголовок при отправке ссылки' }, { k: 'ogDescription', t: 'textarea', label: 'Описание при отправке ссылки', rows: 2 },
    { k: 'ogImage', t: 'image', label: 'Картинка 1200×630', ogImage: true },
  ] },
  { group: 'Нейропоиск (Алиса, GigaChat, ChatGPT)', help: 'Эти поля попадают в разметку Schema.org и в файл llms.txt, по которым нейросети понимают, кто вы и где.', fields: [
    { k: 'areaServed', t: 'strings', label: 'Откуда к вам приезжают (районы, посёлки)' },
    { k: 'knowsAbout', t: 'strings', label: 'Темы, в которых вы эксперты' },
    { k: 'llmsExtra', t: 'textarea', label: 'Дополнительный текст в llms.txt', rows: 4 },
  ] },
  { group: 'Подключения', fields: [
    { k: 'index', t: 'bool', label: 'Разрешить поисковикам индексировать сайт', def: true },
    { k: 'yandexVerification', t: 'text', label: 'Код Яндекс Вебмастера', help: 'Только значение content из тега meta name="yandex-verification"', width: 'half' },
    { k: 'googleVerification', t: 'text', label: 'Код Google Search Console', width: 'half' },
    { k: 'metrikaId', t: 'text', label: 'Номер счётчика Яндекс Метрики', help: 'Только цифры. Цели «phone», «messenger», «route» отправляются сами при кликах.' },
    { k: 'headCode', t: 'code', label: 'Код в <head>' }, { k: 'bodyCode', t: 'code', label: 'Код перед </body>' },
  ] },
];

export const HEADER = [
  { group: 'Меню на компьютере', fields: [
    { k: 'nav', t: 'list', label: 'Пункты', titleKey: 'label', compact: true, item: [{ k: 'label', t: 'text', label: 'Надпись', width: 'half' }, { k: 'href', t: 'link', label: 'Ссылка', width: 'half' }], add: { label: 'Пункт', href: '#' } },
    { k: 'showPhone', t: 'bool', label: 'Показывать телефон в шапке', def: true },
    { k: 'cta', t: 'group', label: 'Кнопка в шапке', fields: [{ k: 'label', t: 'text', label: 'Надпись', width: 'half' }, { k: 'href', t: 'link', label: 'Ссылка', width: 'half' }] },
  ] },
  { group: 'Мобильное меню', fields: [
    { k: 'mobileNav', t: 'list', label: 'Пункты', titleKey: 'label', compact: true, item: [{ k: 'label', t: 'text', label: 'Надпись', width: 'half' }, { k: 'href', t: 'link', label: 'Ссылка', width: 'half' }], add: { label: 'Пункт', href: '#' } },
    { k: 'mobileCta', t: 'group', label: 'Кнопка внизу меню', fields: [{ k: 'label', t: 'text', label: 'Надпись', width: 'half' }, { k: 'href', t: 'link', label: 'Ссылка', width: 'half' }] },
  ] },
];

export const FOOTER = [
  { group: 'Подвал', fields: [
    { k: 'about', t: 'textarea', label: 'Текст под логотипом', md: true },
    { k: 'showAddress', t: 'bool', label: 'Показывать адрес, телефон и режим работы', def: true },
    { k: 'columns', t: 'list', label: 'Колонки ссылок', titleKey: 'title', item: [{ k: 'title', t: 'text', label: 'Заголовок колонки' }, { k: 'links', t: 'list', label: 'Ссылки', titleKey: 'label', compact: true, item: [{ k: 'label', t: 'text', label: 'Надпись', width: 'half' }, { k: 'href', t: 'link', label: 'Ссылка', width: 'half' }], add: { label: '', href: '#' } }], add: { title: 'Колонка', links: [] } },
    { k: 'copyright', t: 'text', label: 'Копирайт', help: '{{year}} подставит текущий год' },
    { k: 'note', t: 'text', label: 'Строка посередине' },
    { k: 'credit', t: 'group', label: 'Подпись разработчика', fields: [{ k: 'label', t: 'text', label: 'Текст', width: 'half' }, { k: 'href', t: 'text', label: 'Ссылка', width: 'half' }] },
  ] },
];

export const COLOR_LABELS = {
  moss: 'Главный зелёный (кнопки, акценты)', 'moss-deep': 'Зелёный при наведении', 'moss-tint': 'Светло-зелёный фон иконок', wood: 'Заголовки (коричневый)',
  river: 'Голубой акцент', linen: 'Фон страницы', 'linen-deep': 'Фон чередующихся разделов', cream: 'Фон карточек',
  navy: 'Синий (блок документов)', 'navy-soft': 'Светло-синий фон иконок', sun: 'Красный акцент', 'sun-soft': 'Светло-красный',
  ink: 'Основной текст', muted: 'Второстепенный текст', hairline: 'Тонкие линии и рамки',
};

export const THEME = [
  { group: 'Эффекты', fields: [
    { k: 'noise', t: 'bool', label: 'Бумажная фактура поверх страницы', def: true },
    { k: 'seeds', t: 'bool', label: 'Летающие семена одуванчика', def: true },
  ] },
  { group: 'Свой CSS', fields: [{ k: 'customCss', t: 'code', label: 'CSS, добавляется в конец стилей', help: 'Например: .hero h1 .stage-line{font-size:2rem}' }] },
];

export const BUILTIN_TOKENS = [
  ['price', 'Цена'], ['phone', 'Телефон'], ['tel', 'Телефон для ссылки tel:'], ['phone2', 'Второй телефон'], ['tel2', 'Второй телефон для tel:'],
  ['email', 'Почта'], ['address', 'Адрес'], ['hours', 'Режим работы'], ['classSize', 'Детей в классе'], ['grades', 'Классы'],
  ['director', 'Имя директора'], ['gis', '2ГИС'], ['vk', 'ВКонтакте'], ['max', 'MAX'], ['telegram', 'Telegram'], ['yandexMaps', 'Яндекс Карты'],
  ['rating', 'Оценка'], ['ratingCount', 'Количество оценок'], ['legalName', 'Юрлицо'], ['inn', 'ИНН'], ['ogrn', 'ОГРН'], ['license', 'Лицензия'], ['reviewsCount', 'Количество отзывов'], ['year', 'Текущий год'], ['name', 'Название'], ['domain', 'Домен'],
];

export const DAYS = [['Mo', 'Пн'], ['Tu', 'Вт'], ['We', 'Ср'], ['Th', 'Чт'], ['Fr', 'Пт'], ['Sa', 'Сб'], ['Su', 'Вс']];

/* ---------- Сведения об образовательной организации ---------- */
export const PROP_OPTIONS = [
  ['', 'Без микроразметки'], ['fullName', 'Полное наименование'], ['shortName', 'Сокращённое наименование'], ['regDate', 'Дата создания'],
  ['uchredLaw', 'Учредитель'], ['address', 'Место нахождения'], ['addressPlace', 'Места осуществления деятельности'], ['addressPlaceFil', 'Филиалы'],
  ['workTime', 'Режим работы'], ['telephone', 'Телефон'], ['email', 'Электронная почта'], ['licenseDocLink', 'Лицензия'], ['accreditationDocLink', 'Аккредитация'],
  ['structOrgUprav', 'Орган управления'], ['divisionClauseDocLink', 'Положение об органе управления'], ['ustavDocLink', 'Устав'], ['priemDocLink', 'Правила приёма'],
  ['modeDocLink', 'Режим занятий'], ['tekKontrolDocLink', 'Текущий контроль и аттестация'], ['perevodDocLink', 'Перевод и отчисление'], ['vozDocLink', 'Оформление отношений'],
  ['localActStud', 'Правила для обучающихся'], ['localActOrder', 'Правила трудового распорядка'], ['localActCollec', 'Коллективный договор'], ['reportEduDocLink', 'Отчёт о самообследовании'],
  ['prescriptionDocLink', 'Предписания'], ['eduOp', 'Образовательная программа'], ['eduLevel', 'Уровень образования'], ['eduForm', 'Форма обучения'], ['learningTerm', 'Срок обучения'],
  ['language', 'Язык обучения'], ['eduChislen', 'Численность обучающихся'], ['numberBF', 'Числ. за счёт федерального бюджета'], ['numberBR', 'Числ. за счёт бюджета региона'],
  ['numberBM', 'Числ. за счёт местного бюджета'], ['numberP', 'Числ. по договорам'], ['purposeCab', 'Учебные кабинеты'], ['purposePrac', 'Объекты для практики'],
  ['purposeLibr', 'Библиотека'], ['purposeSport', 'Объекты спорта'], ['meansTraining', 'Средства обучения'], ['comNet', 'Доступ к сетям'], ['ovz', 'Условия для инвалидов и ОВЗ'],
  ['purposeCabOvz', 'Кабинеты для ОВЗ'], ['meals', 'Питание'], ['health', 'Охрана здоровья'], ['paidEdu', 'Положение о платных услугах'], ['paidDog', 'Образец договора'],
  ['paidSt', 'Стоимость обучения'], ['volume', 'Объём деятельности'], ['finRec', 'Поступление и расходование средств'], ['finPlanDocLink', 'План ФХД'],
  ['vacant', 'Вакантные места'], ['grant', 'Стипендии'], ['support', 'Меры поддержки'], ['hostelInfo', 'Общежитие'], ['internationalDog', 'Международные договоры'],
];
export const SVEDEN_MAIN = [
  { k: 'enabled', t: 'bool', label: 'Показывать раздел на сайте (ссылка в подвале и мобильном меню)', def: true },
  { k: 'title', t: 'text', label: 'Заголовок раздела' },
  { k: 'intro', t: 'textarea', label: 'Вступление', md: true },
];
export const SVEDEN_PAGES = {
  k: 'pages', t: 'list', label: 'Подразделы', titleKey: 'title', item: [
    { k: 'title', t: 'text', label: 'Название подраздела', width: 'half' },
    { k: 'id', t: 'text', label: 'Адрес: /sveden/…/ (латиницей)', width: 'half' },
    { k: 'text', t: 'textarea', label: 'Текст', md: true },
    { k: 'rows', t: 'list', label: 'Таблица (пустые строки на сайте не показываются)', titleKey: 'label', item: [
      { k: 'label', t: 'text', label: 'Что', width: 'half' }, { k: 'prop', t: 'select', label: 'Микроразметка для проверяющих', width: 'half', options: PROP_OPTIONS },
      { k: 'value', t: 'textarea', label: 'Значение', md: true, rows: 2 }], add: { label: 'Новая строка', value: '', prop: '' } },
    { k: 'people', t: 'list', label: 'Люди', titleKey: 'fio', item: [
      { k: 'fio', t: 'text', label: 'ФИО', width: 'half' }, { k: 'post', t: 'text', label: 'Должность', width: 'half' },
      { k: 'prop', t: 'select', label: 'Кто это', width: 'half', options: [['rucovodstvo', 'Руководитель'], ['teachingStaff', 'Педагог']] },
      { k: 'phone', t: 'text', label: 'Телефон', width: 'half' }, { k: 'email', t: 'text', label: 'Почта', width: 'half' },
      { k: 'disciplines', t: 'text', label: 'Преподаваемые дисциплины', width: 'half' }, { k: 'education', t: 'text', label: 'Уровень образования', width: 'half' },
      { k: 'qualification', t: 'text', label: 'Квалификация, специальность', width: 'half' }, { k: 'experience', t: 'text', label: 'Стаж по специальности', width: 'half' },
      { k: 'courses', t: 'textarea', label: 'Повышение квалификации', rows: 2 }], add: { fio: '', post: 'Педагог', prop: 'teachingStaff' } },
    { k: 'docs', t: 'list', label: 'Документы (без файла на сайте не показываются)', titleKey: 'title', item: [
      { k: 'title', t: 'text', label: 'Название' }, { k: 'href', t: 'file', label: 'Файл PDF или ссылка', accept: 'application/pdf', dir: 'assets/docs' },
      { k: 'prop', t: 'select', label: 'Микроразметка', width: 'half', options: PROP_OPTIONS }, { k: 'note', t: 'text', label: 'Примечание', width: 'half' }], add: { title: 'Новый документ', href: '', prop: '', note: '' } },
    { k: 'note', t: 'textarea', label: 'Примечание внизу', md: true },
  ], add: { id: 'new', title: 'Новый подраздел', text: '', rows: [], people: [], docs: [], note: '' },
};
