/* eslint-disable no-unused-vars */
const Joi = require('@hapi/joi');

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
];
