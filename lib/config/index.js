const Dotenv = require('dotenv');
const CONSTANTS = require('./constants');

Dotenv.config({ path: `${__dirname}/../server/.env` });

module.exports = {
  ...CONSTANTS,
  auth: {
    googleClientIDWeb: process.env.GOOGLE_AUTH_CLIENT_ID_WEB,
    googleClientIDAndroid: process.env.GOOGLE_AUTH_CLIENT_ID_ANDROID,
    jwt: {
      secret: process.env.AUTH_JWT_SECRET,
      expiresIn: '7d',
    },
    githubAccessKey: {
      secret: process.env.GITHUB_SECRET_KEY,
      schoolId: process.env.SCHOOL_ID,
      basePath: process.env.BASE_URL,
    },
    chat: {
      accessToken: process.env.CHAT_ACCESS_TOKEN,
      homeserverUrl: process.env.HOMESERVER_URL,
    },
  },
  swagger: {
    uiPath:
      process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
        ? '/apiDocs/swaggerui/'
        : '/swaggerui/',
    jsonPath:
      process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
        ? '/apiDocs/swagger.json'
        : '/swagger.json',
    basePath:
      process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
        ? '/apiDocs/'
        : '/',
  },
  mode: process.env.NODE_ENV,
};
