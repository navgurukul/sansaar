const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const Pathways = require('../models/pathway');
const ProgressParameters = require('../models/progressParameter');
const ProgressQuestions = require('../models/progressParameter');
const { getRouteScope } = require('./helpers');

module.exports = [
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/trackingForm',
    options: {
      description: 'Tracking form associated with the pathway.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          pathwayId: Pathways.field('id'),
        }),
      },
      handler: async (request) => {
        const { progressTrackingService, pathwayService, displayService } = request.services();

        const { pathwayId } = request.params;
        const pathway = await pathwayService.findById(pathwayId);
        if (!pathway.tracking_enabled) {
          throw Boom.badRequest('Given pathway does not have tracking enabled.');
        }
        const form = await progressTrackingService.getTrackingForm(pathwayId);

        return { form: await displayService.pathwayTrackingForm(form) };
      },
    },
  },
  {
    method: 'PUT',
    path: '/pathways/{pathwayId}/trackingForm',
    options: {
      description:
        'Edit the parameters and questions in the tracking form associated with the pathway.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          pathwayId: Pathways.field('id'),
        }),
        payload: Joi.object({
          paramIds: Joi.array().items(ProgressParameters.field('id')),
          questionIds: Joi.array().items(ProgressQuestions.field('id')),
        }),
      },
      handler: async (request, h) => {
        const { progressTrackingService, pathwayService, displayService } = request.services();

        const { pathwayId } = request.params;
        const { paramIds, questionIds } = request.payload;

        const pathway = await pathwayService.findById(pathwayId);
        if (!pathway.tracking_enabled) {
          throw Boom.badRequest('Given pathway does not have tracking enabled.');
        }

        const updateAndFetch = async (txn) => {
          await progressTrackingService.updateTrackingForm(pathwayId, questionIds, paramIds, txn);
          return progressTrackingService.getTrackingForm(pathwayId, txn);
        };
        const form = await h.context.transaction(updateAndFetch);

        return { form: await displayService.pathwayTrackingForm(form) };
      },
    },
  },
];
