const axios = require('axios');
const CONFIG = require('../config/index');

async function main() {
  addTempUser(0);
}

main();

async function addTempUser(i) {
  const DATA = await axios.post(`http://localhost:${CONFIG.seeder.seedPort}/users/create`);
  console.log(i, DATA.data);
  if (i < 100) {
    setTimeout(() => {
      addTempUser(i + 1);
    }, Math.random() * 7000);
  }
}
