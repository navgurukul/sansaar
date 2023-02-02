const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
    {
    method: 'POST',
    path: '/progress',
    options: {
      description: 'pratice.',
      tags: ['api'],
    //   auth: { strategy: 'jwt' },
      validate: {
        payload: Joi.object({
          course_id: Joi.number().integer(),
          exercise_id: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { recordService } = request.services();
        const [err, record] = await recordService.postRecord(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return record;
      },
    },
  },
];
