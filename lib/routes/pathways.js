/* eslint-disable prettier/prettier */
/* eslint-disable no-else-return */
const Joi = require('@hapi/joi');
const _ = require('lodash');
const glob = require('glob');
const Pathways = require('../models/pathway');
const PathwayMilestones = require('../models/pathwayMilestone');
const PathwayCourses = require('../models/pathwayCourses');
const PathwayCompletion = require('../models/pathwayCompletion');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');
const { UTCToISTConverter } = require('../helpers/index');

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
  logo: Pathways.field('logo').optional(),
});

module.exports = [
  {
    method: 'GET',
    path: '/pathways',
    options: {
      description: 'List of all pathways ⓜ',
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
        const {
          pathwayService,
          pathwayServiceV2,
          displayService,
          progressTrackingService,
          partnerService,
        } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        // pathways order
        // const pathways_order = ['PRGPYT', 'SPKENG', 'TYPGRU', 'JSRPIT', 'PRCRSE', 'SHCEL'];

        const useV2 = appVersion >= androidVersions.latest;

        const [err, data] = await (useV2 ? pathwayServiceV2.find(true) : pathwayService.find()); // true = get pathways with their courses
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        let partner_id;
        if (request.auth.isAuthenticated) {
          partner_id = request.auth.credentials.partner_id;
        }
        let pData;
        let flag = true;
        if (partner_id) {
          const [errPartner, partner] = await partnerService.getPartnerThrowPartnerID(partner_id);
          if (errPartner) {
            logger.error(JSON.stringify(errPartner));
            return h.response(err).code(errPartner.code);
          }
          if (partner.name.toLowerCase() !== 'amazon coding bootcamp') {
            // return { pathways:pathways }
            // pathways_order.push('ACB');
            pData = data.filter((item) => item.code !== 'ACB');
            flag = false;
          }
        }
        let pathway;
        if (useV2 && flag) {
          pathway = data;
        } else if (useV2 && !flag) {
          pathway = pData;
        } else {
          pathway = await displayService.pathway(data, request.query.courseType);
        }
        // eslint-disable-next-line
        for (const p of pathway) {
          // add cta to the pathways
          if (p.name === 'Residential Programmes Info-Track') {
            p.cta = {
              value: 'Yes, let’s take the test',
              url: 'https://www.merakilearn.org/admission?redirect',
            };
          } else {
            p.cta = null;
          }
          if (p.name === 'Python') {
            p.shouldShowCertificate = true;
          } else {
            p.shouldShowCertificate = false;
          }
          const pathway_lang = [];
          // eslint-disable-next-line
          for (const course of p.courses) {
            course.completed_portion = 0;
            if (request.auth.credentials !== null) {
              const [
                errorInPercentage,
                percentage,
                // eslint-disable-next-line
              ] = await progressTrackingService.getProgressTrackPercentage(
                request.auth.credentials.id,
                course.id
              );
              if (errorInPercentage) {
                logger.error(JSON.stringify(errorInPercentage));
                return h.response(errorInPercentage).code(errorInPercentage.code);
              }
              course.completed_portion = percentage;
            }
            const languages = [
              { code: 'en', label: 'English' },
              { code: 'hi-IN', label: 'Hindi' },
              { code: 'kn-IN', label: 'Kannada' },
              { code: 'te-IN', label: 'Telugu' },
              { code: 'or-IN', label: 'Oriya' }
            ];
            _.map(course.lang_available, (lang) => {
              const matchingLanguageObject = languages.find(langObj => langObj.code === lang);

              if (matchingLanguageObject) {
                if (!_.find(pathway_lang, { code: matchingLanguageObject.code, label: matchingLanguageObject.label })) {
                  pathway_lang.push(matchingLanguageObject);
                }
              }
            });
            // _.map(course.lang_available, (lang) => {
            //   if (!_.find(pathway_lang, { code: lang, label: lang_key[lang] })) {
            //     pathway_lang.push({ code: lang, label: lang_key[lang] });
            //   }
            // });
          }
          p.lang_available = pathway_lang;
        }

        const pathwayData = [];
        if (request.headers.platform === 'android') {
          for (const data of pathway) {
            if (data.code !== 'TCBPI') {
              pathwayData.push(data);
            }
          }
          pathway = pathwayData;
        }
        logger.info('List of all Pathways');
        return { pathways: pathway };
      },
    },
  },

  {
    method: 'GET',
    path: '/pathways/dropdown',
    options: {
      description: 'List of all pathways to show in dropdown ⓜ',
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
        const { pathwayService, pathwayServiceV2, partnerService } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;

        const useV2 = appVersion >= androidVersions.latest;

        const pathways_order = [];

        const [err, data] = await (useV2 ? pathwayServiceV2 : pathwayService).find();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        data.forEach((pathway) => {
          if (pathway.code !== 'ACB') {
            pathways_order.push(pathway.code);
          }
        });
        let partner_id;
        if (request.auth.isAuthenticated) {
          partner_id = request.auth.credentials.partner_id;
        }

        if (partner_id) {
          const [errPartner, partner] = await partnerService.getPartnerThrowPartnerID(partner_id);
          if (errPartner) {
            logger.error(JSON.stringify(errPartner));
            return h.response(errPartner).code(errPartner.code);
          }

          if (partner.name.toLowerCase() === 'amazon coding bootcamp') {
            pathways_order.push('ACB');
          }
        }

        const pathways = _.compact(
          pathways_order.map((pathway_code) => _.find(data, { code: pathway_code }))
        );
        // let pathway;
        // if (useV2) {
        //   pathway = await displayService.pathwayV2(pathways);
        // } else {
        //   pathway = await displayService.pathway(pathways, request.query.courseType);
        // }
        logger.info('List of all Pathways for dropdown');
        return { pathways };
      },
    },
  },

  {
    method: 'GET',
    path: '/pathways/checkIfCodeExists',
    options: {
      description: 'Check if a pathway with the given code exists. ⓜ',
      tags: ['api'],
      validate: {
        headers: Joi.object({
          platform: Joi.string().valid('web', 'android').optional(),
          'version-code': Joi.number().integer().optional(),
        }),
        query: Joi.object({
          code: Joi.string().required(),
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
          const [pathway] = await pathwayServiceV2.findByCode(request.query.code, true);
          if (pathway) {
            resp.exists = true;
            resp.pathway = pathway;
          }
        } else {
          const [pathway] = await pathwayService.findByCode(request.query.code);
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
    method: 'GET',
    path: '/pathways/{pathwayId}',
    options: {
      description: 'Get a single pathway ⓜ',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
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
        const {
          pathwayService,
          pathwayServiceV2,
          displayService,
          progressTrackingService,
        } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        const courseType = request.query.courseType ? request.query.courseType : null;

        if (appVersion >= androidVersions.latest) {
          const [err, pathway] = await pathwayServiceV2.findById(request.params.pathwayId, true);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          // eslint-disable-next-line
          if (pathway == null || pathway == undefined) {
            return {
              error: true,
              message: 'NotFoundError',
              type: 'NotFound',
              data: [],
            };
          }
          // eslint-disable-next-line no-restricted-syntax
          for (const p of pathway.courses) {
            p.completed_portion = 0;
            if (request.auth.credentials !== null) {
              const [
                errInPercentage,
                percentage,
                // eslint-disable-next-line
              ] = await progressTrackingService.getProgressTrackPercentage(
                request.auth.credentials.id,
                p.id
              );
              if (errInPercentage) {
                logger.error(JSON.stringify(errInPercentage));
                return h.response(errInPercentage).code(errInPercentage.code);
              }
              p.completed_portion = percentage;
            }
          }
          logger.info('Get a single pathway');
          return { pathway };
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
    method: 'GET',
    path: '/pathways/progress/migration/{pathway_id}',
    options: {
      description: 'check whether a student is enrolled in the class or not',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['admin'],
      },
      validate: {
        params: Joi.object({
          pathway_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { pathwayServiceV2 } = request.services();
        const pathwayId = request.params.pathway_id;

        const [err, data] = await pathwayServiceV2.userProgressMigration(pathwayId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },

  {
    method: 'GET',
    path: '/pathways/{pathwayId}/completePortion',
    options: {
      description: 'Get all courses and complete portion of a pathway ⓜ',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        // mode: 'optional',
      },
      validate: {
        params: Joi.object({
          pathwayId: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { pathwayServiceV2 } = request.services();
        const [err, pathway] = await pathwayServiceV2.findById(request.params.pathwayId, true); // true = get pathway with it's courses
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        // eslint-disable-next-line
        if (pathway == null || pathway == undefined) {
          return {
            status: 404,
            name: 'NotFoundError',
            message: 'Not Found',
            details: {},
          };
        }
        const [errInCompleted, completedPathway] = await pathwayServiceV2.getCourseComplete(
          request.auth.credentials.id,
          request.params.pathwayId,
          pathway.courses
        );
        if (errInCompleted) {
          logger.error(JSON.stringify(errInCompleted));
          return h.response(errInCompleted).code(errInCompleted.code);
        }
        logger.info('Get a single pathway');
        return completedPathway;
      },
    },
  },

  {
    method: 'GET',
    path: '/pathways/{pathwayId}/totalProgress',
    options: {
      description: 'Get all courses and complete portion of a pathway ⓜ',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        // mode: 'optional',
      },
      validate: {
        params: Joi.object({
          pathwayId: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { pathwayServiceV2 } = request.services();
        const [err, pathway] = await pathwayServiceV2.findById(request.params.pathwayId, true); // true = get pathway with it's courses
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (pathway === null || pathway === undefined) {
          return {
            status: 404,
            name: 'NotFoundError',
            message: 'Not Found',
            details: {},
          };
        }
        const [errInCompleted, completedPathway] = await pathwayServiceV2.getCourseProgress(
          request.auth.credentials.id,
          request.params.pathwayId,
          pathway.courses
        );
        if (errInCompleted) {
          logger.error(JSON.stringify(errInCompleted));
          return h.response(errInCompleted).code(errInCompleted.code);
        }
        logger.info('Get a single pathway');
        return completedPathway;
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
      description: 'Get all courses of a particular pathway id ⓜ',
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
        const { displayService, progressTrackingService, pathwayServiceV2, teacherService } = request.services();
        const { pathwayId } = request.params;
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        let email = request.auth.credentials.email;

        const statusCodeMap = {
          'Scratch JR': 'true',
          'Google Form': 'false',
          'MS Word': 'false',
          'MS Excel': 'false',
          'Coursename Pre-Quiz': 'false'
        };
        if (appVersion >= androidVersions.latest) {
          const [errInPathway, pathwayCourses] = await displayService.getPathwayCoursesV2(
            pathwayId
          );
          if (errInPathway) return h.response(errInPathway).code(errInPathway.code);
          const pathway_lang = [];
          // eslint-disable-next-line
          let employeeType = await teacherService.getEmployeeType(email);
          
          for (const p of pathwayCourses.courses) {
            p.completed_portion = 0;
            let markPreQuiz;
            if (request.auth.credentials !== null) {
              if (pathwayCourses.code === "TCBPI2") {
                markPreQuiz = await displayService.markPreQuizComplete(request.auth.credentials.id, p.id);
              }
              const [
                errInPercentage,
                percentage,
                // eslint-disable-next-line
              ] = await progressTrackingService.getProgressTrackPercentage(
                request.auth.credentials.id,
                p.id
              );
              if (errInPercentage) {
                logger.error(JSON.stringify(errInPercentage));
                return h.response(errInPercentage).code(errInPercentage.code);
              }
              p.isPreQuizCompleted = markPreQuiz;
              p.completed_portion = percentage;
            }
            const languages = [
              { code: 'en', label: 'English' },
              { code: 'hi-IN', label: 'Hindi' },
              { code: 'kn-IN', label: 'Kannada' },
              { code: 'te-IN', label: 'Telugu' },
              { code: 'or-IN', label: 'Oriya' }
            ];
            _.map(p.lang_available, (lang) => {
              const matchingLanguageObject = languages.find(langObj => langObj.code === lang);

              if (matchingLanguageObject) {
                if (!_.find(pathway_lang, { code: matchingLanguageObject.code, label: matchingLanguageObject.label })) {
                  pathway_lang.push(matchingLanguageObject);
                }
              }
            });
            // p.isMandatory = statusCodeMap[p.name] || 'false';
            if (p.name === 'Scratch JR' && (employeeType === 'clerical_staff' || employeeType === 'principal') && pathwayId === 10) {
              p.isMandatory = 'true';
            }
            else if (pathwayId === 10 && (employeeType === 'teacher' || employeeType === 'mentor_teacher' || employeeType === 'school_inspector')) {
              p.isMandatory = 'true';
            }
            else {
              p.isMandatory = 'false';
            }

            // _.map(p.lang_available, (lang) => {
            //   if (!_.find(pathway_lang, { code: lang, label: lang_key[lang] })) {
            //     pathway_lang.push({ code: lang, label: lang_key[lang] });
            //   }
            // });
          }
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
        c.status_code = statusCodeMap[c.name] || 'false';
        const pathway_lang = [];
        console.log(pathway_lang, "pathway_lang, first");
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
    path: '/pathways/complete/{pathwayId}',
    options: {
      description: 'Get all completed pathways',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        params: Joi.object({
          pathwayId: Joi.number().integer().required(),
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
          const [err, completed] = await pathwayServiceV2.getPathwayComplete(
            request.auth.credentials.id,
            request.params.pathwayId
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
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          pathwayId: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { classesService, displayService, userService } = request.services();
        const userId = request.auth.credentials.id;
        const { scope } = request.auth.credentials;
        const [error, user] = await userService.findById(userId);
        if (error) {
          logger.error(JSON.stringify(error));
          return h.response(error).code(error.code);
        }
        // const duration = UTCToISTConverter(new Date(new Date().setDate(new Date().getDate() + 7)));
        // eslint-disable-next-line
        let [err, classes] = await classesService.getClassesByPathwaysId(
          // duration,
          request.params.pathwayId,
          scope,
          user.partner_id,
          user.space_id,
          user.group_id
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (classes.length > 0) {
          classes = _.sortBy(classes, 'start_time');
        }
        if (classes.length > 4) {
          classes = classes.slice(0, 4);
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
        const enrolledclasses = [];
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
            return enrolledclasses;
          }
          return enrolledclasses;
        }
        return enrolledclasses;
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
        const {
          classesService,
          displayService,
          pathwayServiceV2,
          pathwayService,
        } = request.services();
        const allClasses = [];
        const [errInPathwayIdDetails, getPathwayIdDetails] = await pathwayServiceV2.findById(
          request.params.pathwayId
        );
        if (errInPathwayIdDetails) {
          logger.error(JSON.stringify(errInPathwayIdDetails));
        }
        if (getPathwayIdDetails !== null && getPathwayIdDetails !== undefined) {
          const [errInOldPathway, getOldPathway] = await pathwayService.getOldPathwayIdByCode(
            getPathwayIdDetails.code
          );
          if (errInOldPathway) {
            logger.error(JSON.stringify(errInOldPathway));
          }

          if (getOldPathway !== null && getOldPathway !== undefined) {
            const oldData = await classesService.getIfStudentEnrolled(
              request.auth.credentials.id,
              getOldPathway[0].id
            );
            if (oldData.message === 'enrolled') {
              const [
                errInFetchingOldRecurringClasses,
                upcomingOldRecurringClasses,
              ] = await classesService.getEnrolledClasseByRecurringId(oldData.recurring_id);
              if (errInFetchingOldRecurringClasses) {
                logger.error(JSON.stringify(errInFetchingOldRecurringClasses));
              }
              if (upcomingOldRecurringClasses !== null && upcomingOldRecurringClasses.length > 0) {
                allClasses.push(upcomingOldRecurringClasses[0]);
              }
            }
          }
        }
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
        const {
          classesService,
          displayService,
          pathwayServiceV2,
          pathwayService,
        } = request.services();
        const [errInPathwayIdDetails, getPathwayIdDetails] = await pathwayServiceV2.findById(
          request.params.pathwayId
        );
        if (errInPathwayIdDetails) {
          logger.error(JSON.stringify(errInPathwayIdDetails));
        }
        if (getPathwayIdDetails !== null && getPathwayIdDetails !== undefined) {
          const [errInOldPathway, getOldPathway] = await pathwayService.getOldPathwayIdByCode(
            getPathwayIdDetails.code
          );
          if (errInOldPathway) {
            logger.error(JSON.stringify(errInOldPathway));
          }
          if (getOldPathway !== null && getOldPathway !== undefined) {
            const oldData = await classesService.getIfStudentEnrolled(
              request.auth.credentials.id,
              getOldPathway[0].id
            );
            if (oldData.message === 'enrolled') {
              const [
                errInFetchingOldRecurringClasses,
                upcomingOldRecurringClasses,
              ] = await classesService.getEnrolledClasseByRecurringId(oldData.recurring_id);
              if (errInFetchingOldRecurringClasses) {
                logger.error(JSON.stringify(errInFetchingOldRecurringClasses));
              }
              if (upcomingOldRecurringClasses !== null && upcomingOldRecurringClasses.length > 0) {
                allClasses.push(...upcomingOldRecurringClasses);
              }
            }
          }
        }

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
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/enrolledBatches',
    options: {
      description: 'Gets a list of all upcoming enrolled batch in a pathways',
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
        const {
          classesService,
          displayService,
          pathwayService,
          pathwayServiceV2,
        } = request.services();
        const [errInPathwayIdDetails, getPathwayIdDetails] = await pathwayServiceV2.findById(
          request.params.pathwayId
        );
        if (errInPathwayIdDetails) {
          logger.error(JSON.stringify(errInPathwayIdDetails));
        }
        if (getPathwayIdDetails !== null && getPathwayIdDetails !== undefined) {
          const [errInOldPathway, getOldPathway] = await pathwayService.getOldPathwayIdByCode(
            getPathwayIdDetails.code
          );
          if (errInOldPathway) {
            logger.error(JSON.stringify(errInOldPathway));
          }
          if (getOldPathway !== null && getOldPathway !== undefined) {
            const oldData = await classesService.getIfStudentEnrolled(
              request.auth.credentials.id,
              getOldPathway[0].id
            );

            if (oldData.message === 'enrolled') {
              const [
                errInFetchingOldRecurringClasses,
                upcomingOldRecurringClasses,
              ] = await classesService.getEnrolledClasseByRecurringId(oldData.recurring_id);
              if (errInFetchingOldRecurringClasses) {
                logger.error(JSON.stringify(errInFetchingOldRecurringClasses));
              }
              if (upcomingOldRecurringClasses !== null && upcomingOldRecurringClasses.length > 0) {
                allClasses.push(upcomingOldRecurringClasses[0]);
              }
            }
          }
        }
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
    path: '/pathways/{pathwayId}/ACBEnrolledBatches',
    options: {
      description: 'Gets a list of all upcoming enrolled batch in a pathways',
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
        const {
          classesService,
          displayService,
          pathwayService,
          pathwayServiceV2,
        } = request.services();
        const [errInPathwayIdDetails, getPathwayIdDetails] = await pathwayServiceV2.findById(
          request.params.pathwayId
        );
        if (errInPathwayIdDetails) {
          logger.error(JSON.stringify(errInPathwayIdDetails));
        }
        if (getPathwayIdDetails !== null && getPathwayIdDetails !== undefined) {
          const [errInOldPathway, getOldPathway] = await pathwayService.getOldPathwayIdByCode(
            getPathwayIdDetails.code
          );
          if (errInOldPathway) {
            logger.error(JSON.stringify(errInOldPathway));
          }
          if (getOldPathway !== null && getOldPathway !== undefined) {
            const oldData = await classesService.getIfStudentEnrolled(
              request.auth.credentials.id,
              getOldPathway[0].id
            );

            if (oldData.message === 'enrolled') {
              const [
                errInFetchingOldRecurringClasses,
                upcomingOldRecurringClasses,
              ] = await classesService.getEnrolledClasseByRecurringId(oldData.recurring_id);
              if (errInFetchingOldRecurringClasses) {
                logger.error(JSON.stringify(errInFetchingOldRecurringClasses));
              }
              if (upcomingOldRecurringClasses !== null && upcomingOldRecurringClasses.length > 0) {
                allClasses.push(...upcomingOldRecurringClasses);
              }
            }
          }
        }
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
    path: '/pathways/ongoingTopic',
    options: {
      description: 'List of all pathways ⓜ',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const { pathwayServiceV2 } = request.services();
        const [errPathwaysTopic, pathwaysTopic] = await pathwayServiceV2.findPathwaysOngoingTopic(
          request.auth.credentials.id,
          request.auth.credentials.team_id
        );
        if (errPathwaysTopic) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return pathwaysTopic;
      },
    },
  },

  {
    method: 'GET',
    path: '/pathways/doubtclasses/{pathway_id}',
    options: {
      description: 'get all list of doubt classe according to the pathwayId',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          pathway_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { pathwayServiceV2 } = request.services();
        const pathwayId = request.params.pathway_id;
        const partnerId = request.auth.credentials.partner_id;
        const userId = request.auth.credentials.id;
        const [err, doubtClassesData] = await pathwayServiceV2.upComingDoubtClasses(
          pathwayId,
          partnerId,
          userId
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return doubtClassesData;
      },
    },
  },

  {
    method: 'GET',
    path: '/pathways/names',
    options: {
      description: 'get all list of pathway names and id',
      tags: ['api'],
      handler: async (request, h) => {
        const { pathwayServiceV2 } = request.services();
        const [err, dataOfpathway] = await pathwayServiceV2.pathwaysNames()
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return dataOfpathway;
      },
    },
  },

  {
    method: 'GET',
    path: '/pathways/c4ca',
    options: {
      description: 'Get the C4CA pathway modules and courses',
      tags: ['api'],
      auth: {
        strategy: 'jwt'
      },
    },
    handler: async (request, h) => {
      const { pathwayServiceV2, c4caService } = request.services();
      let user_id;
      let team_id;
      if (request.auth.credentials.team_id) {
        team_id = request.auth.credentials.team_id
      } else {
        user_id = request.auth.credentials.id;
      }
      const [err, pathway] = await pathwayServiceV2.getC4CAPathway(team_id, user_id)
      if (err) {
        logger.error(JSON.stringify(err));
        return h.response(err).code(err.code);
      }
      return pathway;
    },
  },

  {
    method: 'GET',
    path: '/pathways/c4ca/modules',
    options: {
      description: 'Get the C4CA pathway modules and percentage',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
    },
    handler: async (request, h) => {
      const { pathwayServiceV2, c4caService } = request.services();
      let user_id;
      let team_id;
      if (request.auth.credentials.team_id) {
        team_id = request.auth.credentials.team_id
      } else {
        user_id = request.auth.credentials.id;
      }
      const [errInpathwayModule, pathwayModule] = await pathwayServiceV2.getModuleC4CA(team_id, user_id);
      if (errInpathwayModule) {
        logger.error(JSON.stringify(errInpathwayModule));
        return c4caService.responseWrapper(null, errInpathwayModule.message);
      }
      if (pathwayModule === undefined) return c4caService.responseWrapper(null, 'teacher not found');
      const response_ = await c4caService.responseWrapper(pathwayModule, "success");
      return response_;
    },
  },

  {
    method: 'GET',
    path: '/pathways/aidcx',
    options: {
      description: 'Get the AIDCX pathway with courses',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
    },
    handler: async (request, h) => {
      const { pathwayServiceV2, careerService } = request.services();
      
      const pathwayId = process.env.AIDCX_PATHWAY_ID || 14;
      const [errInPathway, pathwayCourses] = await pathwayServiceV2.findById(pathwayId, true);
      if (errInPathway) return careerService.responseWrapper(null, 'pathway not found');
      const response_ = await careerService.responseWrapper(pathwayCourses, "success");
      return response_;
    },
  },

];
