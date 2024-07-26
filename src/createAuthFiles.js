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
  return key;
}

async function createCredsFile(keyPath, credsPath, username, password) {
  await ensureDirectoryExists(path.dirname(credsPath));
  const key = await fs.readFile(keyPath, 'utf8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'base64'), iv);
  let encrypted = cipher.update(`${username}:${password}`, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const result = iv.toString('hex') + encrypted;
  await fs.writeFile(credsPath, result, { mode: 0o400 });
  return result;
}

// Usage
const authDir = path.join(__dirname, '..', 'auth');
const keyPath = path.join(authDir, 'iracing.key');
const credsPath = path.join(authDir, 'iracing.creds');

createKeyFile(keyPath)
  .then(key => {
    console.log('Key file created');
    console.log('IRACING_KEY:', key);
    return createCredsFile(keyPath, credsPath, 'rob@fastwebwork.com', 'RecessBoi69!');
  })
  .then(creds => {
    console.log('Creds file created');
    console.log('IRACING_CREDS:', creds);
  })
  .catch(error => console.error('Error:', error));