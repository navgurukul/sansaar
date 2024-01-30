/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const { getRouteScope } = require('./helpers');
const ProgressParameters = require('../models/progressParameter');
const CONFIG = require('../config');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/progressTracking/parameters',
    options: {
      description: 'Create a parameter which can be used for progress tracking.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        payload: Joi.object({
          type: ProgressParameters.field('type'),
          name: ProgressParameters.field('name'),
          description: ProgressParameters.field('description'),
          min_range: ProgressParameters.field('min_range'),
          max_range: ProgressParameters.field('max_range'),
        }),
      },
      handler: async (request, h) => {
        const { progressTrackingService, displayService } = request.services();
        const { type } = request.payload;
        if (type === CONFIG.progressTracking.parameters.type.boolean.key) {
          delete request.payload.min_range;
          delete request.payload.max_range;
        }
        const [err, parameter] = await progressTrackingService.createParameter(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(
          `id- ${request.auth.credentials.id} Create a parameter which can be used for progress tracking`
        );
        return { parameter: await displayService.progressParameter(parameter) };
      },
    },
  },
  {
    method: 'GET',
    path: '/progressTracking/parameters',
    options: {
      description: 'List of all progress parameters.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      handler: async (request, h) => {
        const { progressTrackingService, displayService } = request.services();

        const [err, parameters] = await progressTrackingService.findParameters();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${request.auth.credentials.id} List of all progress parameters`);
        return { parameters: await displayService.progressParameter(parameters) };
      },
    },
  },
  {
    method: 'GET',
    path: '/progressTracking/parameters/{parameterId}',
    options: {
      description: 'List of all progress parameters.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          parameterId: ProgressParameters.field('id'),
        }),
      },
      handler: async (request, h) => {
        const { progressTrackingService, displayService } = request.services();

        const { parameterId } = request.params;
        const [err, parameter] = await progressTrackingService.findParameterById(parameterId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${request.auth.credentials.id} List of all progress parameters`);
        return { parameter: await displayService.progressParameter(parameter) };
      },
    },
  },
  {
    method: 'PUT',
    path: '/progressTracking/parameters/{parameterId}',
    options: {
      description: 'Update a parameter.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          parameterId: ProgressParameters.field('id'),
        }),
        payload: Joi.object({
          type: ProgressParameters.field('type'),
          name: ProgressParameters.field('name'),
          description: ProgressParameters.field('description'),
          min_range: ProgressParameters.field('min_range'),
          max_range: ProgressParameters.field('max_range'),
        }),
      },
      handler: async (request, h) => {
        const { progressTrackingService, displayService } = request.services();

        const { parameterId } = request.params;

        const { type } = request.payload;
        if (type === CONFIG.progressTracking.parameters.type.boolean.key) {
          delete request.payload.min_range;
          delete request.payload.max_range;
        }

        const [err, parameter] = await progressTrackingService.updateParameterAndFetch(
          parameterId,
          request.payload
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${request.auth.credentials.id} Update a parameter`);
        return { parameter: await displayService.progressParameter(parameter) };
      },
    },
  },
  {
    method: 'POST',
    path: '/progressTracking/learningTrackStatus',
    options: {
      description: 'Keep updated learning track status.',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        payload: Joi.object({
          pathway_id: Joi.number().integer(),
          course_id: Joi.number().integer(),
          exercise_id: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { progressTrackingService } = request.services();
        const { payload } = request;
        /* eslint-disable */
        if (request.auth.credentials.id) {
          payload.user_id = request.auth.credentials.id;
        } else {
          payload.team_id = request.auth.credentials.team_id;
        }
        const [err, learningTrackStatus] = await progressTrackingService.createLearningTrackStatus(
          payload
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        request.auth.credentials.team_id?
        logger.info(`team- ${request.auth.credentials.team_id} Updated Learning track status successfully!`):
        logger.info(`id- ${request.auth.credentials.id} Updated Learning track status successfully!`);
      return { error: false, message: 'Updated Learning track status successfully!' };
      },
    },
  },

  // 
  {
    method: 'POST',
    path: '/progressTracking/add/learningTrackStatus',
    options: {
      description: 'Keep updated learning track status.',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        payload: Joi.object({
          pathway_id: Joi.number().integer(),
          course_id: Joi.number().integer(),
          slug_id: Joi.number().integer(),
          type: Joi.string().valid('exercise', 'assessment'),
          lang: Joi.string().optional(),

        }),
      },
      handler: async (request, h) => {
        const { progressTrackingService } = request.services();
        const { payload } = request;
        /* eslint-disable */
        if (request.auth.credentials.id) {
          payload.user_id = parseInt(request.auth.credentials.id);
        } else {
          payload.team_id = parseInt(request.auth.credentials.team_id);
        }
        const [err, learningTrackStatus] = await progressTrackingService.addLearningTrack(
          payload,
          payload.lang
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        request.auth.credentials.team_id?
        logger.info(`team- ${request.auth.credentials.team_id} Updated Learning track status successfully!`):
        logger.info(`id- ${request.auth.credentials.id} Updated Learning track status successfully!`);
      return { error: false, message: 'Updated Learning track status successfully!' };
      },
    },
  },


  {
    method: 'GET',
    path: '/progressTracking/{courseId}/completedCourseContentIds',
    options: {
      description: 'get the completed course content Ids ⓜ',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        params: Joi.object({
          courseId: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { progressTrackingService } = request.services();
        const { courseId } = request.params;
        const userId = request.auth.credentials.id;
        const team_id = request.auth.credentials.team_id;
        const [err, data] = await progressTrackingService.getLearningTrackStatus(userId, courseId, team_id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Status of all learning track');
        return data;
      },
    },
  },

  //
  {
    method: 'GET',
    path: '/progressTracking/{courseId}/completedContent',
    options: {
      description: 'get the completed course content Ids ⓜ',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        params: Joi.object({
          courseId: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { progressTrackingService } = request.services();
        const { courseId } = request.params;
        const userId = request.auth.credentials.id;
        const team_id = request.auth.credentials.team_id;
        const [err, data] = await progressTrackingService.getLearningTrack(userId, courseId, team_id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Status of all learning track');
        return data;
      },
    },
  },
];
