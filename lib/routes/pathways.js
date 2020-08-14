const Joi = require('@hapi/joi');
const Pathway = require('../models/pathway');
const PathwayMilestone = require('../models/pathwayMilestone');
const { getRouteScope } = require('./helpers');

module.exports = [
  {
    method: 'GET',
    path: '/pathways',
    options: {
      description: 'List of all pathways',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      handler: async (request) => {
        const { pathwayService, displayService } = request.services();
        const pathways = await pathwayService.find();

        return { pathways: await displayService.pathway(pathways) };
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/checkIfCodeExists',
    options: {
      description: 'Check if a pathway with the given code exists.',
      tags: ['api'],
      validate: {
        query: Joi.object({
          code: Pathway.field('code'),
        }),
      },
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      handler: async (request) => {
        const { pathwayService, displayService } = request.services();
        const pathway = await pathwayService.findByCode(request.query.code);

        const resp = { exists: false };
        if (pathway) {
          resp.exists = true;
          resp.pathway = await displayService.pathway(pathway)
        }
        return resp;
      },
    },
  },
  {
    method: 'POST',
    path: '/pathways',
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
          description: Pathway.field('description'),
        }),
      },
      handler: async (request) => {
        const { pathwayService, displayService } = request.services();
        const pathway = await pathwayService.create(request.payload);

        return { pathway: await displayService.pathway(pathway) };
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/{pathwayId}',
    options: {
      description: 'Get a single pathway.',
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
      handler: async (request) => {
        const { pathwayService, displayService } = request.services();
        const pathway = await pathwayService.findById(request.params.pathwayId);

        return { pathway: await displayService.pathway(pathway) };
      },
    },
  },
  {
    method: 'PUT',
    path: '/pathways/{pathwayId}',
    options: {
      description: 'Update a pathway.',
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
          code: Pathway.field('code'),
          name: Pathway.field('name'),
          description: Pathway.field('description'),
        }),
      },
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId } = request.params;

        const updateAndFetch = async (txn) => {
          await pathwayService.update(pathwayId, request.payload, txn);
          return pathwayService.findById(pathwayId, txn);
        };
        const pathway = await h.context.transaction(updateAndFetch);

        return { pathway: await displayService.pathway(pathway) };
      },
    },
  },
  {
    method: 'POST',
    path: '/pathways/{pathwayId}/milestones',
    options: {
      description: 'Create a milestone inside a pathway.',
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
          name: PathwayMilestone.field('name'),
          description: PathwayMilestone.field('description'),
          position: PathwayMilestone.field('position'),
        }),
      },
      handler: async (request) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId } = request.params;

        await pathwayService.findById(pathwayId);
        const milestone = await pathwayService.upsertMilestone(pathwayId, request.payload);

        return { pathway: await displayService.pathwayMilestone(milestone) };
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/milestones',
    options: {
      description: 'List all milestones of a pathway.',
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
      handler: async (request) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId } = request.params;

        await pathwayService.findById(pathwayId);
        const milestones = await pathwayService.findMilestones(pathwayId);

        return { milestones: await displayService.pathwayMilestone(milestones) };
      },
    },
  },
  {
    method: 'PUT',
    path: '/pathways/{pathwayId}/milestones/{milestoneId}',
    options: {
      description: 'Edit a milestone.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          pathwayId: Pathway.field('id'),
          milestoneId: PathwayMilestone.field('id'),
        }),
        payload: Joi.object({
          name: PathwayMilestone.field('name'),
          description: PathwayMilestone.field('description'),
          position: PathwayMilestone.field('position'),
        }),
      },
      handler: async (request) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId, milestoneId } = request.params;

        const milestoneInfo = { ...request.payload, id: milestoneId };

        await pathwayService.findById(pathwayId);
        await pathwayService.findMilestoneById(milestoneId);
        const milestone = await pathwayService.upsertMilestone(pathwayId, milestoneInfo);

        return { milestone: await displayService.pathwayMilestone(milestone) };
      },
    },
  },
  // check if a pathway code is unique
];
