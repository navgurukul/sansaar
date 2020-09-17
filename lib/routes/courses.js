const Joi = require('@hapi/joi');
const Courses = require('../models/courses');
const CourseSeeder = require('../helpers/courseSeeder');
const { getRouteScope } = require('./helpers');
const Category = require('../models/category');

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
        const { coursesService, displayService } = request.services();
        const authUser = request.auth.credentials;
        const courses = await coursesService.getAllCourses(authUser);
        return displayService.enrolledCourses(courses);
      },
    },
  },
  {
    method: 'GET',
    path: '/courses/{courseId}/exercises',
    options: {
      description: 'Get complete list of topics in the course',
      tags: ['api'],
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
      },
      handler: async (request) => {
        const { coursesService, displayService } = request.services();
        const { courseId } = request.params;
        const courses = await coursesService.courses(courseId);
        const course = await displayService.courseExercises(courses);
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
          courseId: Courses.field('id'),
        }),
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        const { courseId } = request.params;
        const courseDeleted = await coursesService.deleteCourseById(courseId);
        return { courseDeleted };
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
        return { courseUpdated };
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
        scope: getRouteScope('team'),
      },
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
        const { coursesService } = request.services();
        const addCourse = async (txn) => {
          return coursesService.createNewCourse(request.payload, txn);
        };
        const newCourse = await h.context.transaction(addCourse);
        return { newCourse };
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
        return coursesService.createCategory(request.payload);
      },
    },
  },
];
