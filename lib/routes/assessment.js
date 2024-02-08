const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/assessment/student/result',
    options: {
      description: 'record assessment progress ⓜ',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        payload: Joi.object({
          assessment_id: Joi.number().integer(),
          status: Joi.string().valid('Pass', 'Fail', 'Partially_Correct', 'Partially_Incorrect'),
          selected_option: Joi.number().integer(),
          // selected_option: Joi.array().items(Joi.number().integer()),
        }),
      },
      handler: async (request, h) => {
        const { assessmentService } = request.services();
        let details;
        if (request.auth.credentials.id) {
          details = { ...request.payload, user_id: request.auth.credentials.id };
        } else {
          details = { ...request.payload, team_id: request.auth.credentials.team_id };
        }
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
      description: 'Get a assessment result ⓜ',
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
          request.auth.credentials.id,
          request.auth.credentials.team_id
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
    method: 'POST',
    path: '/assessment/student/result/v2',
    options: {
      description: 'record assessment progress ⓜ',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        payload: Joi.object({
          assessment_id: Joi.number().integer(),
          status: Joi.string().valid('Pass', 'Fail', 'Partially_Correct', 'Partially_Incorrect'),
          // selected_option: Joi.number().integer(),
          selected_multiple_option: Joi.array().items(Joi.number().integer()).required(),
        }),
      },
      handler: async (request, h) => {
        const { assessmentService } = request.services();
        let details = request.payload;
        if (request.auth.credentials.id) {
          details.user_id = request.auth.credentials.id;
        } else {
          details.team_id = request.auth.credentials.team_id;
        }
        const [err, assessment] = await assessmentService.studentMultipleResult(details);
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
    path: '/assessment/{assessmentId}/student/result/v2',
    options: {
      description: 'Get a assessment result ⓜ',
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
        const [err, assessment] = await assessmentService.findMultipleResultById(
          request.params.assessmentId,
          request.auth.credentials.id,
          request.auth.credentials.team_id
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
