const Joi = require('@hapi/joi');
const _ = require('lodash');
const glob = require('glob');
const Pathways = require('../models/pathwaysV2');
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
    const courseType =
      _.intersectionWith(fileName.split('/').pop().split('_'), ['json'], _.isEqual).length > 0
        ? fileName.split('/').pop().split('_')[1]
        : null;
    // Extract the language
    const lang = fileName.split('/').pop().split('_').pop().split('.')[0];
    // Create a key of course
    if (!courseLangMap[`${name}_${courseType}`]) {
      courseLangMap[`${name}_${courseType}`] = [];
      courseLangMap[`${name}_${courseType}`].push(lang);
    }
    // Push languages for each course
    if (courseLangMap[`${name}_${courseType}`].indexOf(lang) < 0) {
      courseLangMap[`${name}_${courseType}`].push(lang);
    }
  });
}

const schemas = {};
schemas.pathway = Joi.object({
  code: Pathways.field('code'),
  name: Pathways.field('name'),
  description: Pathways.field('description'),
});

module.exports = [
  {
    method: 'GET',
    path: '/pathways/v2.0',
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
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { pathwayServiceV2, displayService } = request.services();
        const [err, pathways] = await pathwayServiceV2.find();

        // eslint-disable-next-line
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

        logger.info('List of all Pathways');
        return { pathways: pathway };
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/v2.0/checkIfCodeExists',
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
        const { pathwayServiceV2, displayService } = request.services();
        const pathway = await pathwayServiceV2.findByCode(request.query.code);

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
    path: '/pathways/v2.0',
    options: {
      description: 'Create a pathway.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        payload: schemas.pathway,
      },
      handler: async (request, h) => {
        const { pathwayServiceV2, displayService } = request.services();
        const [err, pathway] = await pathwayServiceV2.create(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Create a pathway');
        return { pathway: await displayService.pathwayV2(pathway) };
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/v2.0/{pathwayId}',
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
        const { pathwayServiceV2, displayService } = request.services();
        const [err, pathway] = await pathwayServiceV2.findById(request.params.pathwayId);
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
    path: '/pathways/v2.0/{pathwayId}',
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
        const { pathwayServiceV2, displayService } = request.services();
        const { pathwayId } = request.params;

        const updateAndFetch = async (txn) => {
          // eslint-disable-next-line
          const [err, updatedPathway] = await pathwayServiceV2.update(
            pathwayId,
            request.payload,
            txn
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return [err, null];
          }
          return [null, pathwayServiceV2.findById(pathwayId, txn)];
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
    path: '/pathways/v2.0/{pathwayId}',
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
        const { pathwayServiceV2 } = request.services();
        const [err, deleted] = await pathwayServiceV2.deleteById(request.params.pathwayId);
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
    method: 'GET',
    path: '/pathways/v2.0/courses',
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
        const { pathwayServiceV2, displayService } = request.services();
        const [err, pathway] = await pathwayServiceV2.getDefaultPathway();

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
          _.map(Object.keys(courseLangMap), (courseLang) => {
            if (
              courseLang.split('_')[0] === c.name &&
              courseLang.split('_')[1] === String(c.course_type)
            ) {
              c.lang_available = courseLangMap[courseLang];
            }
          });
          if (!c.lang_available) {
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
    path: '/pathways/v2.0/{pathwayId}/courses',
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
          _.map(Object.keys(courseLangMap), (courseLang) => {
            if (
              courseLang.split('_')[0] === c.name &&
              courseLang.split('_')[1] === String(c.course_type)
            ) {
              c.lang_available = courseLangMap[courseLang];
            }
          });
          if (!c.lang_available) {
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
    path: '/pathways/v2.0/{pathwayId}/courses',
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
        const { pathwayServiceV2, displayService } = request.services();
        const { pathwayId } = request.params;
        const { courseIds } = request.payload;

        const updateAndFetch = async () => {
          const [err, updatedPathway] = await pathwayServiceV2.upsertPathwayCourses(
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
    path: '/pathways/v2.0/{pathwayId}/complete',
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
        const { pathwayServiceV2 } = request.services();
        const [err, marked] = await pathwayServiceV2.markPathwayComplete(
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
    path: '/pathways/v2.0/{pathwayId}/complete',
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
        const { pathwayServiceV2 } = request.services();
        const [err, unmarked] = await pathwayServiceV2.removePathwayComplete(
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
    path: '/pathways/v2.0/complete',
    options: {
      description: 'Get all completed pathways',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      handler: async (request, h) => {
        const { pathwayServiceV2 } = request.services();
        const [err, completed] = await pathwayServiceV2.getPathwayComplete(
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
