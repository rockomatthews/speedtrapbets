const axios = require('axios');
const crypto = require('crypto');

class IracingApi {
    constructor() {
        this.baseUrl = 'https://members-ng.iracing.com/';
        this.session = axios.create({
            baseURL: this.baseUrl,
            withCredentials: true,
        });
        this.authCookie = null;
    }

    async authWithEnvironmentVars() {
        const key = process.env.IRACING_KEY;
        const encryptedCreds = process.env.IRACING_CREDS;

        if (!key || !encryptedCreds) {
            throw new Error('iRacing key or credentials not found in environment variables');
        }

        console.log('Key length:', key.length);
        console.log('Encrypted Creds length:', encryptedCreds.length);

        if (encryptedCreds.length < 32) {
            throw new Error('Encrypted credentials are too short');
        }

        const ivHex = encryptedCreds.slice(0, 32);
        const encrypted = encryptedCreds.slice(32);

        console.log('IV Hex length:', ivHex.length);
        console.log('Encrypted length:', encrypted.length);

        const iv = Buffer.from(ivHex, 'hex');

        if (iv.length !== 16) {
            throw new Error(`Invalid IV length: ${iv.length}`);
        }

        try {
            const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'base64'), iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            const [username, password] = decrypted.split(':');
            
            console.log('Decryption successful');
            console.log('Username length:', username.length);
            console.log('Password length:', password.length);

            await this.login(username, password);
        } catch (error) {
            console.error('Decryption error:', error);
            throw error;
        }
    }

    async login(username, password) {
      try {
          const response = await axios.post(this.baseUrl + 'auth', {
              email: username,
              password: password,
          }, {
              withCredentials: true
          });
          
          const cookies = response.headers['set-cookie'];
          if (cookies) {
              this.authCookie = cookies.find(cookie => cookie.startsWith('authtoken_members'));
              if (!this.authCookie) {
                  throw new Error('Authentication cookie not found in response');
              }
              // Set the cookie for future requests
              this.session.defaults.headers.Cookie = this.authCookie;
              console.log('Auth cookie set:', this.authCookie);
          } else {
              throw new Error('No cookies received in authentication response');
          }

          console.log('Login successful');
      } catch (error) {
          console.error('Login failed:', error.response ? error.response.data : error.message);
          throw error;
      }
  }

  async get(uri, params = {}) {
      try {
          if (!this.authCookie) {
              throw new Error('Not authenticated. Please login first.');
          }

          console.log('Sending request with auth cookie:', this.authCookie);
          const response = await this.session.get('data/' + uri, {
              params: params,
              headers: {
                  Cookie: this.authCookie
              }
          });
          return response.data;
      } catch (error) {
          console.error(`Error fetching ${uri}:`, error.response ? error.response.data : error.message);
          throw error;
      }
  }
}

module.exports = IracingApi;