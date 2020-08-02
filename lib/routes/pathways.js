const Joi = require('@hapi/joi');
const Pathway = require('../models/pathway');
const { getRouteScope } = require("./helpers");


module.exports = [
  {
    method: 'POST',
    path: '/pathway',
    options: {
      description: 'Create a pathway.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        payload: Joi.object({
          code: Pathway.field('code'),
          name: Pathway.field('name'),
          description: Pathway.field('description')
        }),
      },
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const pathway = await pathwayService.create(request.payload);

        return { pathway: await displayService.pathway(pathway) }
      },
    },
  },
  {
    method: 'GET',
    path: '/pathway',
    options: {
      description: 'List of all pathways',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['team', 'student']),
      },
      handler: async (request) => {
        const { pathwayService, displayService } = request.services();
        const pathways = await pathwayService.find();

        return { pathways: await displayService.pathway(pathways) }
      },
    },
  },
  {
    method: 'GET',
    path: '/pathway/{pathwayId}',
    options: {
      description: 'Get a single pathway.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['team', 'student']),
      },
      validate: {
        params: Joi.object({
          pathwayId: Pathway.field('id'),
        }),
      },
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const pathway = await pathwayService.findById(request.params.pathwayId);

        return { pathway: await displayService.pathway(pathway) }
      },
    },
  },
  {
    method: 'PUT',
    path: '/pathway/{pathwayId}',
    options: {
      description: 'Update a pathway.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['team', 'student']),
      },
      validate: {
        params: Joi.object({
          pathwayId: Pathway.field('id'),
        }),
        payload: Joi.object({
          code: Pathway.field('code'),
          name: Pathway.field('name'),
          description: Pathway.field('description')
        }),
      },
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId } = request.params;

        const updateAndFetch = async (txn) => {
          await pathwayService.update(pathwayId, request.payload, txn);
          return pathwayService.findById(pathwayId, txn);
        }
        const pathway = await h.context.transaction(updateAndFetch);

        return { pathway: await displayService.pathway(pathway) }
      },
    },
  },
];
