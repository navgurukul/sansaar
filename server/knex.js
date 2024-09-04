
const Dotenv = require('dotenv');
const knex = require('knex');
const path = require('path');

// Load environment variables from .env file
Dotenv.config({ path: path.join(__dirname, '../.env') });

module.exports = {
  chatKnex: knex({
    client: 'pg',
    connection: {
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
    },
    pool: {
      min: 4,
      max: 200,
    },
    // seeds: {
    //   directory: path.join(__dirname, '../lib/seeds') 
    // },
  }),
};
