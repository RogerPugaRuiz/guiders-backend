module.exports = {
  apps: [
    {
      name: 'guiders-backend',
      script: 'dist/src/main.js',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env.production',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: '/var/log/pm2/guiders-backend-error.log',
      out_file: '/var/log/pm2/guiders-backend-out.log',
      log_file: '/var/log/pm2/guiders-backend-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
