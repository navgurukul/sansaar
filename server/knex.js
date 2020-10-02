const Dotenv = require('dotenv');
const knex = require('knex');

Dotenv.config({ path: `${__dirname}/.env` });

module.exports = {
  chatKnex: knex({
    client: 'pg',
    connection: {
      database: process.env.BOL_DB_NAME,
      host: process.env.BOL_DB_HOST,
      user: process.env.BOL_DB_USER,
      password: process.env.BOL_DB_PASS,
    },
  }),
};
