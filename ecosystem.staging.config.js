module.exports = {
  apps: [
    {
      name: 'guiders-backend-staging',
      script: 'dist/src/main.js',
      env: {
        NODE_ENV: 'staging',
      },
      env_file: '.env.staging',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/guiders-backend-staging-error.log',
      out_file: '/var/log/pm2/guiders-backend-staging-out.log',
      log_file: '/var/log/pm2/guiders-backend-staging-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
