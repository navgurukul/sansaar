const Joi = require('@hapi/joi');
const Courses = require('../models/course');

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
      handler: async (request) => {
        const { coursesService } = request.services();
        const authUser = request.auth.credentials;
        const courses = await coursesService.getAllCourses(authUser);
        return courses;
      },
    },
  },

  {
    method: 'GET',
    path: '/courses/{courseId}/topics',
    options: {
      description: 'Get complete list of topics in the course',
      tags: ['api'],
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        const { courseId } = request.params;
        const listOfTopic = await coursesService.getCourseTopics(courseId);
        return listOfTopic;
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
      handler: async (request) => {
        const { coursesService } = request.services();
        const authUser = request.auth.credentials;
        const { courseId } = request.params;
        const enrollInCourse = await coursesService.enrollInCourse(courseId, authUser);
        return {
          enrollInCourse,
        };
      },
    },
  },
];
