/* eslint-disable no-redeclare */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-vars */
const Schmervice = require('schmervice');

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { errorHandler } = require('../errorHandling');

const CONSTANTS = require('../config/index');

const S3Bucket = new AWS.S3({
  accessKeyId: CONSTANTS.auth.merakiCertificate.s3SecretKeyId,
  secretAccessKey: CONSTANTS.auth.merakiCertificate.s3SecretAccessKey,
  Bucket: CONSTANTS.auth.merakiCertificate.s3Bucket,
});

// eslint-disable-next-line class-methods-use-this
module.exports = class ScratchService extends Schmervice.Service {
  async uploadFile(fileObj, userId_scratch,project_name) {
    const project_id = Math.floor(Math.random() * 1000000).toString();
    const { Scratch } = this.server.models();
    const key = `scratch/${fileObj.hapi.filename}`;
    try {
      const uploaded = await S3Bucket.putObject({
        Bucket: CONSTANTS.auth.aws.scratchBucket,
        Key: key,
        Body: fileObj._data,
        ContentType: fileObj.hapi.headers['content-type'],
      }).promise();
      const url = `https://${CONSTANTS.auth.aws.scratchBucket}.s3.ap-south-1.amazonaws.com/${key}`;
      const store = await Scratch.query().insert({ project_id, url, userId_scratch, project_name });
      store.userId = userId_scratch;
      store.scratch_url = `https://www.scratch.merakilearn.org/projects/${project_id}`;
      return [null, store];
    } catch (e) {
      return [errorHandler(e), null];
    }
  }

  async updateFile(project_id, file, userId_scratch, project_name) {
    const { Scratch } = this.server.models();
    // const projectId = uuidv4();
    const projectId = Math.floor(Math.random() * 1000000).toString();
    // https://chanakya-dev.s3.ap-south-1.amazonaws.com/scratch/a2f0577d-c88b-440a-8192-cc5d1aeff10d-GautamBudh.webp // url
    // 'scratch/a2f0577d-c88b-440a-8192-cc5d1aeff10d-GautamBudh.webp'  // key
    try {
      let scratch_url;
      let projectFile;
      let url;
      let store;
      let Key = `scratch/${file.hapi.filename}`;
      let uploadParams = {
        Bucket: CONSTANTS.auth.aws.scratchBucket,
        Key,
        Body: file._data,
        ContentType: file.hapi.headers['content-type'],
      };
      const project_id_from_table = await Scratch.query().where('project_id', project_id);
      if (project_id_from_table.length === 0) {
        if (project_name) {
          await S3Bucket.putObject(uploadParams).promise();
          url = `https://${CONSTANTS.auth.aws.scratchBucket}.s3.ap-south-1.amazonaws.com/${Key}`;
          store = await Scratch.query().insert({ project_id, url, userId_scratch, project_name });
          store.scratch_url = `https://www.scratch.merakilearn.org/projects/${project_id}`;
          return [null, { userId: store.userId_scratch, url, scratch_url: store.scratch_url }];
        }
        return [null, { error: true, message: 'project_name is required' }];
      }
      projectFile = await Scratch.query().where('project_id', project_id);
      Key = projectFile[0].url.split('amazonaws.com/')[1];
      const deleteParams = { Bucket: 'chanakya-dev', Key };
      Key = `scratch/${file.hapi.filename}`;
      uploadParams = {
        Bucket: CONSTANTS.auth.aws.scratchBucket,
        Key,
        Body: file._data,
        ContentType: file.hapi.headers['content-type'],
      };
      await S3Bucket.deleteObject(deleteParams).promise();
      await S3Bucket.putObject(uploadParams).promise();
      url = `https://${CONSTANTS.auth.aws.scratchBucket}.s3.ap-south-1.amazonaws.com/${Key}`;
      scratch_url = `https://www.scratch.merakilearn.org/projects/${project_id}`;
      if (project_name) {
        store = await Scratch.query()
          .update({ project_id, url, project_name })
          .where('project_id', project_id);
        return [null, { userId: userId_scratch, url, scratch_url }];
      }
      store = await Scratch.query().update({ project_id, url }).where('project_id', project_id);
      return [null, { userId: userId_scratch, url, scratch_url }];
    } catch (e) {
      return [errorHandler(e), null];
    }
  }

  async getScratchFile(userId_scratch) {
    const { Scratch } = this.server.models();
    try {
      let storeData;
      storeData = await Scratch.query()
        .select()
        .where('userId_scratch', userId_scratch);
      let desire_data = []
      for (const i of storeData) {
        const data = {
          userId : i.userId_scratch,
          projectId :i.project_id,
          projectName : i.project_name,
          s3link : i.url,
          scratchUrl : `https://www.scratch.merakilearn.org/projects/${i.project_id}`,
          updatedAt : i.updated_at,
        }
        desire_data.push(data);
      }
      return [null, desire_data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async DeleteFile(project_id) {
    const { Scratch } = this.server.models();
    try {
      const projectFile = await Scratch.query().where('project_id', project_id);
      if (projectFile.length > 0) {
        const Key = projectFile[0].url.split('amazonaws.com/')[1];
        const deleteParams = { Bucket: 'chanakya-dev', Key };
        const result = await S3Bucket.deleteObject(deleteParams).promise();
        const deleteData = await Scratch.query().delete().where({ project_id });
        return [
          null,
          { count: deleteData, status: 'success', message: 'file deleted successfully...' },
        ];
      }
      return [null, projectFile];
    } catch (error) {
      return [null, error];
    }
  }

  async Get_ScratchFile_by_project_id(project_id) {
    const { Scratch } = this.server.models();
    try {
      const projectFile = await Scratch.query().where('project_id', project_id);
      if (projectFile.length > 0) {
        const project_details = await Scratch.query().where({ project_id });
        const p_details = {
          userId: project_details[0].userId_scratch,
          projectId: project_details[0].project_id,
          projectName: project_details[0].project_name,
          s3link: project_details[0].url,
          scratchUrl: `https://www.scratch.merakilearn.org/projects/${project_details[0].project_id}`,
        };
        return [null, p_details];
      }
      return [null, { error: true, message: "project_id dosen't exit" }];
    } catch (error) {
      return [null, error];
    }
  }
};
