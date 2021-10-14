const Joi = require('@hapi/joi');
const _ = require('lodash');
const glob = require('glob');
const Pathways = require('../models/pathway');
const PathwayMilestones = require('../models/pathwayMilestone');
const PathwayCourses = require('../models/pathwayCourses');
const PathwayCompletion = require('../models/pathwayCompletion');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');

const courseLangMap = {};
const lang_key = { en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu' };

// Reads all properties files and create an object mapping of course to langauges in which content is available
const propFiles = glob.sync('**/PROPERTIES_FILES/**/*.json');
if (propFiles.length > 0) {
  _.map(propFiles, (fileName) => {
    // Extract the name of the course
    const name = fileName.split('/').pop().split('_')[0];
    // Extract the language
    const lang = fileName.split('/').pop().split('_').pop().split('.')[0];
    // Create a key of course
    if (!courseLangMap[name]) {
      courseLangMap[name] = [];
      courseLangMap[name].push(lang);
    }
    // Push languages for each course
    if (courseLangMap[name].indexOf(lang) < 0) {
      courseLangMap[name].push(lang);
    }
  });
}
const schemas = {};
schemas.pathway = Joi.object({
  code: Pathways.field('code'),
  name: Pathways.field('name'),
  description: Pathways.field('description'),
  tracking_enabled: Pathways.field('tracking_enabled'),
  tracking_frequency: Pathways.field('tracking_frequency').optional(),
  tracking_day_of_week: Pathways.field('tracking_day_of_week').optional(),
  tracking_days_lock_before_cycle: Pathways.field('tracking_days_lock_before_cycle').optional(),
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
        mode: 'optional',
      },
      validate: {
        headers: Joi.object({
          platform: Joi.string().valid('web', 'android').optional(),
          'version-code': Joi.number().integer().optional(),
        }),
        query: Joi.object({
          courseType: Joi.string().valid('markdown', 'json').allow(null).optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const [err, pathways] = await pathwayService.find();

        // eslint-disable-next-line
        const appVersion = request.query.appVersion ? request.query.appVersion : null;
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const pathway = await displayService.pathway(pathways, request.query.courseType);

        _.map(pathway, (p) => {
          const pathway_lang = [];
          _.map(p.courses, (course) => {
            _.map(course.lang_available, (lang) => {
              if (!_.find(pathway_lang, { code: lang, label: lang_key[lang] })) {
                pathway_lang.push({ code: lang, label: lang_key[lang] });
              }
            });
          });
          p.lang_available = pathway_lang;
        });

        if (request.headers.platform !== 'web') {
          logger.info('List of all Pathways');
          return { pathways: _.filter(pathway, (e) => e.code !== 'JVSCPT') };
        }
        logger.info('List of all Pathways');
        return { pathways: pathway };
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
          code: Pathways.field('code'),
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
        logger.info('Check if a pathway with the given code exists');
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
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const [err, pathway] = await pathwayService.create(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Create a pathway');
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
          pathwayId: Pathways.field('id'),
        }),
        query: Joi.object({
          courseType: Joi.string().valid('markdown', 'json').allow(null).optional(),
        }),
      },
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const [err, pathway] = await pathwayService.findById(request.params.pathwayId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get a single pathway');
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
          pathwayId: Pathways.field('id'),
        }),
        payload: schemas.pathway,
      },
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId } = request.params;

        const updateAndFetch = async (txn) => {
          // eslint-disable-next-line
          const [err, updatedPathway] = await pathwayService.update(
            pathwayId,
            request.payload,
            txn
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return [err, null];
          }
          return [null, pathwayService.findById(pathwayId, txn)];
        };
        const [err, pathway] = await h.context.transaction(updateAndFetch);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`Pathway id- ${pathwayId} updated`);
        return { pathway: await displayService.pathway(pathway) };
      },
    },
  },
  {
    method: 'DELETE',
    path: '/pathways/{pathwayId}',
    options: {
      description: 'Delete a pathway by pathway id',
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
      handler: async (request, h) => {
        const { pathwayService } = request.services();
        const [err, deleted] = await pathwayService.deleteById(request.params.pathwayId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`Delete a pathway by pathway id- ${request.params.pathwayId}`);
        return deleted;
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
          pathwayId: Pathways.field('id'),
        }),
        payload: Joi.object({
          name: PathwayMilestones.field('name'),
          description: PathwayMilestones.field('description'),
          position: PathwayMilestones.field('position'),
        }),
      },
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId } = request.params;

        await pathwayService.findById(pathwayId);
        const [err, milestone] = await pathwayService.upsertMilestone(pathwayId, request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${request.params.pathwayId} Create a milestone inside a pathway`);
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
          pathwayId: Pathways.field('id'),
        }),
      },
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId } = request.params;

        // #REVIEW Why is this here?
        await pathwayService.findById(pathwayId);
        // #REVIEW

        const [err, milestones] = await pathwayService.findMilestones(pathwayId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${pathwayId} List all milestones of a pathway`);
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
          pathwayId: Pathways.field('id'),
          milestoneId: PathwayMilestones.field('id'),
        }),
        payload: Joi.object({
          name: PathwayMilestones.field('name'),
          description: PathwayMilestones.field('description'),
          position: PathwayMilestones.field('position'),
        }),
      },
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId, milestoneId } = request.params;

        const milestoneInfo = { ...request.payload, id: milestoneId };

        // #REVIEW Why is this here?
        await pathwayService.findById(pathwayId);
        // #REVIEW

        await pathwayService.findMilestoneById(milestoneId);
        const [err, milestone] = await pathwayService.upsertMilestone(pathwayId, milestoneInfo);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${pathwayId} Edit a milestone`);
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
          pathwayId: Pathways.field('id'),
          milestoneId: PathwayMilestones.field('id'),
        }),
      },
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId, milestoneId } = request.params;

        // #REVIEW Why is this here?
        await pathwayService.findById(pathwayId);
        await pathwayService.findMilestoneById(milestoneId);
        // #REVIEW

        const [err, milestone] = await pathwayService.findMilestoneById(milestoneId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${pathwayId} Edit a milestone`);
        return { milestone: await displayService.pathwayMilestone(milestone) };
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/courses',
    options: {
      description: 'Get all courses of default pathway',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        query: Joi.object({
          courseType: Joi.string().valid('markdown', 'json').allow(null).optional(),
        }),
      },
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const [err, pathway] = await pathwayService.getDefaultPathway();

        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const [errInPathway, pathwayCourses] = await displayService.getPathwayCourses(
          pathway.id,
          request.query.courseType
        );
        if (errInPathway) return h.response(errInPathway).code(errInPathway.code);
        _.map(pathwayCourses.courses, (c) => {
          if (Object.keys(courseLangMap).indexOf(c.name) >= 0) {
            c.lang_available = courseLangMap[c.name];
          } else {
            c.lang_available = ['en'];
          }
        });
        const pathway_lang = [];
        _.map(pathwayCourses.courses, (p) => {
          _.map(p.lang_available, (lang) => {
            if (!_.find(pathway_lang, { code: lang, label: lang_key[lang] })) {
              pathway_lang.push({ code: lang, label: lang_key[lang] });
            }
          });
        });
        pathwayCourses.lang_available = pathway_lang;
        logger.info('Get all courses of default pathway');
        return pathwayCourses;
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
        mode: 'optional',
      },
      validate: {
        params: Joi.object({
          pathwayId: PathwayCourses.field('pathway_id'),
        }),
        query: Joi.object({
          courseType: Joi.string().valid('markdown', 'json').allow(null).optional(),
        }),
      },
      handler: async (request, h) => {
        const { displayService } = request.services();
        const { pathwayId } = request.params;
        const [errInPathway, pathwayCourses] = await displayService.getPathwayCourses(
          pathwayId,
          request.query.courseType
        );
        if (errInPathway) return h.response(errInPathway).code(errInPathway.code);
        _.map(pathwayCourses.courses, (c) => {
          if (Object.keys(courseLangMap).indexOf(c.name) >= 0) {
            c.lang_available = courseLangMap[c.name];
          } else {
            c.lang_available = ['en'];
          }
        });
        const pathway_lang = [];
        _.map(pathwayCourses.courses, (p) => {
          _.map(p.lang_available, (lang) => {
            if (!_.find(pathway_lang, { code: lang, label: lang_key[lang] })) {
              pathway_lang.push({ code: lang, label: lang_key[lang] });
            }
          });
        });
        pathwayCourses.lang_available = pathway_lang;
        logger.info('Get all courses of a particular pathway id');
        return pathwayCourses;
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
      handler: async (request, h) => {
        const { pathwayService, displayService } = request.services();
        const { pathwayId } = request.params;
        const { courseIds } = request.payload;

        const updateAndFetch = async () => {
          const [err, updatedPathway] = await pathwayService.upsertPathwayCourses(
            pathwayId,
            courseIds
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return updatedPathway;
        };

        const checkIfUpdated = await h.context.transaction(updateAndFetch);

        if ('error' in checkIfUpdated) {
          logger.error(JSON.stringify(checkIfUpdated));
          return checkIfUpdated;
        }
        const [errInPathway, pathwayCourses] = await displayService.getPathwayCourses(pathwayId);
        if (errInPathway) {
          return h.response(errInPathway).code(errInPathway.code);
        }
        logger.info(
          `id- ${request.auth.credentials.id} Add, update and delete courses in a pathway`
        );
        return pathwayCourses;
      },
    },
  },
  {
    method: 'POST',
    path: '/pathways/{pathwayId}/complete',
    options: {
      description: 'Mark pathway completion',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        params: Joi.object({
          pathwayId: PathwayCompletion.field('pathway_id'),
        }),
      },
      handler: async (request, h) => {
        const { pathwayService } = request.services();
        const [err, marked] = await pathwayService.markPathwayComplete(
          request.auth.credentials.id,
          request.params.pathwayId
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${request.auth.credentials.id} Mark pathway completion`);
        return marked;
      },
    },
  },
  {
    method: 'DELETE',
    path: '/pathways/{pathwayId}/complete',
    options: {
      description: 'Unmark pathway completion',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        params: Joi.object({
          pathwayId: PathwayCompletion.field('pathway_id'),
        }),
      },
      handler: async (request, h) => {
        const { pathwayService } = request.services();
        const [err, unmarked] = await pathwayService.removePathwayComplete(
          request.auth.credentials.id,
          request.params.pathwayId
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${request.auth.credentials.id} Unmark pathway completion`);
        return unmarked;
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/complete',
    options: {
      description: 'Get all completed pathways',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      handler: async (request, h) => {
        const { pathwayService } = request.services();
        const [err, completed] = await pathwayService.getPathwayComplete(
          request.auth.credentials.id
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${request.auth.credentials.id} Get all completed pathways`);
        return completed;
      },
    },
  },
];
