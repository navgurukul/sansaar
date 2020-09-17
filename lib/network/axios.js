const axios = require('axios');
const CONFIG = require('../config');

const axiosInstance = axios.create({
  baseURL: CONFIG.auth.chatAdmin.homeserverUrl,
  headers: {
    authorization: `Bearer ${CONFIG.auth.chatAdmin.accessToken}`,
  },
});

module.exports = axiosInstance;
