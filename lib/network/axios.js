const axios = require('axios');
const CONFIG = require('../config');

const axiosAdmin = axios.create({
  baseURL: CONFIG.auth.chat.homeserverUrl,
  headers: {
    authorization: `Bearer ${CONFIG.auth.chat.accessToken}`,
  },
});

const axiosInstance = axios.create({
  baseURL: CONFIG.auth.chat.homeserverUrl,
});

module.exports = {
  axiosAdmin,
  axiosInstance,
};
