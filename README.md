# Сайт школы «За горизонт» (загоризонт38.рф)

Сайт собирается из одного файла с контентом `content/site.json`. Править его удобно через админку:
**https://загоризонт38.рф/admin/**. Админка сохраняет изменения прямо в этот репозиторий, а GitHub сам собирает и публикует сайт за 1–2 минуты.

## Как залить (один раз)

1. Откройте репозиторий `zagorizont38/schoolzagorizont` в GitHub Desktop (File → Clone repository).
2. В папке репозитория на компьютере удалите всё, **кроме скрытой папки `.git`**: старый `index.html` и папку `.github` со старыми workflow (`blank.yml`, `jekyll-docker.yml`, `static.yml`).
3. Скопируйте туда всё содержимое папки `ИТОГ`, включая скрытые `.github` и `.gitignore`.
4. В GitHub Desktop: Summary «Новый сайт с админкой» → Commit to main → Push origin.
5. На GitHub: Settings → Pages. Source должен быть **GitHub Actions**, Custom domain **загоризонт38.рф**, галочка **Enforce HTTPS** включена.
6. Вкладка Actions: дождитесь зелёной галочки у «Сборка и публикация сайта» (около минуты).

## Токен для админки

1. https://github.com/settings/personal-access-tokens/new (вход под владельцем репозитория).
2. Repository access: Only select repositories → `schoolzagorizont`.
3. Permissions → Repository permissions: **Contents: Read and write**, по желанию **Actions: Read-only** (админка покажет, когда сайт обновился).
4. Expiration до 1 года. Generate token, скопировать `github_pat_…`, вставить на странице входа админки.

Токен хранится только в браузере и отправляется только на `api.github.com`. Когда срок истечёт, выпустите новый тем же способом.

## Что где лежит

| Путь | Что это |
|---|---|
| `content/site.json` | Весь текст, фото, контакты, SEO. Это и редактирует админка |
| `assets/img/` | Картинки (WebP в двух размерах), логотип, фавиконки, OG-картинка |
| `assets/css/site.css`, `assets/js/site.js` | Стили и скрипт сайта |
| `assets/fonts/` | Шрифты Lora, Roboto Flex, Marck Script (OFL), без Google Fonts |
| `assets/video/` | Видео острова в первом экране и его постер |
| `core/render.js` | Сборщик страницы из JSON: HTML, Schema.org, robots.txt, sitemap.xml, llms.txt |
| `core/validate.js` | Проверка контента: ошибки останавливают сборку, сайт остаётся прежним |
| `admin/` | Админка (работает целиком в браузере) |
| `sveden/…` (создаётся при сборке) | «Сведения об образовательной организации» по приказу Рособрнадзора № 1493, редактируются в админке |
| `assets/docs/` (появится после загрузки) | PDF-документы для раздела «Сведения» |
| `tools/build.mjs` | Сборка: `node tools/build.mjs` → папка `_site` |
| `.github/workflows/static.yml` | GitHub Actions: сборка и публикация на Pages при каждом изменении |

## Проверить у себя на компьютере

```
node tools/build.mjs
npx serve _site
```

Админку без GitHub можно потрогать в тестовом режиме: `http://localhost:3000/admin/?mock=1` (работает только на localhost, ничего никуда не отправляет).
