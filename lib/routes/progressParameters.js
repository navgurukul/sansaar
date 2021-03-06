const Joi = require('@hapi/joi');
const { getRouteScope } = require('./helpers');
const ProgressParameters = require('../models/progressParameter');
const CONFIG = require('../config');

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
          return h.response(err).code(err.code);
        }
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
          return h.response(err).code(err.code);
        }
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
          return h.response(err).code(err.code);
        }
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
          return h.response(err).code(err.code);
        }

        return { parameter: await displayService.progressParameter(parameter) };
      },
    },
  },
];
