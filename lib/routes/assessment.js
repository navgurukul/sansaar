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
        if(request.auth.credentials.id){
          details = { ...request.payload, user_id: request.auth.credentials.id };
        }else{
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
          exercise_id: Joi.number().integer().optional(),
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

  {
    method: 'GET',
    path: '/assessment/{assessmentId}',
    options: {
      description: 'Get a assessment result ⓜ',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      // },
      validate: {
        params: Joi.object({
          assessmentId: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { assessmentService } = request.services();
        const [err, assessment] = await assessmentService.getAssessmentById(
          request.params.assessmentId
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
    path: '/assessment/{assessmentId}',
    options: {
      description: 'delete single assessment ',
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
        const [err, assessment] = await assessmentService.deleteSingleAssessment(
          request.params.assessmentId
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
    method: 'GET',
    path: '/assessment/allAssessments',
    options: {
      description: 'Get all assessments with all exercises details.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const { assessmentService } = request.services();
        const [err, assessments] = await assessmentService.allAssessment();
        logger.info('Get all assessments with all exercises details.');
        return assessments;
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
          selected_option: Joi.number().integer(),
          selected_multiple_option: Joi.array().items(Joi.number().integer()),
        }),
      },
      handler: async (request, h) => {
        const { assessmentService } = request.services();
        let details = request.payload;
        if(request.auth.credentials.id){
          details.user_id = request.auth.credentials.id;
        }else{
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
];
