const Joi = require('@hapi/joi');
const Courses = require('../models/course');
const CourseSeeder = require('../helpers/courseSeeder');
const { getRouteScope } = require('./helpers');

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
        const { CourseService } = request.services();
        const authUser = request.auth.credentials;
        const courses = await CourseService.getAllCourses(authUser);
        return courses;
      },
    },
  },

  {
    method: 'GET',
    path: '/course/{courseId}/topics',
    options: {
      description: 'Get complete list of topics in the course',
      tags: ['api'],
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
      },
      handler: async (request) => {
        const { CourseService } = request.services();
        const { courseId } = request.params;
        const getCourseTopic = await CourseService.getCourseTopics(courseId);
        return getCourseTopic;
      },
    },
  },

  {
    method: 'POST',
    path: '/course/{courseId}/enroll',
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
        const { CourseService } = request.services();
        const authUser = request.auth.credentials;
        const { courseId } = request.params;
        const enrollInCourse = await CourseService.enrollInCourse(courseId, authUser);
        return {
          enrollInCourse,
        };
      },
    },
  },

  {
    method: 'DELETE',
    path: '/course/{courseId}',
    options: {
      description: 'Delete the course by Id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
      },
      handler: async (request) => {
        const { CourseService } = request.services();
        const authUser = request.auth.credentials;
        const { courseId } = request.params;
        const courseDeleted = await CourseService.deleteCourseById(courseId, authUser);
        return { courseDeleted };
      },
    },
  },

  {
    method: 'PUT',
    path: '/course/{courseId}',
    options: {
      description: 'Update course by authorised user using course ID',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
        query: Joi.object({
          courseName: Joi.string().required(),
        }),
      },
      handler: async (request) => {
        const { CourseService } = request.services();
        const { courseId } = request.params;
        const { courseName } = request.query;

        const seedCourse = new CourseSeeder(courseName, courseId);
        const exercises = await seedCourse.init();
        const courseUpdated = await CourseService.updateCourse(exercises);
        return { courseUpdated };
      },
    },
  },
];
