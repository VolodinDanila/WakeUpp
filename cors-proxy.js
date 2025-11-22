/**
 * Простой CORS прокси для расписания
 * Запускается отдельно: node cors-proxy.js
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обрабатываем preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Получаем параметры
  const queryObject = url.parse(req.url, true).query;
  const group = queryObject.group;

  if (!group) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'No group specified' }));
    return;
  }

  const targetUrl = `https://rasp.dmami.ru/site/group?group=${group}&session=0`;

  console.log(`📅 Проксирую запрос для группы: ${group}`);

  // Делаем запрос к rasp.dmami.ru
  https.get(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Referer': `https://rasp.dmami.ru/?${group}`,
    }
  }, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      console.log('✅ Данные получены от rasp.dmami.ru');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });

  }).on('error', (err) => {
    console.error('❌ Ошибка:', err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  });
});

server.listen(PORT, () => {
  console.log(`🚀 CORS прокси запущен на http://localhost:${PORT}`);
  console.log(`📖 Использование: http://localhost:${PORT}?group=231-324`);
});
