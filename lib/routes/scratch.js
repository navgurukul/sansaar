/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
const Joi = require('@hapi/joi');
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
      description: 'coursesFileUploadS3',
      notes: 'File-upload',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          payloadType: 'form',
        },
      },
      validate: {
        payload: Joi.object({
          image: Joi.any().meta({ swaggerType: 'file' }).description('file').required(),
        }),
      },
      handler: async (request) => {
        const { scratchService } = request.services();
        const data = await scratchService.uploadFile(request.payload.image);
        return data;
      },
    },
  },

  {
    method: 'GET',
    path: '/scratch/FileUploadS3{projectId}',
    options: {
      description: 'Get chat user details',
      tags: ['api'],
      validate: {
        params: Joi.object({
          projectId: Joi.number().integer().required(),
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
        return { url: data[0].url };
      },
    },
  },
];
