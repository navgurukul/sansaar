const Joi = require('@hapi/joi');
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
      },
      handler: async (request) => {
        const { coursesService, displayService } = request.services();
        const authUser = request.auth.credentials;
        const courses = await coursesService.getAllCourses(authUser);
        return displayService.allCoursesWithEnrolled(courses);
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
      },
      handler: async (request) => {
        const { coursesService, displayService } = request.services();
        const { courseId } = request.params;
        const courses = await coursesService.getCourseById(courseId);
        const course = await displayService.getCourseExercises(courses);
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
          return coursesService.enrollInCourse(courseId, authUser, txn);
        };
        const enrollInCourse = await h.context.transaction(courseEnroll);
        return {
          enrollInCourse,
        };
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
      handler: async (request) => {
        const { coursesService } = request.services();
        const course = await coursesService.findByCourseName(request.query.name);
        return { course };
      },
    },
  },
];
