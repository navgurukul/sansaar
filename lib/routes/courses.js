const Joi = require('@hapi/joi');
// const { execSync, exec, fork } = require('child_process');
// const { stdout, stderr } = require('process');
const Courses = require('../models/courses');
const { runParser } = require('../courseParser/index');

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

        if (err) {
          return h.response(err).code(err.code);
        }
        if (request.auth.isAuthenticated) {
          const authUser = request.auth.credentials;
          const allCourses = await displayService.allCoursesWithEnrolled(courses, authUser);
          return allCourses;
        }
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
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
        query: Joi.object({
          lang: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { courseId } = request.params;
        const { coursesService } = request.services();
        const language =
          ['hi', 'en', 'te', 'mr', 'ta'].indexOf(request.query.lang) > -1
            ? request.query.lang
            : 'en';
        const [err, course] = await coursesService.getCourseExercise(courseId, language);
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
  {
    method: 'PUT',
    path: '/courses/seed',
    options: {
      description: 'Seed Course',
      tags: ['api'],
      validate: {
        query: Joi.object({
          course: Joi.string(),
        }),
      },
      handler: async (request) => {
        const options = {
          flagSingle: true,
          ifUpdateDB: true,
          course: request.query.course,
        };
        return runParser(options);
        // const runSeeder = () => {
        //   const res = asyncFunc();
        //   return res;
        // };
        // const asyncFunc = () => {
        //   return exec(
        //     `node lib/courseParser/index.js --parseSingleCourse ${request.query.course} --updateDB`,
        //     (error, stdout, stderr) => {
        //       if (error) {
        //         console.log(`error: ${error.message}`);
        //         return error;
        //       }
        //       if (stderr) {
        //         console.log(`stderr: ${stderr}`);
        //         return stderr;
        //       }
        //       console.log(`stdout: ${stdout}`);
        //       return stdout;
        //     }
        //   );
        // };
        // console.log(runSeeder().toString(), '{}{}{}{s');
        // return runSeeder();
      },
    },
  },
];
