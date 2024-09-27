const Dotenv = require('dotenv');
const CONSTANTS = require('./constants');

Dotenv.config({ path: `${__dirname}/../../server/.env` });

module.exports = {
  ...CONSTANTS,
  redis: process.env.REDIS_CACHE,
  openAiAPI: process.env.OPENAI_API_KEY || 'secret',
  articleSourceSheet: {
    sheetId: process.env.SHEET_ID || 'secret',
    sheetName: process.env.SHEET_NAME || 'secret',
    sheetRange: process.env.SHEET_RANGE || 'secret',
    privateKey: process.env.PRIVATE_KEY || 'secret',
    clientEmail: process.env.CLIENT_EMAIL || 'secret',
  },
  auth: {
    googleClientIDWeb: process.env.GOOGLE_AUTH_CLIENT_ID_WEB,
    googleClientSecretWeb: process.env.GOOGLE_AUTH_CLIENT_SECRET_WEB,
    googleConsentRedirectURI: process.env.GOOGLE_CONSENT_REDIRECT_URI,
    googleConsentRedirectURIPartnerdashboard:
      process.env.GOOGLE_CONSENT_REDIRECT_URI_PARTNER_DASHBOARD,
    googleClientIDAndroid: process.env.GOOGLE_AUTH_CLIENT_ID_ANDROID,
    aws: {
      s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      s3SecretKeyId: process.env.S3_SECRET_KEY_ID,
      s3Region: process.env.S3_REGION,
      s3Bucket: process.env.S3_BUCKET,
      s3YoutubeBucket: process.env.S3_YOUTUBE_BUCKET,
      // scratchBucket: process.env.SCRATCH_BUCKET,
      tempCretentialCreatorAccessKey: process.env.CRETENTIALS_TEMP_ACCESS_KEY,
      tempCretentialCreatorSecretKeyId: process.env.CRETENTIALS_TEMP_SECRET_KEY,
      tempCretentialCreatorRole: process.env.CRETENTIALS_TEMP_ROLE,
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
    // chat: {
    //   accessToken: process.env.CHAT_ACCESS_TOKEN,
    //   homeserverUrl: process.env.CHAT_HOMESERVER_URL,
    //   merakiUserId: process.env.CHAT_MERAKI_USER_ID,
    // },
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
    attendanceVideo: {
      meetS3SecretKeyId: process.env.MEET_EXTENSION_S3_SECRET_ACCESS_KEY,
      meetS3SecretAccessKey: process.env.MEET_EXTENSION_S3_SECRET_KEY_ID,
      meetBucket: process.env.MEET_EXTENSION_BUCKET,
      meetExtensiontempCretentialCreatorRole: process.env.MEET_EXTENSION_TEMP_CRETENTIALS_ROLE,
    },
    merakiScratch: {
      scratchBucket: process.env.MERAKI_SCRATCH_BUCKET,
      scratchS3SecretKeyId: process.env.MERAKI_SCRATCH_ACCESS_KEY_ID,
      scratchS3SecretAccessKey: process.env.MERAKI_SCRATCH_SECRET_ACCESS_KEY,
    },
    c4ca: {
      c4caS3Bucket: process.env.C4CA_BUCKET,
      c4caS3SecretKeyId: process.env.C4CA_ACCESS_KEY_ID,
      c4caS3SecretAccessKey: process.env.C4CA_SECRET_ACCESS_KEY,
    },
    // password secret key
    password: {
      passwordSecretKey: process.env.PASSWORD_SECRET_KEY,
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