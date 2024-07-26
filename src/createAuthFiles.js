const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function createKeyFile(filePath) {
  await ensureDirectoryExists(path.dirname(filePath));
  const key = crypto.randomBytes(32).toString('base64');
  await fs.writeFile(filePath, key, { mode: 0o400 });
}

async function createCredsFile(keyPath, credsPath, username, password) {
  await ensureDirectoryExists(path.dirname(credsPath));
  const key = await fs.readFile(keyPath, 'utf8');
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(`${username}:${password}`, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  await fs.writeFile(credsPath, encrypted, { mode: 0o400 });
}

// Usage
const authDir = path.join(__dirname, '..', 'auth');
const keyPath = path.join(authDir, 'iracing.key');
const credsPath = path.join(authDir, 'iracing.creds');

createKeyFile(keyPath)
  .then(() => console.log('Key file created'))
  .then(() => createCredsFile(keyPath, credsPath, 'rob@fasrtwebwork.com', 'RecessBoi69!'))
  .then(() => console.log('Creds file created'))
  .catch(error => console.error('Error:', error));