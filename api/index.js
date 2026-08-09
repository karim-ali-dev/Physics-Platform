const { app, init } = require('../server/app');

let ready = null;

module.exports = (req, res) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    req.url = '/api' + req.url;
  }
  if (!ready) ready = init().catch((err) => {
    console.error('فشل تهيئة قاعدة البيانات:', err);
  });
  return ready.then(() => app(req, res));
};
