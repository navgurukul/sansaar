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
          status: Joi.string().valid('Pass', 'Fail'),
          selected_option: Joi.number().integer(),
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

  {
    method: 'GET',
    path: '/assessment/{assessmentId}/student/result',
    options: {
      description: 'Get a assessment result.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          assessmentId: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { assessmentService } = request.services();
        const [err, assessment] = await assessmentService.findResultById(
          request.params.assessmentId,
          request.auth.credentials.id
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return assessment;
      },
    },
  },
  {
    method: 'PUT',
    path: '/assessment/{assessmentId}',
    options: {
      description: 'Update assessment of the course',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          assessmentId: Joi.number().integer(),
        }),
        payload: Joi.object({
          name: Joi.string().max(100).optional(),
          content: Joi.string(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { assessmentService } = request.services();
        const [err, assessment] = await assessmentService.updateSingleAssessment(
          request.params.assessmentId,
          request.payload
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return assessment;
      },
    },
  },
];
