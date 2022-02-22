const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/assessment',
    options: {
      description: 'create assessment.',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        payload: Joi.object({
          name: Joi.string(),
          content: Joi.string(),
          course_id: Joi.number().integer(),
          exercise_id: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { assessmentService } = request.services();
        const [err, assessment] = await assessmentService.addAssessment(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return assessment;
      },
    },
  },

  {
    method: 'POST',
    path: '/assessment/student/result',
    options: {
      description: 'create assessment.',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        payload: Joi.object({
          assessment_id: Joi.number().integer(),
          status: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { assessmentService } = request.services();
        const details = { ...request.payload, user_id: request.auth.credentials.id };
        const [err, assessment] = await assessmentService.studentResult(details);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return assessment;
      },
    },
  },
];
