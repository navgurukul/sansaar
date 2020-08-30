const Pathway = require('../models/pathway');
const ProgressParameter = require('../models/progressParameter');
const ProgressQuestion = require('../models/progressParameter');
const Boom = require('@hapi/boom');
const { getRouteScope } = require('./helpers');
const Joi = require('@hapi/joi');

const checkPathwayTracking = async (pathwayId, pathwayService) => {
  const pathway = await pathwayService.findById(pathwayId);
  if (!pathway.tracking_enabled) {
    throw Boom.badRequest('Given pathway does not have tracking enabled.');
  }
}

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
            pathwayId: Pathway.field('id'),
          }),
        },
      handler: async (request, h) => {
        const { progressTrackingService, pathwayService, displayService } = request.services();
        
        const { pathwayId } = request.params;
        const pathway = await pathwayService.findById(pathwayId);
        if (!pathway.tracking_enabled) {
          throw Boom.badRequest('Given pathway does not have tracking enabled.');
        }
        const form = await progressTrackingService.getTrackingForm(pathwayId);

        return { form: await displayService.pathwayTrackingForm(form) }
      },
    },
  },
  {
    method: 'PUT',
    path: '/pathways/{pathwayId}/trackingForm',
    options: {
      description: 'Edit the parameters and questions in the tracking form associated with the pathway.',
      tags: ['api'],
      auth: {
          strategy: 'jwt',
          scope: getRouteScope('team'),
        },
        validate: {
          params: Joi.object({
            pathwayId: Pathway.field('id'),
          }),
          payload: Joi.object({
            paramIds: Joi.array().items(ProgressParameter.field('id')),
            questionIds: Joi.array().items(ProgressQuestion.field('id')),
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
          await progressTrackingService.updateTrackingForm(pathwayId, questionIds, paramIds, txn)
          return await progressTrackingService.getTrackingForm(pathwayId, txn);
        }
        const form = await h.context.transaction(updateAndFetch);

        return { form: await displayService.pathwayTrackingForm(form) }
      },
    },
  },
];
