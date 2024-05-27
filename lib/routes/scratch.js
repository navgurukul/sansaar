/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
const Joi = require('@hapi/joi');
const { ElasticInference } = require('aws-sdk');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'GET',
    path: '/scratch/uploadCredentials',
    options: {

      description: 'Create temporary Amazon Web Services credentials for uploading to Amazon S3.',
      notes: 'File-upload credentials',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
    handler: async (request, h) => {
       
      const { scratchService } = request.services();
      const [error,reserveProjectId] =  await scratchService.createProjectId()
      const [err, data] = await scratchService.tempCretentialsForAndroid(reserveProjectId);
      if (err||data==null) { 
        if (data==null){
          return {error:true,status:400}
        }
        logger.error(JSON.stringify(err));
        return h.response(err).code(err.code);
      }
      return { data:data};
    
    }
  }
},
{
  method: 'PUT',
  path: '/scratch/withoutFile/{projectId}',
  options: {
    description: 'Update Scratch project url, name data by project ID without updating file',
    tags: ['api'],
    auth: {
      strategy: 'jwt',
    },
    validate: {
      params: Joi.object({
        projectId: Joi.string().required(),
      }),
      payload: Joi.object({
        project_name: Joi.string().required(),
        url: Joi.string().uri().required(),
      }),
    },
    handler: async (request, h) => {
      const { Scratch } = request.server.models();
      const { projectId } = request.params;
      const { project_name, url } = request.payload;
      try {
        const project = await Scratch.query().findOne({ project_id: projectId });
        if (!project) {
          return h.response({ error: true, message: 'Project not found' }).code(404);
        }
        project.project_name = project_name;
        project.url = url;
        project.userId_scratch = request.auth.credentials.id
        await project.$query().patch();
        return { message: 'Project updated successfully' };
      } catch (error) {
        return h.response({ error: true, message: error.message }).code(500);
      }
    },
  },
},
  {
    method: 'POST',
    path: '/scratch/FileUploadS3',
    options: {
      payload: {
        maxBytes: 104857600,
        parse: true,
        output: 'stream',
        allow: ['multipart/form-data'],
        multipart: true,
      },
      description: 'scratch file upload to S3',
      notes: 'File-upload',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      plugins: {
        'hapi-swagger': {
          payloadType: 'form',
        },
      },
      validate: {
        payload: Joi.object({
          file: Joi.any().meta({ swaggerType: 'file' }).description('file').required(),
          project_name: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { scratchService } = request.services();
        let id;
        let team_id;
        if (request.auth.credentials.team_id) {
          team_id = request.auth.credentials.team_id
        } else {
          id = request.auth.credentials.id;
        }
        const [err, data] = await scratchService.uploadFile(
          request.payload.file,
          id,
          request.payload.project_name,
          team_id
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },

  {
    method: 'PUT',
    path: '/scratch/{project_id}',
    options: {
      payload: {
        maxBytes: 104857600,
        parse: true,
        output: 'stream',
        allow: ['multipart/form-data'],
        multipart: true,
      },
      description: 'scratch file upload to S3',
      notes: 'File-upload',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      plugins: {
        'hapi-swagger': {
          payloadType: 'form',
        },
      },
      validate: {
        params: Joi.object({
          project_id: Joi.string(),
        }),
        payload: Joi.object({
          image: Joi.any().meta({ swaggerType: 'file' }).description('file').required(),
          project_name: Joi.string().optional(),
        }),
      },
      handler: async (request, h) => {
        const { scratchService } = request.services();
        const { project_id } = request.params;
        const [err, data] = await scratchService.updateFile(
          project_id,
          request.payload.image,
          request.auth.credentials.id,
          request.payload.project_name
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },

  {
    method: 'GET',
    path: '/scratch/getAllUserProject',
    options: {
      description: 'Get chat user details by userId_scratch or team_id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        query: Joi.object({
          userId_scratch: Joi.number().integer().optional(),
          team_id: Joi.number().integer().optional(),
        }),
      },
      handler: async (request, h) => {
                const { scratchService } = request.services();
        const { userId_scratch, team_id } = request.query;
        // logger.info('Get chat user details');
        const [err, data] = await scratchService.getScratchFile(userId_scratch,team_id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (data.length === 0) {
          return { error: true, message: `this userId_scratch or team_id dosen't exit` };
        }
        return data;
      },
    },
  },
  {
    method: 'GET',
    path: '/scratch/projects/{userId}',
    options: {
      description: 'Get all scratch projects of a user by user id',
      tags: ['api'],
      validate: {
        params: Joi.object({
          userId: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { scratchService } = request.services();
        const [err, data] = await scratchService.getScratchProjectsByUserId(request.params.userId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },
  
  {
    method: 'DELETE',
    path: '/scratch/{project_id}',
    options: {
      description: 'DELETE chat user details',
      tags: ['api'],
      validate: {
        params: Joi.object({
          project_id: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { scratchService } = request.services();
        // logger.info('Get chat user details');
        const [err, data] = await scratchService.DeleteFile(request.params.project_id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (data.length === 0) {
          return { error: true, message: "project_id dosen't exit" };
        }
        return data;
      },
    },
  },

  {
    method: 'GET',
    path: '/scratch/{project_id}',
    options: {
      description: 'GET chat user details BY project_id',
      tags: ['api'],
      validate: {
        params: Joi.object({
          project_id: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { scratchService } = request.services();
        // logger.info('Get chat user details');
        const { project_id } = request.params;
        const [err, project_dertais] = await scratchService.Get_ScratchFile_by_project_id(
          project_id
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return project_dertais;
      },
    },
  },

  {
    method: 'DELETE',
    path: '/scratch/deleteAllProject/',
    options: {
      description: 'DELETE chat user details BY userId_scratch',
      tags: ['api'],
      validate: {
        query: Joi.object({
          userId_scratch: Joi.number().integer().optional(),
          team_id: Joi.number().integer().optional(),
        }),
      },
      handler: async (request, h) => {
        const { scratchService } = request.services();
        const { userId_scratch, team_id } = request.query;
        const [err, deleteProject] = await scratchService.DeleteProject_By_userId_scratch(
          userId_scratch,team_id
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return deleteProject;
      },
    },
  },


  {
    method: 'POST',
    path: '/scratch/sample',
    options: {
      payload: {
        maxBytes: 104857600,
        parse: true,
        output: 'stream',
        allow: ['multipart/form-data'],
        multipart: true,
      },
      description: 'scratch file upload to S3',
      notes: 'File-upload',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      plugins: {
        'hapi-swagger': {
          payloadType: 'form',
        },
      },
      validate: {
        payload: Joi.object({
          file: Joi.any().meta({ swaggerType: 'file' }).description('file').required(),
          project_name: Joi.string(),
        }),
      },
    },
    handler: async (request, h) => {
      const { scratchService } = request.services();
      const [err, data] = await scratchService.uploadSampleFile(
        request.payload.file,
        request.payload.project_name,
      );
      if (err) {
        logger.error(JSON.stringify(err));
        return h.response(err).code(err.code);
      }
      return data;
    },
  },


  {
    method: 'GET',
    path: '/scratch/sample',
    options: {
      description: 'Get chat user details by userId_scratch or team_id',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      // },
      handler: async (request, h) => {
        const { scratchService } = request.services();

        // logger.info('Get chat user details');
        const [err, data] = await scratchService.getScratchSampleFile();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },
];
