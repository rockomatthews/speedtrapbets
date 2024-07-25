const axios = require('axios');

class IracingApi {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.baseUrl = 'https://members-ng.iracing.com/data/';
    this.session = axios.create({
      baseURL: this.baseUrl,
      withCredentials: true,
    });
  }

  async login() {
    const response = await this.session.post('https://members-ng.iracing.com/auth', {
      email: this.username,
      password: this.password,
    });
    return response.data;
  }

  async getResource(endpoint, params = {}) {
    try {
      await this.login();
      const response = await this.session.get(endpoint, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching resource:', error);
      throw error;
    }
  }

  async searchDriver(searchTerm) {
    return this.getResource('lookup/drivers', { search_term: searchTerm });
  }

  // Add more methods here as needed, similar to the Python wrapper
}

module.exports = IracingApi;