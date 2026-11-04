# Неделя 8: Express + WordPress + pug

Один Docker-контейнер: Node.js 20 (Express) принимает все запросы, а `/wordpress/` проксирует во внутренний Apache + PHP + MariaDB с WordPress. При сборке образа WordPress ставится автоматически, в нём остаётся один пост с ID 1, заголовок которого равен логину (`WP_POST_TITLE`, по умолчанию 336626).

## Маршруты

| Маршрут | Ответ |
|---|---|
| `/login/` | логин, обычный текст |
| `/wordpress/` | главная страница WordPress; API: `/wordpress/wp-json/wp/v2/` |
| `/render/?addr=URL` + POST JSON `{"random2":"..","random3":".."}` | HTML из pug-шаблона по адресу `addr` |
| `/insert/` (POST urlencoded: `login`, `password`, `URL`) | записывает `{login, password}` в коллекцию `users` базы по строке подключения `URL` (mongoose 5.8.11) |
| `/code/`, `/sha1/:input/`, `/req/` | как в задании недели 6 |
| всё остальное | логин |

## Запуск локально (Windows, Docker Desktop)

```
docker build -t week8 .
docker run --rm -p 3000:3000 -e PORT=3000 week8
```

Первая сборка занимает несколько минут. Проверка в PowerShell:

```
curl.exe http://localhost:3000/login/
curl.exe http://localhost:3000/wordpress/wp-json/wp/v2/posts
```

Другой заголовок поста: `docker build --build-arg WP_POST_TITLE=другой -t week8 .`

## Render

New → Web Service → репозиторий → Runtime Docker → план Free → Health Check Path `/login/`. Переменные окружения не нужны. Первая сборка: 5–10 минут.

## Важно

- Маршрут `/render/` выполняет код pug-шаблона по присланной ссылке. Не кладите в этот контейнер секреты.
- Файлы `docker/*.sh` должны иметь окончания строк LF. Файл `.gitattributes` это обеспечивает при работе через git.
- WordPress при сборке получает случайный пароль администратора (логин `admin`), в админку входить не нужно.
