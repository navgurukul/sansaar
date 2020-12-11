// Change the rc_federation setting in synapse's homeserver.yaml configuration to allow more than 5-6 API calls to create users

const axios = require('axios');
const CONFIG = require('../config/index');

async function addTempUser(i) {
  await axios.post(`http://localhost:${CONFIG.seeder.seedPort}/users/create`);
  if (i < 100) {
    setTimeout(() => {
      addTempUser(i + 1);
    }, Math.random() * 7000);
  }
}

async function main() {
  addTempUser(0);
}

main();
