const Joi = require('@hapi/joi');
const _ = require('lodash');
const glob = require('glob');
const Pathways = require('../models/pathway');
const PathwayMilestones = require('../models/pathwayMilestone');
const PathwayCourses = require('../models/pathwayCourses');
const PathwayCompletion = require('../models/pathwayCompletion');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');

const androidVersions = {
  latest: 35,
};

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
  tracking_enabled: Pathways.field('tracking_enabled').optional(),
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
        const { pathwayService, pathwayServiceV2, displayService } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;

        // pathways order
        const pathways_order = ['PRGPYT', 'SPKENG', 'TYPGRU', 'JSRPIT', 'PRCRSE'];

        if (appVersion >= androidVersions.latest) {
          const [err, data] = await pathwayServiceV2.find();
          // eslint-disable-next-line
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          let pathways = [];
          pathways_order.forEach((pathway_code, i) => {
            pathways[i] = _.find(data, { code: pathway_code });
          });
          pathways = _.compact(pathways);

          const pathway = await displayService.pathwayV2(pathways);

          _.map(pathway, (p) => {
            // add cta to the pathways
            if (p.name === 'Residential Programmes Info-Track') {
              p.cta = {
                value: 'Yes, let’s take the test',
                url: 'https://www.merakilearn.org/admission?redirect',
              };
            } else {
              p.cta = null;
            }
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
        }
        const [err, data] = await pathwayService.find();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }

        let pathways = [];
        pathways_order.forEach((pathway_code, i) => {
          pathways[i] = _.find(data, { code: pathway_code });
        });
        pathways = _.compact(pathways);

        const pathway = await displayService.pathway(pathways, request.query.courseType);

        _.map(pathway, (p) => {
          // add cta to the pathways
          if (p.name === 'Residential Programmes Info-Track') {
            p.cta = {
              value: 'Yes, let’s take the test',
              url: 'https://www.merakilearn.org/admission?redirect',
            };
          } else {
            p.cta = null;
          }
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

        // if (request.headers.platform !== 'web') {
        //   logger.info('List of all Pathways');
        //   return { pathways: _.filter(pathway, (e) => e.code !== 'JVSCPT') };
        // }

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
        headers: Joi.object({
          platform: Joi.string().valid('web', 'android').optional(),
          'version-code': Joi.number().integer().optional(),
        }),
        query: Joi.object({
          code: Joi.string().length(6).required(),
        }),
        options: { allowUnknown: true },
      },
      auth: {
        strategy: 'jwt',
      },
      handler: async (request) => {
        const { pathwayService, pathwayServiceV2, displayService } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        const resp = { exists: false };

        if (appVersion >= androidVersions.latest) {
          const pathway = await pathwayServiceV2.findByCode(request.query.code);
          // const resp = { exists: false };
          if (pathway) {
            resp.exists = true;
            resp.pathway = await displayService.pathwayV2(pathway);
          }
        } else {
          const pathway = await pathwayService.findByCode(request.query.code);
          // const resp = { exists: false };
          if (pathway) {
            resp.exists = true;
            resp.pathway = await displayService.pathway(pathway);
          }
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
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { pathwayService, pathwayServiceV2, displayService } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, pathway] = await pathwayServiceV2.create(request.payload);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info('Create a pathway');
          return { pathway: await displayService.pathwayV2(pathway) };
        }
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
          pathwayId: Joi.number().integer().required(),
        }),
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        query: Joi.object({
          courseType: Joi.string().valid('markdown', 'json').allow(null).optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { pathwayService, pathwayServiceV2, displayService } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        const courseType = request.query.courseType ? request.query.courseType : null;

        if (appVersion >= androidVersions.latest) {
          const [err, pathway] = await pathwayServiceV2.findById(request.params.pathwayId);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info('Get a single pathway');
          return { pathway: await displayService.pathwayV2(pathway) };
        }
        const [err, pathway] = await pathwayService.findById(request.params.pathwayId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get a single pathway');
        return { pathway: await displayService.pathway(pathway, courseType) };
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
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        payload: schemas.pathway,
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { pathwayService, pathwayServiceV2, displayService } = request.services();
        const { pathwayId } = request.params;

        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          // eslint-disable-next-line
          const [err, pathway] = await pathwayServiceV2.update(pathwayId, request.payload);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          const [errInFetch, updatedPathway] = await pathwayServiceV2.findById(pathwayId);
          if (errInFetch) {
            logger.error(JSON.stringify(errInFetch));
            return h.response(errInFetch).code(errInFetch.code);
          }
          logger.info(`Pathway id- ${pathwayId} updated`);
          return { pathway: await displayService.pathwayV2(updatedPathway) };
        }

        // eslint-disable-next-line
        const [err, pathway] = await pathwayService.update(pathwayId, request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const [errInFetch, updatedPathway] = await pathwayService.findById(pathwayId);
        if (errInFetch) {
          logger.error(JSON.stringify(errInFetch));
          return h.response(errInFetch).code(errInFetch.code);
        }
        logger.info(`Pathway id- ${pathwayId} updated`);
        return { pathway: await displayService.pathway(updatedPathway) };

        // const updateAndFetch = async (txn) => {
        //   // eslint-disable-next-line
        //   const [err, updatedPathway] = await pathwayService.update(
        //     pathwayId,
        //     request.payload,
        //     txn
        //   );
        //   if (err) {
        //     logger.error(JSON.stringify(err));
        //     return [err, null];
        //   }
        //   return [null, pathwayService.findById(pathwayId, txn)];
        // };
        // const [err, pathway] = await h.context.transaction(updateAndFetch);
        // if (err) {
        //   logger.error(JSON.stringify(err));
        //   return h.response(err).code(err.code);
        // }
        // logger.info(`Pathway id- ${pathwayId} updated`);
        // return { pathway: await displayService.pathway(pathway) };
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
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { pathwayService, pathwayServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, deleted] = await pathwayServiceV2.deleteById(request.params.pathwayId);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info(`Delete a pathway by pathway id- ${request.params.pathwayId}`);
          return deleted;
        }
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
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { pathwayService, pathwayServiceV2, displayService } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, pathway] = await pathwayServiceV2.getDefaultPathway();
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          const [errInPathway, pathwayCourses] = await displayService.getPathwayCoursesV2(
            pathway.id
          );
          if (errInPathway) return h.response(errInPathway).code(errInPathway.code);
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
        }
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
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { displayService } = request.services();
        const { pathwayId } = request.params;
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;

        if (appVersion >= androidVersions.latest) {
          const [errInPathway, pathwayCourses] = await displayService.getPathwayCoursesV2(
            pathwayId
          );
          if (errInPathway) return h.response(errInPathway).code(errInPathway.code);
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
        }

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
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { pathwayService, pathwayServiceV2, displayService } = request.services();
        const { pathwayId } = request.params;
        const { courseIds } = request.payload;

        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
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
          const [errInPathway, pathwayCourses] = await displayService.getPathwayCoursesV2(
            pathwayId
          );
          if (errInPathway) {
            return h.response(errInPathway).code(errInPathway.code);
          }
          logger.info(
            `id- ${request.auth.credentials.id} Add, update and delete courses in a pathway`
          );
          return pathwayCourses;
        }

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
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { pathwayService, pathwayServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;

        if (appVersion >= androidVersions.latest) {
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
        }
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
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { pathwayService, pathwayServiceV2 } = request.services();

        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
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
        }
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
      validate: {
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { pathwayService, pathwayServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, completed] = await pathwayServiceV2.getPathwayComplete(
            request.auth.credentials.id
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info(`id- ${request.auth.credentials.id} Get all completed pathways`);
          return completed;
        }
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
  {
    method: 'GET',
    path: '/pathways/ResidentialPathway',
    options: {
      description: 'Get the residential Pathway',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
    },
    handler: async (request, h) => {
      const { pathwayService } = request.services();
      const [err, pathway] = await pathwayService.getResidentialPathway();
      if (err) {
        logger.error(JSON.stringify(err));
        return h.response(err).code(err.code);
      }
      return pathway;
    },
  },
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/upcomingBatches',
    options: {
      description: 'Gets a list of all upcoming classes in a pathways',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      // },
      validate: {
        params: Joi.object({
          pathwayId: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { classesService, displayService } = request.services();
        const [err, classes] = await classesService.getClassesByPathwaysId(
          request.params.pathwayId
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return displayService.getUpcomingClassFacilitators(classes);
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/upcomingEnrolledRevisionClasses',
    options: {
      description: 'Gets a list of all upcoming enrolled revision classes in a pathways',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          pathwayId: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { classesService, displayService } = request.services();
        const data = await classesService.getIfStudentEnrolled(
          request.auth.credentials.id,
          request.params.pathwayId
        );
        if (data.message === 'enrolled' || data.message === 'enrolled_but_finished') {
          const [err, classes] = await classesService.getEnrolledRevisionClassesByPathwaysId(
            request.auth.credentials.id,
            data.recurring_id,
            request.params.pathwayId
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          const enrolledclasses = [];
          if (classes != null && classes.length > 0) {
            _.forEach(classes, (c) => {
              c.is_enrolled = true;
            });
            // eslint-disable-next-line
            for (let i in classes) {
              const [
                parenterr,
                parentClasses,
                // eslint-disable-next-line
              ] = await classesService.getEnrolledRevisionClassParentId(
                classes[i],
                data.recurring_id
              );
              if (parenterr) {
                logger.error(JSON.stringify(parenterr));
              }
              if (
                parentClasses !== undefined &&
                parentClasses !== null &&
                parentClasses.length > 0
              ) {
                classes[i].parent_id = parentClasses[0].id;
                enrolledclasses.push(classes[i]);
              }
            }
            if (enrolledclasses != null && enrolledclasses.length > 0) {
              return displayService.getUpcomingClassFacilitators(classes);
            }
            return {
              error: true,
              message: 'revision class not found in present batch',
              type: 'NotFound',
              data: {},
              code: 404,
            };
          }
          return {
            error: true,
            message: 'Not enrolled in any revision class',
            type: 'NotFound',
            data: {},
            code: 404,
          };
        }
        return {
          error: true,
          message: 'Not enrolled in any revision class',
          type: 'NotFound',
          data: {},
          code: 404,
        };
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/upcomingEnrolledClasses',
    options: {
      description: 'Gets a list of all upcoming enrolled classes in a pathways',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          pathwayId: Joi.number().integer().required(),
        }),
      },
      handler: async (request) => {
        const allClasses = [];
        const { classesService, displayService } = request.services();
        const data = await classesService.getIfStudentEnrolled(
          request.auth.credentials.id,
          request.params.pathwayId
        );
        if (data.message === 'enrolled') {
          const [
            errInFetchingRecurringClasses,
            upcomingRecurringClasses,
          ] = await classesService.getEnrolledClasseByRecurringId(data.recurring_id);
          if (errInFetchingRecurringClasses) {
            logger.error(JSON.stringify(errInFetchingRecurringClasses));
          }
          if (upcomingRecurringClasses !== null && upcomingRecurringClasses.length > 0) {
            allClasses.push(upcomingRecurringClasses[0]);
          }
        }
        const [errInDoubtClass, doubtClass] = await classesService.getDoubtClassByPathwayId(
          request.auth.credentials.id,
          request.params.pathwayId
        );
        if (errInDoubtClass) {
          logger.error(JSON.stringify(errInDoubtClass));
        }
        if (doubtClass !== undefined && doubtClass !== null && doubtClass.length > 0) {
          allClasses.push(doubtClass[0]);
        }
        if (data.message === 'enrolled' || data.message === 'enrolled_but_finished') {
          const [err, classes] = await classesService.getEnrolledRevisionClassesByPathwaysId(
            request.auth.credentials.id,
            data.recurring_id,
            request.params.pathwayId
          );
          if (err) {
            logger.error(JSON.stringify(err));
          }
          if (classes !== null && classes.length > 0) {
            const [
              parenterr,
              parentClasses,
            ] = await classesService.getEnrolledRevisionClassParentId(
              classes[0],
              data.recurring_id
            );
            if (parenterr) {
              logger.error(JSON.stringify(parenterr));
            }
            if (parentClasses !== undefined && parentClasses !== null && parentClasses.length > 0) {
              classes[0].parent_id = parentClasses[0].id;
              allClasses.push(classes[0]);
            }
          }
        }
        _.forEach(allClasses, (c) => {
          c.is_enrolled = true;
        });

        if (allClasses.length > 0) {
          return displayService.getUpcomingClassFacilitators(allClasses);
        }
        return allClasses;
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/userEnrolledClasses',
    options: {
      description: 'Gets a list of all upcoming enrolled classes in a pathways',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          pathwayId: Joi.number().integer().required(),
        }),
      },
      handler: async (request) => {
        const allClasses = [];
        const { classesService, displayService } = request.services();
        const data = await classesService.getIfStudentEnrolled(
          request.auth.credentials.id,
          request.params.pathwayId
        );
        if (data.message === 'enrolled') {
          const [
            errInFetchingRecurringClasses,
            upcomingRecurringClasses,
          ] = await classesService.getEnrolledClasseByRecurringId(data.recurring_id);
          if (errInFetchingRecurringClasses) {
            logger.error(JSON.stringify(errInFetchingRecurringClasses));
          }
          if (upcomingRecurringClasses !== null && upcomingRecurringClasses.length > 0) {
            allClasses.push(...upcomingRecurringClasses);
          }
        }
        const [errInDoubtClass, doubtClass] = await classesService.getDoubtClassByPathwayId(
          request.auth.credentials.id,
          request.params.pathwayId
        );
        if (errInDoubtClass) {
          logger.error(JSON.stringify(errInDoubtClass));
        }
        if (doubtClass !== undefined && doubtClass !== null && doubtClass.length > 0) {
          _.forEach(doubtClass, (c) => {
            c.type = 'doubt_class';
          });
          allClasses.push(...doubtClass);
        }
        if (data.message === 'enrolled' || data.message === 'enrolled_but_finished') {
          const [err, classes] = await classesService.getEnrolledRevisionClassesByPathwaysId(
            request.auth.credentials.id,
            data.recurring_id,
            request.params.pathwayId
          );
          if (err) {
            logger.error(JSON.stringify(err));
          }
          if (classes !== null && classes.length > 0) {
            // eslint-disable-next-line
            for (const i in classes) {
              const [
                parenterr,
                parentClasses,
                // eslint-disable-next-line
              ] = await classesService.getEnrolledRevisionClassParentId(
                classes[i],
                data.recurring_id
              );
              if (parenterr) {
                logger.error(JSON.stringify(parenterr));
              }
              if (
                parentClasses !== undefined &&
                parentClasses !== null &&
                parentClasses.length > 0
              ) {
                classes[i].parent_id = parentClasses[0].id;
                allClasses.push(classes[i]);
              } else {
                classes[i].type = 'batch';
                allClasses.push(classes[i]);
              }
            }
          }
        }
        _.forEach(allClasses, (c) => {
          c.is_enrolled = true;
        });

        if (allClasses.length > 0) {
          return displayService.getUpcomingClassFacilitators(allClasses);
        }
        return allClasses;
      },
    },
  },
];
