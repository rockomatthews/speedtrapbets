const axios = require('axios');
const crypto = require('crypto');

class IracingApi {
    constructor() {
        this.baseUrl = 'https://members-ng.iracing.com/data/';
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

        const [ivHex, encrypted] = encryptedCreds.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'base64'), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        const [username, password] = decrypted.split(':');
        await this.login(username, password);
    }

    async login(username, password) {
        try {
            const response = await this.session.post('https://members-ng.iracing.com/auth', {
                email: username,
                password: password,
            });
            
            const cookies = response.headers['set-cookie'];
            if (cookies) {
                this.authCookie = cookies.find(cookie => cookie.startsWith('authtoken_members'));
                if (!this.authCookie) {
                    throw new Error('Authentication cookie not found in response');
                }
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

            const response = await this.session.get(uri, {
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