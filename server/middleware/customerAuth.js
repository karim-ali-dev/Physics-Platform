const { getCustomerBySession } = require('../security');
const { ah } = require('../asyncHandler');

const requireCustomer = ah(async (req, res, next) => {
  const raw = req.cookies && req.cookies.ctoken;
  const data = await getCustomerBySession(raw);
  if (!data) {
    return res.status(401).json({ error: 'غير مسجل دخول كعميل' });
  }
  req.customer = data.customer;
  req.customerSessionId = data.session.id;
  req.rawCustomerToken = raw;
  next();
});

module.exports = { requireCustomer };
