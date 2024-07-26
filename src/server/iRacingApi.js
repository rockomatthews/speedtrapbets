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
  }

  async login() {
    try {
      const response = await this.session.post('auth', {
        email: this.username,
        password: this.password,
      });
      console.log('Login successful');
      return response.data;
    } catch (error) {
      console.error('Login failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  async getResource(endpoint, params = {}) {
    try {
      await this.login();
      const response = await this.session.get(`data/${endpoint}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching resource:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  async searchDriver(searchTerm) {
    return this.getResource('lookup/drivers', { search_term: searchTerm });
  }
}

module.exports = IracingApi;