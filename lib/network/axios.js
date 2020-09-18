const axios = require('axios');
const CONFIG = require('../config');

const axiosAdmin = axios.create({
  baseURL: CONFIG.auth.chatAdmin.homeserverUrl,
  headers: {
    authorization: `Bearer ${CONFIG.auth.chatAdmin.accessToken}`,
  },
});

const axiosInstance = axios.create({
  baseURL: CONFIG.auth.chatAdmin.homeserverUrl,
});

module.exports = {
  axiosAdmin: axiosAdmin,
  axiosInstance: axiosInstance,
};
