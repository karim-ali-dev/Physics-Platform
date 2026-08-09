// إعدادات PM2 للنشر على سيرفرك الخاص (VPS)
// التشغيل: pm2 start ecosystem.config.js && pm2 save && pm2 startup
// العدد الموصى به من العمال = عدد أنوية الـ CPU على السيرفر
module.exports = {
  apps: [
    {
      name: 'physics-platform',
      cwd: __dirname,
      script: 'server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '512M',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
