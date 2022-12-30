/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
const Joi = require('@hapi/joi');
const { ElasticInference } = require('aws-sdk');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/scratch/FileUploadS3',
    options: {
      payload: {
        maxBytes: 10485760,
        parse: true,
        output: 'stream',
        allow: ['multipart/form-data'],
        multipart: true,
      },
      description: 'scratch file upload to S3',
      notes: 'File-upload',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          payloadType: 'form',
        },
      },
      validate: {
        payload: Joi.object({
          file: Joi.any().meta({ swaggerType: 'file' }).description('file').required()
        }),
      },
      handler: async (request, h) => {
        const { scratchService } = request.services();
        const [err, data] = await scratchService.uploadFile(
          request.payload.file
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return { url: data.url, MerakiUrl: data.MerakiUrl };
      },
    },
  },

  {
    method: 'PUT',
    path: '/scratch/{project_id}',
    options: {
      payload: {
        maxBytes: 10485760,
        parse: true,
        output: 'stream',
        allow: ['multipart/form-data'],
        multipart: true,
      },
      description: 'scratch file upload to S3',
      notes: 'File-upload',
      tags: ['api'],
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
        }),
      },
      handler: async (request, h) => {
        const { scratchService } = request.services();
        const { project_id } = request.params;
        const [err, data] = await scratchService.updateFile(project_id, request.payload.image);
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
    path: '/scratch/FileUploadS3/{projectId}',
    options: {
      description: 'Get chat user details',
      tags: ['api'],
      validate: {
        params: Joi.object({
          projectId: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { scratchService } = request.services();
        // logger.info('Get chat user details');
        const [err, data] = await scratchService.getScratchFile(request.params.projectId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (data.length === 0) {
          return { error: true, message: "project_id dosen't exit" };
        }
        return { error: false, url: data[0].url };
      },
    },
  },
];
