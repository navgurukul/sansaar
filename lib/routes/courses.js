const Joi = require('@hapi/joi');
const { displayStack } = require('hoek');
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
        const { courseService } = request.services();
        const authUser = request.auth.credentials;
        const courses = await courseService.getAllCourses(authUser);
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
        const { courseService, displayService } = request.services();
        const { courseId } = request.params;
        const course = await courseService.getExercises(courseId);
        const courseExercises = await displayService.courseExercises(course);
        return { courseExercises };
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
      handler: async (request, h) => {
        const { courseService } = request.services();
        const authUser = request.auth.credentials;
        const { courseId } = request.params;
        const courseEnroll = async (txn) => {
          return courseService.enrollInCourse(courseId, authUser, txn);
        };
        const enrollInCourse = await h.context.transaction(courseEnroll);
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
        const { courseService } = request.services();
        const { courseId } = request.params;
        const courseDeleted = await courseService.deleteCourseById(courseId);
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
        const { courseService } = request.services();
        const { courseId } = request.params;
        const { courseName } = request.query;

        const seedCourse = new CourseSeeder(courseName, courseId);
        const exercises = await seedCourse.init();
        const courseUpdated = await courseService.updateCourse(exercises);
        return { courseUpdated };
      },
    },
  },

  {
    method: 'POST',
    path: '/course',
    options: {
      description: 'Create new course',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          name: Courses.field('name'),
          type: Courses.field('type'),
          days_to_complete: Courses.field('days_to_complete'),
          short_description: Courses.field('short_description'),
          logo: Courses.field('logo'),
        }),
      },
      handler: async (request, h) => {
        const { courseService } = request.services();
        const addCourse = async (txn) => {
          return courseService.createNewCourse(request.payload, txn);
        };
        const newCourse = await h.context.transaction(addCourse);
        return { newCourse };
      },
    },
  },

  {
    method: 'GET',
    path: '/course/name',
    options: {
      description:
        'Get course by name for indetifying whether course exist or not while running courseSeeder script',
      tags: ['api'],
      validate: {
        query: Joi.object({
          name: Courses.field('name'),
        }),
      },
      handler: async (request) => {
        const { courseService } = request.services();
        const course = await courseService.findByCourseName(request.query.name);
        return { course };
      },
    },
  },
];
