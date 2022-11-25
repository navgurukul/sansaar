/* eslint-disable no-unused-vars */
const Schmervice = require('schmervice');

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const CONSTANTS = require('../config/index');
const { errorHandler } = require('../errorHandling');

const S3Bucket = new AWS.S3({
  accessKeyId: CONSTANTS.auth.merakiCertificate.s3SecretKeyId,
  secretAccessKey: CONSTANTS.auth.merakiCertificate.s3SecretAccessKey,
  Bucket: CONSTANTS.auth.merakiCertificate.s3Bucket,
});

// eslint-disable-next-line class-methods-use-this
module.exports = class ScratchService extends Schmervice.Service {
  async uploadFile(fileObj) {
    const { Scratch } = this.server.models();
    const key = `scratch/${uuidv4()}-${fileObj.hapi.filename}`;
    try {
      const uploaded = await S3Bucket.putObject({
        Bucket: 'chanakya-dev', // CONSTANTS.auth.aws.s3Bucket,
        Key: key,
        Body: fileObj._data,
        ContentType: fileObj.hapi.headers['content-type'],
      }).promise();
      const url = `https://${CONSTANTS.auth.aws.s3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
      const store = await Scratch.query().insert({ project_id: 3, url });
      return store;
    } catch (e) {
      return e;
    }
  }

  async getScratchFile(project_id) {
    const { Scratch } = this.server.models();
    try {
      const storeData = await Scratch.query().where('project_id', project_id);
      return [null, storeData];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
