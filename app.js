export default (express, bodyParser, createReadStream, crypto, http, CORS, writeFileSync, mongoose) => {
  const LOGIN = '336626';
  const WORDPRESS = { host: '127.0.0.1', port: 8080 };
  const app = express();

  const text = (res, status, body) => res.status(status).type('text/plain').send(body);

  app.set('view engine', 'pug');
  app.set('view cache', false);

  app.use((req, res, next) => {
    res.set(CORS);
    next();
  });

  app.use('/wordpress', (req, res) => {
    const cut = req.originalUrl.indexOf('?');
    const path = cut === -1 ? req.originalUrl : req.originalUrl.slice(0, cut);
    if (path === '/wordpress') {
      const query = cut === -1 ? '' : req.originalUrl.slice(cut);
      return res.redirect(301, `/wordpress/${query}`);
    }
    const upstream = http.request(
      {
        host: WORDPRESS.host,
        port: WORDPRESS.port,
        method: req.method,
        path: req.originalUrl,
        headers: { ...req.headers, 'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http' }
      },
      (answer) => {
        res.writeHead(answer.statusCode, { ...answer.headers, ...CORS });
        answer.pipe(res);
      }
    );
    upstream.on('error', () => text(res, 502, LOGIN));
    req.pipe(upstream);
  });

  app.get('/login/', (req, res) => {
    text(res, 200, LOGIN);
  });

  app.get('/code/', (req, res) => {
    res.type('text/plain');
    createReadStream(import.meta.url.substring(7)).pipe(res);
  });

  app.get('/sha1/:input/', (req, res) => {
    text(res, 200, crypto.createHash('sha1').update(req.params.input).digest('hex'));
  });

  app.post('/insert/', bodyParser.urlencoded({ extended: false }), async (req, res) => {
    const { login, password, URL } = req.body || {};
    if (typeof login !== 'string' || typeof password !== 'string' || typeof URL !== 'string') {
      return text(res, 400, 'Нужны login, password и URL');
    }
    const connection = mongoose.createConnection();
    try {
      await connection.openUri(URL, { useNewUrlParser: true, useUnifiedTopology: true });
      const User = connection.model('User', new mongoose.Schema({ login: String, password: String }), 'users');
      await new User({ login, password }).save();
      text(res, 200, 'OK');
    } catch (e) {
      text(res, 500, 'Не удалось записать в базу');
    } finally {
      await connection.close().catch(() => {});
    }
  });

  const fetchText = (req, res) => {
    const addr = req.method === 'POST' ? (req.body || {}).addr : req.query.addr;
    if (typeof addr !== 'string') {
      return text(res, 400, LOGIN);
    }
    try {
      http
        .get(addr, (remote) => {
          res.type('text/plain');
          remote.pipe(res);
        })
        .on('error', () => text(res, 502, LOGIN));
    } catch (e) {
      text(res, 400, LOGIN);
    }
  };

  app.get('/req/', fetchText);
  app.post('/req/', bodyParser.urlencoded({ extended: false }), bodyParser.json(), fetchText);

  const readJson = (raw) => {
    if (typeof raw !== 'string' || raw.trim() === '') {
      return {};
    }
    const value = JSON.parse(raw);
    return typeof value === 'string' ? JSON.parse(value) : value;
  };

  const renderPage = (req, res) => {
    const addr = req.query.addr;
    let data;
    try {
      data = readJson(req.body);
    } catch (e) {
      return text(res, 400, 'Некорректный JSON');
    }
    if (typeof addr !== 'string') {
      return text(res, 400, 'Нужен параметр addr');
    }
    const locals = data && typeof data === 'object' ? data : {};
    try {
      http
        .get(addr, (remote) => {
          if (remote.statusCode !== 200) {
            remote.resume();
            return text(res, 502, 'Шаблон недоступен');
          }
          remote.setEncoding('utf8');
          let template = '';
          remote.on('data', (chunk) => {
            template += chunk;
          });
          remote.on('end', () => {
            const name = `${crypto.randomBytes(8).toString('hex')}.pug`;
            try {
              writeFileSync(`views/${name}`, template);
            } catch (e) {
              return text(res, 500, 'Не удалось сохранить шаблон');
            }
            res.render(name, locals, (err, html) => {
              if (err) {
                return text(res, 500, 'Ошибка шаблона');
              }
              res.type('html').send(html);
            });
          });
        })
        .on('error', () => text(res, 502, 'Шаблон недоступен'));
    } catch (e) {
      text(res, 400, 'Некорректный addr');
    }
  };

  app.get('/render/', renderPage);
  app.post('/render/', bodyParser.text({ type: () => true }), renderPage);

  app.all('*', (req, res) => {
    text(res, 200, LOGIN);
  });

  return app;
};
