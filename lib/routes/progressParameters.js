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
      handler: async (request) => {
        const { progressTrackingService, displayService } = request.services();

        const { type } = request.payload;
        if (type === CONFIG.progressTracking.parameters.type.boolean.key) {
          delete request.payload.min_range;
          delete request.payload.max_range;
        }

        const parameter = await progressTrackingService.createParameter(request.payload);
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
      handler: async (request) => {
        const { progressTrackingService, displayService } = request.services();

        const parameters = await progressTrackingService.findParameters();
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
      handler: async (request) => {
        const { progressTrackingService, displayService } = request.services();

        const { parameterId } = request.params;
        const parameter = await progressTrackingService.findParameterById(parameterId);
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

        const updateAndFetch = async (txn) => {
          await progressTrackingService.updateParameter(parameterId, request.payload, txn);
          return progressTrackingService.findParameterById(parameterId, txn);
        };

        const parameter = await h.context.transaction(updateAndFetch);

        console.log('Done');

        return { parameter: await displayService.progressParameter(parameter) };
      },
    },
  },
];
