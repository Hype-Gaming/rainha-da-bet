const fs = require('node:fs')
const path = require('node:path')

const loadEnv = () => {
  const envPath = path.resolve(__dirname, '.env')
  if (!fs.existsSync(envPath)) return {}

  return fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return env

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) return env

      const key = trimmed.slice(0, separatorIndex).trim()
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
      env[key] = value
      return env
    }, {})
}

const env = {
  NODE_ENV: 'production',
  PORT: '3098',
  ...loadEnv()
}

module.exports = {
  apps: [
    {
      name: 'aplicativo-rainha-da-bet',
      cwd: __dirname,
      script: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env
    }
  ]
}
