const { getUserBySession } = require('../security');
const { ah } = require('../asyncHandler');

const requireAuth = ah(async (req, res, next) => {
  const raw = req.cookies && req.cookies.token;
  const data = await getUserBySession(raw);
  if (!data) {
    return res.status(401).json({ error: 'غير مسجل دخول أو الجلسة انتهت' });
  }
  req.user = data.user;
  req.sessionId = data.session.id;
  req.rawToken = raw;
  next();
});

module.exports = { requireAuth };
