const Joi = require('@hapi/joi');
const Pathway = require('../models/pathway');
const PathwayMilestone = require('../models/pathwayMilestone');
const PathwayCourses = require('../models/pathwayCourses');
const { getRouteScope } = require('./helpers');

const schemas = {};
schemas.pathway = Joi.object({
  code: Pathway.field('code'),
  name: Pathway.field('name'),
  description: Pathway.field('description'),
  tracking_enabled: Pathway.field('tracking_enabled'),
  tracking_frequency: Pathway.field('tracking_frequency'),
  tracking_day_of_week: Pathway.field('tracking_day_of_week'),
  tracking_days_lock_before_cycle: Pathway.field('tracking_days_lock_before_cycle'),
});

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
          resp.pathway = await displayService.pathway(pathway);
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
        payload: schemas.pathway,
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
        payload: schemas.pathway,
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
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/milestones/{milestoneId}',
    options: {
      description: 'Get a single milestone.',
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
      },
      handler: async (request) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId, milestoneId } = request.params;

        await pathwayService.findById(pathwayId);
        await pathwayService.findMilestoneById(milestoneId);

        const milestone = await pathwayService.findMilestoneById(milestoneId);

        return { milestone: await displayService.pathwayMilestone(milestone) };
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/courses',
    options: {
      description: 'Get all courses of a particular pathway id.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      validate: {
        params: Joi.object({
          pathwayId: PathwayCourses.field('pathway_id'),
        }),
      },
      handler: async (request) => {
        const { displayService } = request.services();
        const { pathwayId } = request.params;
        return displayService.pathwayCourses(pathwayId);
      },
    },
  },
  {
    method: 'PUT',
    path: '/pathways/{pathwayId}/courses',
    options: {
      description: 'Add, update and delete courses in a pathway',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      validate: {
        params: Joi.object({
          pathwayId: PathwayCourses.field('pathway_id'),
        }),
        payload: Joi.object({
          courseIds: Joi.array().items(PathwayCourses.field('course_id')),
        }),
      },
      handler: async (request) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId } = request.params;
        const { courseIds } = request.payload;
        await pathwayService.upsertPathwayCourses(pathwayId, courseIds);
        return { courses: await displayService.pathwayCourses(pathwayId) };
      },
    },
  },
];
