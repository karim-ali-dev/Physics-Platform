const { getCustomerBySession } = require('../security');
const { ah } = require('../asyncHandler');

const requireCustomer = ah(async (req, res, next) => {
  const raw = req.cookies && req.cookies.ctoken;
  const data = await getCustomerBySession(raw);
  if (!data) {
    return res.status(401).json({ error: 'غير مسجل دخول كعميل' });
  }
  if (data.customer.status && data.customer.status !== 'active') {
    return res.status(403).json({
      error: data.customer.status === 'blocked'
        ? 'حسابك متوقف على المنصة — تواصل مع مستر أحمد على الواتساب.'
        : 'حسابك لسه قيد المراجعة — مستر أحمد هيفعّله أول ما يتأكد إنك طالب حقيقي.',
      code: data.customer.status
    });
  }
  req.customer = data.customer;
  req.customerSessionId = data.session.id;
  req.rawCustomerToken = raw;
  next();
});

module.exports = { requireCustomer };
