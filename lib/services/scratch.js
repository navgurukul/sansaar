/* eslint-disable no-redeclare */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-vars */
const Schmervice = require('schmervice');

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { errorHandler } = require('../errorHandling');

const CONSTANTS = require('../config/index');

const S3Bucket = new AWS.S3({
  accessKeyId: CONSTANTS.auth.merakiScratch.scratchS3SecretKeyId,
  secretAccessKey: CONSTANTS.auth.merakiScratch.scratchS3SecretAccessKey,
  Bucket: CONSTANTS.auth.merakiScratch.scratchBucket,
});

// eslint-disable-next-line class-methods-use-this
module.exports = class ScratchService extends Schmervice.Service {
  async tempCretentialsForAndroid(project_id) {
    // Generate temporary security credentials using IAM
    try {
      const sts = new AWS.STS({
        accessKeyId: CONSTANTS.auth.aws.tempCretentialCreatorAccessKey,
        secretAccessKey: CONSTANTS.auth.aws.tempCretentialCreatorSecretKeyId,
        region: CONSTANTS.auth.aws.s3Region,
      });

      const params = {
        RoleArn: CONSTANTS.auth.aws.tempCretentialCreatorRole,
        RoleSessionName: 'MyAppSession',
        DurationSeconds: 3600,
      };

      const { Credentials } = await sts.assumeRole(params).promise();
      const { Scratch } = this.server.models();

      // Upload file to S3 using temporary security credentials
      const newProject = await Scratch.query().insert({
        project_id,
        url:
          'project is not uploaded yet. URL will be updated once the project is uploaded. If this is not updated within 1 hour, this row may be deleted.',
      });
      const s3Params = {
        Bucket: CONSTANTS.auth.merakiScratch.scratchBucket,
        Key: `scratch/${project_id}.sb3`,
        ContentType: 'application/x-scratch-project',
        ACL: 'public-read',
        // Body: request.payload,
        Body: null,
        Credentials,
        project_id,
      };
      return [null, s3Params];
    } catch (e) {
      return [errorHandler(e), null];
    }
  }

  async getScratchProjectsByUserId(userId) {
    const { Scratch } = this.server.models();
    try {
      const projects = await Scratch.query().where('userId_scratch', userId);
      if (projects.length > 0) {
        const formattedProjects = projects.map((project) => ({
          userId: project.userId_scratch,
          projectId: project.project_id,
          projectName: project.project_name,
          s3link: project.url,
          scratchUrl: `https://www.scratch.merakilearn.org/projects/${project.project_id}`,
        }));
        return [null, formattedProjects];
      }
      return [null, { error: true, message: 'No projects found for the user' }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async createProjectId() {
    try {
      function randomId() {
        return Math.floor(Math.random() * 1000000).toString();
      }
      const project_id = randomId();
      const { Scratch } = this.server.models();
      const project = await Scratch.query().where('project_id', project_id);
      console.log();
      if (project.length > 0) {
        return createProjectId();
      }
      return [null, project_id];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  createNameValidate(project_name, allProjectsNames) {
    const NameCheck = (changedName) => {
      if (allProjectsNames.includes(changedName)) {
        return false;
      }
      return true;
    };
    const nameValidations = (name) => {
      let count = '';
      while (!NameCheck(name + count)) {
        if (count == '') {
          count = 0;
        }
        count += 1;
      }
      const finalName = name + count;
      return finalName;
    };
    const NewName = nameValidations(project_name);
    return NewName;
  }

  async uploadFile(fileObj, userId_scratch, project_name, team_id) {
    const [err, project_id] = await this.createProjectId();
    const { Scratch } = this.server.models();
    const key = `scratch/${project_id}.sb3`;
    const scratchProjects = await Scratch.query()
      .select('project_name')
      .where('project_name', 'LIKE', `%${project_name}%`);
    const allProjectsNames = scratchProjects.map(
      (project) => project && project.project_name && project.project_name.replace(/\.sb3$/, '')
    );
    const NewName = this.createNameValidate(project_name, allProjectsNames);
    try {
      const uploadParams = {
        Bucket: CONSTANTS.auth.merakiScratch.scratchBucket,
        Key: key,
        Body: fileObj._data,
        ContentType: fileObj.hapi.headers['content-type'],
      };

      const uploader = S3Bucket.upload(uploadParams);
      const uploaded = await uploader.promise();
      const url = `https://${CONSTANTS.auth.merakiScratch.scratchBucket}.s3.ap-south-1.amazonaws.com/${key}`;
      const store = await Scratch.query().insert({
        project_id,
        url,
        userId_scratch,
        project_name: `${NewName}.sb3`,
        team_id,
      });
      if (team_id) {
        store.userId = null;
        store.team_id = team_id;
      } else {
        store.team_id = null;
        store.userId = userId_scratch;
      }
      const response = {
        userId: store.userId,
        url: store.url,
        scratch_url: `https://www.scratch.merakilearn.org/projects/${project_id}`,
        team_id: store.team_id,
      };
      return [null, response];
    } catch (e) {
      return [errorHandler(e), null];
    }
  }

  async updateFile(project_id, file, userId_scratch, project_name) {
    try {
      const { Scratch } = this.server.models();
      const Key = `scratch/${project_id}.sb3`;
      const uploadParams = {
        Bucket: CONSTANTS.auth.merakiScratch.scratchBucket,
        Key,
        Body: file._data,
        ContentType: file.hapi.headers['content-type'],
      };

      // Check if the project with the given project_id exists in the Scratch table
      const project = await Scratch.query().findOne({ project_id });
      if (!project) {
        return [null, { error: true, message: 'Project not found' }];
      }

      // Update the project file on S3
      await S3Bucket.putObject(uploadParams).promise();
      const url = `https://${CONSTANTS.auth.merakiScratch.scratchBucket}.s3.ap-south-1.amazonaws.com/${Key}`;

      // Update the project record in the Scratch table
      const updatedProject = await Scratch.query()
        .findById(project.id)
        .patch({ url, project_name: `${project_name}.sb3` });
      const scratch_url = `https://www.scratch.merakilearn.org/projects/${project_id}`;

      return [null, { userId: userId_scratch, userId_scratch, url, scratch_url }];
    } catch (e) {
      return [errorHandler(e), null];
    }
  }

  async getScratchFile(userId_scratch, team_id) {
    const { Scratch } = this.server.models();
    try {
      const user_data = userId_scratch ? { userId_scratch } : { team_id };
      const storeData = await Scratch.query().select().where(user_data);
      const desire_data = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const i of storeData) {
        const data = {
          userId: i.userId_scratch,
          projectId: i.project_id,
          projectName: i.project_name,
          s3link: i.url,
          scratchUrl: `https://www.scratch.merakilearn.org/projects/${i.project_id}`,
          updatedAt: i.updated_at,
        };
        if(team_id) {
          data.team_id = team_id;
          data.userId = null;
        }else {
          data.userId = userId_scratch;
          data.team_id = null;
        }
        desire_data.push(data);
      }
      return [null, desire_data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async DeleteFile(project_id) {
    const { Scratch, ScratchSample } = this.server.models();
    try {
      const projectFile = await Scratch.query().where('project_id', project_id);
      const projectSampleFile = await ScratchSample.query().where('project_id', project_id);
      if(projectFile.length == 0 && projectSampleFile.length > 0) {
        const Key = projectSampleFile[0].url.split('amazonaws.com/')[1];
        const deleteParams = { Bucket: CONSTANTS.auth.merakiScratch.scratchBucket, Key };
        const result = await S3Bucket.deleteObject(deleteParams).promise();
        const deleteData = await ScratchSample.query().delete().where({ project_id });
        return [
          null,
          { count: deleteData, status: 'success', message: 'file deleted successfully...' },
        ];
      }
      if (projectFile.length > 0) {
        const Key = projectFile[0].url.split('amazonaws.com/')[1];
        const deleteParams = { Bucket: CONSTANTS.auth.merakiScratch.scratchBucket, Key };
        const result = await S3Bucket.deleteObject(deleteParams).promise();
        const deleteData = await Scratch.query().delete().where({ project_id });
        return [
          null,
          { count: deleteData, status: 'success', message: 'file deleted successfully...' },
        ];
      }
      return [null, projectFile];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async Get_ScratchFile_by_project_id(project_id) {
    const { Scratch,ScratchSample } = this.server.models();
    try {
      const projectFile = await Scratch.query().where('project_id', project_id);
      const projectSampleFile = await ScratchSample.query().where('project_id', project_id);
      console.log(projectFile,projectSampleFile,'eeeeeeeeeeeeeeeeee');
      if(projectFile.length == 0 && projectSampleFile.length > 0) {
        const project_details = await ScratchSample.query().where({ project_id });
        const p_details = {
          projectId: project_details[0].project_id,
          projectName: project_details[0].project_name,
          s3link: project_details[0].url,
          scratchUrl: `https://www.scratch.merakilearn.org/projects/${project_details[0].project_id}`,
        };
        return [null, p_details];
      }
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
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async DeleteProject_By_userId_scratch(userId_scratch, team_id) {
    const { Scratch } = this.server.models();
    try {
      const user_data = userId_scratch ? { userId_scratch } : { team_id };
      const project_details = await Scratch.query().where(user_data);
      if (project_details.length > 0) {
        // eslint-disable-next-line no-plusplus
        for (let ind = 0; ind < project_details.length; ind++) {
          const Key = project_details[ind].url.split('amazonaws.com/')[1];
          const deleteParams = { Bucket: CONSTANTS.auth.merakiScratch.scratchBucket, Key };
          // eslint-disable-next-line no-await-in-loop
          const result = await S3Bucket.deleteObject(deleteParams).promise();
        }
        const deleteData = await Scratch.query().delete().where( user_data );
        return [
          null,
          { count: deleteData, status: 'success', message: 'projects deleted successfully...' },
        ];
      }
      return [null, { error: true, message: `${Object.keys(user_data)} dosen't exit` }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }


  async uploadSampleFile(fileObj, project_name) {
    const { ScratchSample } = this.server.models();
    const [err, project_id] = await this.createProjectId();
    const key = `scratch/${project_id}.sb3`;
    try {
      const uploadParams = {
        Bucket: CONSTANTS.auth.merakiScratch.scratchBucket,
        Key: key,
        Body: fileObj._data,
        ContentType: fileObj.hapi.headers['content-type'],
      };
      const uploader = S3Bucket.upload(uploadParams);
      const uploaded = await uploader.promise();
      const url = `https://${CONSTANTS.auth.merakiScratch.scratchBucket}.s3.ap-south-1.amazonaws.com/${key}`;
      const store = await ScratchSample.query().insert({
        project_id,
        url,
        project_name: `${project_name}.sb3`,
      });
      const response = {
        project_id: store.project_id,
        url: store.url,
        scratch_url: `https://www.scratch.merakilearn.org/projects/${project_id}`,
      };
      return [null, response];
    } catch (e) {
      return [errorHandler(e), null];
    }
  }

  async getScratchSampleFile() {
    const { ScratchSample } = this.server.models();
    try {
      const storeData = await ScratchSample.query().select();
      const desire_data = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const i of storeData) {
        const data = {
          projectId: i.project_id,
          projectName: i.project_name,
          s3link: i.url,
          scratchUrl: `https://www.scratch.merakilearn.org/projects/${i.project_id}`,
          cretedAt: i.created_at,
        };
        desire_data.push(data);
      }
      return [null, desire_data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }  
};
