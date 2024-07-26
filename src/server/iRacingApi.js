const axios = require('axios');

class IracingApi {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.baseUrl = 'https://members-ng.iracing.com/';
    this.session = axios.create({
      baseURL: this.baseUrl,
      withCredentials: true,
    });
    this.authToken = null;
  }

  async login() {
    try {
      const response = await this.session.post('auth', {
        email: this.username,
        password: this.password,
      });
      console.log('Login successful');
      this.authToken = response.headers['set-cookie']; // Store the auth token
      return response.data;
    } catch (error) {
      console.error('Login failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  async getResource(endpoint, params = {}) {
    try {
      if (!this.authToken) {
        await this.login();
      }
      const response = await this.session.get(`data/${endpoint}`, {
        params,
        headers: {
          Cookie: this.authToken
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching resource:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  async searchDriver(searchTerm) {
    console.log('Starting searchDriver function with term:', searchTerm);
    try {
      console.log('Calling getResource...');
      const result = await this.getResource('lookup/drivers', { search_term: searchTerm });
      console.log('getResource call successful. Result:', result);
      return result;
    } catch (error) {
      console.error('Error in searchDriver:', error);
      console.error('Error details:', error.response ? error.response.data : error.message);
      throw error;
    }
  }
}

module.exports = IracingApi;