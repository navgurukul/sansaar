const Joi = require('@hapi/joi');
const fs = require('fs');
const path = require('path');
const Courses = require('../models/courses');
const logger = require('../../server/logger');

const androidVersions = {
  latest: 35,
};

module.exports = [
  {
    method: 'GET',
    path: '/courses',
    options: {
      description: 'Get all courses',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { coursesService, displayService, coursesServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, courses] = await coursesServiceV2.getAllCourses();
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          if (request.auth.isAuthenticated) {
            const authUser = request.auth.credentials;
            const allCourses = await displayService.allCoursesWithEnrolled(courses, authUser);
            logger.info('Get all courses');
            return allCourses;
          }
          logger.info('Get all courses');
          return courses;
        }
        const [err, courses] = await coursesService.getAllCourses();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (request.auth.isAuthenticated) {
          const authUser = request.auth.credentials;
          const allCourses = await displayService.allCoursesWithEnrolled(courses, authUser);
          logger.info('Get all courses');
          return allCourses;
        }
        logger.info('Get all courses');
        return courses;
      },
    },
  },

  // No use case, dropped in v2
  {
    method: 'GET',
    path: '/courses/recommended',
    options: {
      description: 'Get recommended courses',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
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
          const [err, courses] = await coursesServiceV2.getRecommendedCourses();
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info('Get recommended courses');
          return courses;
        }
        const [err, courses] = await coursesService.getRecommendedCourses();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get recommended courses');
        return courses;
      },
    },
  },

  {
    method: 'GET',
    path: '/courses/{courseId}/exercises',
    options: {
      description: 'Get complete list of exercises in the course',
      tags: ['api'],
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
        query: Joi.object({
          lang: Joi.string(),
        }),
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { courseId } = request.params;
        const { coursesService, coursesServiceV2, displayService } = request.services();
        let sequence = Math.floor(Math.random() * 1000 + 1);
        /**
         * EXPERIMENTAL
         *
         * TO BE REMOVED
         */
        if (courseId === 1000) {
          const data = fs.readFileSync(path.resolve(__dirname, '../_mockAPIs/classTopic.json'));
          return data.toString();
        }
        /**
         * EXPERIMENTAL
         *
         * TO BE REMOVED
         */
        const language =
          ['hi', 'en', 'te', 'mr', 'ta'].indexOf(request.query.lang) > -1
            ? request.query.lang
            : 'en';
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, courseWithexercise] = await coursesServiceV2.getCourseExercise(
            courseId,
            language
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          const course = await displayService.courseV2(courseWithexercise);
          // eslint-disable-next-line
          for (let exercise in course[0].exercises) {
            // eslint-disable-next-line
            const classByExerciseId = await coursesServiceV2.getClassByExercise(
              course[0].exercises[exercise].id
            );
            course[0].exercises[exercise].sequence_num = sequence;
            course[0].exercises[exercise].content_type = 'exercise';
            sequence += 1;
            if (classByExerciseId.length > 0) {
              // eslint-disable-next-line
              const singleClassWithFacilitator = await displayService.getUpcomingClassFacilitators(
                classByExerciseId
              );
              // eslint-disable-next-line
              for (let singleClass in singleClassWithFacilitator) {
                if (
                  singleClassWithFacilitator[singleClass].recurring_id === null ||
                  singleClassWithFacilitator[singleClass].recurring_id === undefined
                ) {
                  // eslint-disable-next-line
                  const classes = await displayService.filterClassDetails(
                    singleClassWithFacilitator[singleClass],
                    sequence,
                    course[0].name
                  );
                  sequence += 1;
                  course[0].exercises.push(classes);
                }
              }
            }
          }
          // eslint-disable-next-line
          course[0].exercises.sort(function (a, b) {
            return parseFloat(a.sequence_num) - parseFloat(b.sequence_num);
          });
          logger.info('Get complete list of exercises in the course');
          return { course };
        }

        const [err, course] = await coursesService.getCourseExercise(courseId, language);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get complete list of exercises in the course');
        return { course };
      },
    },
  },

  // No use case, dropped in v2
  {
    method: 'POST',
    path: '/courses/{courseId}/enroll',
    options: {
      description: 'Enroll in the course with the given ID.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
      },
      handler: async (request, h) => {
        const { coursesService } = request.services();
        const authUser = request.auth.credentials;
        const { courseId } = request.params;
        const courseEnroll = async (txn) => {
          const [err, enrolled] = await coursesService.enrollInCourse(courseId, authUser, txn);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info('enrolled');
          return enrolled;
        };
        const enrollInCourse = await h.context.transaction(courseEnroll);
        logger.info('Enroll in the course with the given ID');
        return enrollInCourse;
      },
    },
  },

  {
    method: 'GET',
    path: '/courses/name',
    options: {
      description:
        'Get course by name for identifying whether course exist or not while running courseSeeder script',
      tags: ['api'],
      validate: {
        query: Joi.object({
          name: Courses.field('name'),
          courseType: Joi.string().valid('markdown', 'json').allow(null).optional(),
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
          const [err, course] =
            request.query.courseType || request.query.courseType === 'null'
              ? await coursesServiceV2.findByCourseName(
                  request.query.name,
                  request.query.courseType
                )
              : await coursesServiceV2.findByCourseName(request.query.name);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info('Get course by name');
          return { course };
        }
        const [err, course] =
          request.query.courseType || request.query.courseType === 'null'
            ? await coursesService.findByCourseName(request.query.name, request.query.courseType)
            : await coursesService.findByCourseName(request.query.name);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get course by name');
        return { course };
      },
    },
  },

  {
    method: 'PUT',
    path: '/courses/seed',
    options: {
      description: 'Seed course',
      tags: ['api'],
      validate: {
        query: Joi.object({
          course: Joi.string(),
          updateDB: Joi.boolean(),
        }),
      },
      handler: async (request) => {
        const { courseParserService } = request.services();
        const course = await courseParserService.courseParser(
          request.query.course,
          request.query.updateDB
        );
        logger.info('Seed course');
        return course;
      },
    },
  },
];
