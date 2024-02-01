const Joi = require('@hapi/joi');
const Category = require('../models/category');
const CourseCompletion = require('../models/courseCompletion');
const CourseSeeder = require('../helpers/courseSeeder');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');

const androidVersions = {
  latest: 35,
};

module.exports = [
  {
    method: 'POST',
    path: '/courses/{courseId}/complete',
    options: {
      description: 'Mark course completion',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        params: Joi.object({
          courseId: CourseCompletion.field('course_id'),
        }),
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { coursesService, coursesServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, complete] = await coursesServiceV2.markCourseComplete(
            request.auth.credentials.id,
            request.params.courseId
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info('Mark course completion');
          return complete;
        }
        const [err, complete] = await coursesService.markCourseComplete(
          request.auth.credentials.id,
          request.params.courseId
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Mark course completion');
        return complete;
      },
    },
  },

  {
    method: 'DELETE',
    path: '/courses/{courseId}/complete',
    options: {
      description: 'Unmark course completion',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        params: Joi.object({
          courseId: CourseCompletion.field('course_id'),
        }),
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { coursesService, coursesServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const getId = await coursesServiceV2.getIdForRemoval(
            request.auth.credentials.id,
            request.params.courseId
          );
          if (getId) {
            const deleted = async (txn) => {
              return coursesServiceV2.removeCourseComplete(
                getId[0].id,
                request.auth.credentials.id,
                request.params.courseId,
                txn
              );
            };
            logger.info('Unmark course completion');
            return h.context.transaction(deleted);
          }
          logger.info('Unmark course completion is null');
          return null;
        }
        const getId = await coursesService.getIdForRemoval(
          request.auth.credentials.id,
          request.params.courseId
        );
        if (getId) {
          const deleted = async (txn) => {
            return coursesService.removeCourseComplete(
              getId[0].id,
              request.auth.credentials.id,
              request.params.courseId,
              txn
            );
          };
          logger.info('Unmark course completion');
          return h.context.transaction(deleted);
        }
        logger.info('Unmark course completion is null');
        return null;
      },
    },
  },

  {
    method: 'GET',
    path: '/courses/complete',
    options: {
      description: 'Get all completed courses',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { coursesService, coursesServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, completedCourse] = await coursesServiceV2.getCourseComplete(
            request.auth.credentials.id
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info('Get all completed courses');
          return completedCourse;
        }
        const [err, completedCourse] = await coursesService.getCourseComplete(
          request.auth.credentials.id
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get all completed courses');
        return completedCourse;
      },
    },
  },

  {
    method: 'POST',
    path: '/courses/v1_to_v2_migration',
    options: {
      description: 'migrate courses v1 to v2',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      handler: async (request, h) => {
        const { coursesService, coursesServiceV2 } = request.services();
        const [err, courses] = await coursesService.getAllCourses({ course_type: 'json' });
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }

        logger.info('Get all courses');
        const addCourse = await coursesServiceV2.createCourses(courses);
        return { addCourse };
      },
    },
  },
];
