const Schmervice = require('schmervice');
const { google } = require('googleapis');
const AWS = require('aws-sdk');

const { OAuth2 } = google.auth;
const YoutubeApi = google.youtube('v3');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});
const S3 = new AWS.S3();
const CONFIG = require('../config');

/**
 * Please review the tokens here
 * Tokens need to be of a service account
 * Please configure the needful in google developers console
 * Visit https://developers.google.com/
 */
const oAuth2Client = new OAuth2(
  CONFIG.auth.meraki.googleClientID,
  CONFIG.auth.meraki.googleClientSecret,
  CONFIG.auth.googleConsentRedirectURI
);
oAuth2Client.credentials = {
  refresh_token: CONFIG.auth.meraki.authRefreshToken,
};

module.exports = class YoutubeService extends Schmervice.Service {
  /* eslint-disable */
  async uploadFromS3({ video, title, description }) {
    try {
      const s3data = {
        Bucket: CONFIG.auth.aws.s3YoutubeBucket,
        Key: video,
      };
      let fileStream = S3.getObject(s3data).createReadStream();
      const params = {
        auth: oAuth2Client,
        part: 'snippet,status',
        resource: {
          snippet: {
            title,
            description,
          },
          status: {
            privacyStatus: 'public',
          },
        },
        media: {
          mimeType: 'video/mp4',
          body: fileStream,
        },
      };
      const response = await YoutubeApi.videos.insert(params);
      return [null, response.data.id];
    } catch (err) {
      return [{ err, message: 'Something went wrong', code: 500 }, null];
    }
  }
  /* eslint-enable */
};