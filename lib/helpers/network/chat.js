const axios = require('axios');
const CONFIG = require('../../config');

const axiosAuth = axios.create({
  baseURL: CONFIG.auth.chat.homeserverUrl,
  headers: {
    authorization: `Bearer ${CONFIG.auth.chat.accessToken}`,
  },
});

const axiosUnAuth = axios.create({
  baseURL: CONFIG.auth.chat.homeserverUrl,
});

module.exports = {
  axiosAuth,
  axiosUnAuth,
};
