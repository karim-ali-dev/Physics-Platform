const { app, adminApp, init, ADMIN_PORT } = require('./app');

const PORT = process.env.PORT || 4000;

init()
  .then(() => {
    if (ADMIN_PORT) {
      adminApp.listen(ADMIN_PORT, () => {
        console.log(`🔐 لوحة التحكم منفصلة: http://localhost:${ADMIN_PORT}/admin`);
      });
    }
    app.listen(PORT, () => {
      console.log(`🚀 السيرفر شغال على http://localhost:${PORT}`);
      console.log(`لوحة التحكم: http://localhost:${PORT}/admin`);
      console.log(`فحص الصحة: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error('فشل تهيئة قاعدة البيانات:', err);
    process.exit(1);
  });
