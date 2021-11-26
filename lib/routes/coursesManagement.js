const Joi = require('@hapi/joi');
const Courses = require('../models/courses');
const Category = require('../models/category');
const CourseCompletion = require('../models/courseCompletion');
const CourseSeeder = require('../helpers/courseSeeder');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');

const androidVersions = {
  latest: 26,
};

module.exports = [
  // Not in V2
  {
    method: 'POST',
    path: '/courses/category',
    options: {
      description: 'Create categories',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        payload: Joi.object({
          category_name: Category.field('category_name'),
          created_at: Joi.date(),
        }),
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        logger.info('Create categories');
        return coursesService.createCategory(request.payload);
      },
    },
  },

  {
    method: 'DELETE',
    path: '/courses/{courseId}',
    options: {
      description: 'Delete the course by Id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          // Don't import validation from Models. Write Joi validation since we use the same endpoint to update two models
          courseId: Courses.field('id'),
        }),
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { coursesService, coursesServiceV2 } = request.services();
        const { courseId } = request.params;
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const deleteACourse = async () => {
            const [err, deleted] = await coursesServiceV2.deleteCourseById(courseId);
            if (err) {
              logger.error(JSON.stringify(err));
              return h.response(err).code(err.code);
            }
            return deleted;
          };
          logger.info('Delete the course by id');
          return h.context.transaction(deleteACourse);
        }
        const deleteACourse = async () => {
          const [err, deleted] = await coursesService.deleteCourseById(courseId);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return deleted;
        };
        logger.info('Delete the course by id');
        return h.context.transaction(deleteACourse);
      },
    },
  },

  {
    method: 'PUT',
    path: '/courses/{courseId}',
    options: {
      description: 'Update course by authorised user using course ID',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          // Don't import validation from Models. Write Joi validation since we use the same endpoint to update two models
          courseId: Courses.field('id'),
        }),
        query: Joi.object({
          courseName: Joi.string().required(),
        }),
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        const { courseId } = request.params;
        const { courseName } = request.query;

        const seedCourse = new CourseSeeder(courseName, courseId);
        const exercises = await seedCourse.init();
        const courseUpdated = await coursesService.updateCourse(exercises);
        logger.info('Update course by authorised user using course ID');
        return { courseUpdated };
      },
    },
  },

  {
    method: 'POST',
    path: '/courses-QH2hh8Ntynz5fyTv',
    options: {
      description: 'Create new course',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          /**
           * Don't import validation from Models.
           * Write Joi validation since we use the same endpoint to update two models
           * Keep the fields that are complement in V2 models as optional
           */
          name: Courses.field('name'),
          type: Courses.field('type'),
          short_description: Courses.field('short_description'),
          logo: Courses.field('logo'),
          course_type: Courses.field('course_type'),
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
          const addCourse = async (txn) => {
            return coursesServiceV2.createNewCourse(request.payload, txn);
          };
          const newCourse = await h.context.transaction(addCourse);
          logger.info('Create new course');
          return { newCourse };
        }
        const addCourse = async (txn) => {
          return coursesService.createNewCourse(request.payload, txn);
        };
        const newCourse = await h.context.transaction(addCourse);
        logger.info('Create new course');
        return { newCourse };
      },
    },
  },

  {
    method: 'POST',
    path: '/courses',
    options: {
      description: 'Create new course',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin', 'partner', 'volunteer']),
      },
      validate: {
        /**
         * Don't import validation from Models.
         * Write Joi validation since we use the same endpoint to update two models
         * Keep the fields that are complement in V2 models as optional
         */
        payload: Joi.object({
          name: Courses.field('name'),
          type: Courses.field('type'),
          short_description: Courses.field('short_description'),
          logo: Courses.field('logo'),
          course_type: Courses.field('course_type'),
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
          const addCourse = async (txn) => {
            return coursesServiceV2.createNewCourse(request.payload, txn);
          };
          const newCourse = await h.context.transaction(addCourse);
          logger.info('Create new course');
          return { newCourse };
        }
        const addCourse = async (txn) => {
          return coursesService.createNewCourse(request.payload, txn);
        };
        const newCourse = await h.context.transaction(addCourse);
        logger.info('Create new course');
        return { newCourse };
      },
    },
  },

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
];
