const Joi = require('@hapi/joi');
const logger = require('../../server/logger');
const Exercises = require('../models/exercise');

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
  {
    method: 'POST',
    path: '/assessment/slug/complete',
    options: {
      description: 'Record assessment progress by slug',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        payload: Joi.array().items(Joi.object({
          slug_id: Joi.number().integer().required(),
          course_id: Joi.number().integer().required(),
          status: Joi.string().valid('Pass', 'Fail', 'Partially_Correct', 'Partially_Incorrect'),
          selected_option: Joi.array().items(Joi.number().integer()).required(),
          lang: Joi.string().required(),
        }))
      },
      handler: async (request, h) => {
        const { assessmentService } = request.services();
        const detailsArray = request.payload;
        detailsArray.forEach(details => {
          if (request.auth.credentials.id) {
            details.user_id = request.auth.credentials.id;
          } else {
            details.team_id = request.auth.credentials.team_id;
          }
        });
        const [err, assessments] = await assessmentService.PostAssessmentsCompleteBySlug(detailsArray);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return assessments;
      },
    },
  },
  {
    method: 'GET',
    path: '/assessment/{slugId}/complete',
    options: {
      description: 'Get assessment result by slug ⓜ',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          slugId: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { assessmentService } = request.services();
        const [err, assessment] = await assessmentService.getAssessmentCompleteBySlugId(
          request.params.slugId,
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
    method: 'DELETE',
    path: '/assessment/{userId}/deleteAssessmentResult',
    options: {
      description: 'Delete assessment result by user_id and team_id ⓜ',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const { assessmentService } = request.services();
        const user_team = {}
        if (request.auth.credentials.id) {
          user_team.user_id = request.auth.credentials.id;
        } else {
          user_team.team_id = request.auth.credentials.team_id;
        }
        const [err, assessment] = await assessmentService.DeleteAssessmentResultByUserOrTeam(user_team);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return assessment;
      },
    },
  },
  
];
