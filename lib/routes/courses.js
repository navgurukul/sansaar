const Joi = require('@hapi/joi');
const _ = require('lodash');
const glob = require('glob');

const Courses = require('../models/courses');

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
      handler: async (request, h) => {
        const { coursesService, displayService } = request.services();
        const [err, courses] = await coursesService.getAllCourses();

        const propertiesFileObj = {};

        const propFiles = glob.sync('**/PROPERTIES_FILES/**/*.json');
        if (propFiles.length > 0) {
          _.map(propFiles, (fileName) => {
            const name = fileName.split('/').pop().split('_')[0];
            if (!propertiesFileObj[name]) {
              propertiesFileObj[name] = [];
              propertiesFileObj[name].push(
                fileName.split('/').pop().split('_').pop().split('.')[0]
              );
            }
            if (
              propertiesFileObj[name].indexOf(
                fileName.split('/').pop().split('_').pop().split('.')[0]
              ) < 0
            ) {
              propertiesFileObj[name].push(
                fileName.split('/').pop().split('_').pop().split('.')[0]
              );
            }
          });
        }

        if (err) {
          return h.response(err).code(err.code);
        }
        if (request.auth.isAuthenticated) {
          const authUser = request.auth.credentials;
          const allCourses = await displayService.allCoursesWithEnrolled(courses, authUser);
          _.map(allCourses, (c) => {
            if (Object.keys(propertiesFileObj).indexOf(c.name) >= 0) {
              c.lang_available = propertiesFileObj[c.name];
            }
          });
          return allCourses;
        }
        _.map(courses, (c) => {
          if (Object.keys(propertiesFileObj).indexOf(c.name) >= 0) {
            c.lang_available = propertiesFileObj[c.name];
          }
        });
        return courses;
      },
    },
  },
  {
    method: 'GET',
    path: '/courses/recommended',
    options: {
      description: 'Get recommended courses',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const { coursesService } = request.services();
        const [err, courses] = await coursesService.getRecommendedCourses();
        if (err) {
          return h.response(err).code(err.code);
        }
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
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
        query: Joi.object({
          userLang: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { courseRenderer } = request.services();
        const { courseId } = request.params;
        const lang = ['hi', 'en', 'te', 'mr', 'ta'];
        const userLang = lang.indexOf(request.query.userLang) > -1 ? request.query.userLang : 'en';
        const [err, course] = await courseRenderer.getCourseExercise(courseId, userLang);
        if (err) {
          return h.response(err).code(err.code);
        }
        return { course };
      },
    },
  },
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
            return h.response(err).code(err.code);
          }
          return enrolled;
        };
        const enrollInCourse = await h.context.transaction(courseEnroll);
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
        }),
      },
      handler: async (request, h) => {
        const { coursesService } = request.services();
        const [err, course] = await coursesService.findByCourseName(request.query.name);
        if (err) {
          return h.response(err).code(err.code);
        }
        return { course };
      },
    },
  },
];
