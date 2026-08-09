const { csrfValid } = require('../security');

function csrfProtect(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (csrfValid(req)) return next();
  return res.status(403).json({ error: 'طلب مرفوض (تحقق CSRF فشل). حدّث الصفحة وحاول تاني.' });
}

module.exports = { csrfProtect };
