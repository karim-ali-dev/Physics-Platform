// Express 4 لا يلتقط أخطاء الـ async تلقائياً — غلاف بسيط لتسليم الخطأ لمعالج الأخطاء.
function ah(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { ah };
