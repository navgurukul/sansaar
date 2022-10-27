const Dotenv = require('dotenv');
const CONSTANTS = require('./constants');

Dotenv.config({ path: `${__dirname}/../../server/.env` });

module.exports = {
  ...CONSTANTS,
  redis: process.env.REDIS_CACHE,
  auth: {
    googleClientIDWeb: process.env.GOOGLE_AUTH_CLIENT_ID_WEB,
    googleClientSecretWeb: process.env.GOOGLE_AUTH_CLIENT_SECRET_WEB,
    googleConsentRedirectURI: process.env.GOOGLE_CONSENT_REDIRECT_URI,
    googleClientIDAndroid: process.env.GOOGLE_AUTH_CLIENT_ID_ANDROID,
    aws: {
      s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      s3SecretKeyId: process.env.S3_SECRET_KEY_ID,
      s3Region: process.env.S3_REGION,
      s3Bucket: process.env.S3_BUCKET,
    },
    jwt: {
      secret: process.env.AUTH_JWT_SECRET,
      expiresIn: '1y',
    },
    githubAccessKey: {
      secret: process.env.GITHUB_SECRET_KEY,
      schoolId: process.env.GITHUB_SCHOOL_ID,
      basePath: process.env.GITHUB_BASE_URL,
    },
    chat: {
      accessToken: process.env.CHAT_ACCESS_TOKEN,
      homeserverUrl: process.env.CHAT_HOMESERVER_URL,
      merakiUserId: process.env.CHAT_MERAKI_USER_ID,
    },
    meraki: {
      googleClientID: process.env.MERAKI_AUTH_CLIENT_ID,
      googleClientSecret: process.env.MERAKI_AUTH_CLIENT_SECRET,
      authRefreshToken: process.env.MERAKI_AUTH_REFRESH_TOKEN,
    },
    translation: {
      googleTranslation: process.env.GOOGLE_TRANSLATION,
    },
    merakiCertificate: {
      s3SecretKeyId: process.env.S3_ACCESS_KEY_ID_CERTIFICATE,
      s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY_CERTIFICATE,
      s3Bucket: process.env.BUCKET_CERTIFICATE,
      s3BaseUrl: process.env.BASE_URL_CERTIFICATE,
    },
  },
  seeder: {
    seedPort: process.env.SEED_PORT,
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
  bitly: { token: process.env.BITLY_TOKEN },
};
