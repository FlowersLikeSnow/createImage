module.exports = {
  apps: [{
    name: 'createimage',
    script: 'npm',
    args: 'start',
    cwd: '/www/wwwroot/AI/createImage',
    env: {
      NODE_ENV: 'production',
      PORT: '3001'
    }
  }]
}
