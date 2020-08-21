const Joi = require('@hapi/joi');
const Courses = require('../models/course');
const CourseSeeder = require('../helpers/courseSeeder');

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
        const getCourseTopic = await coursesService.getCourseTopics(courseId);
        return getCourseTopic;
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

  {
    method: 'DELETE',
    path: '/courses/{courseId}/delete',
    options: {
      description: 'Delete the course by Id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['team', 'traningAndPlacement', 'facha'],
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
        const courseDeleted = await coursesService.deleteCourseById(courseId, authUser);
        return { courseDeleted };
      },
    },
  },

  {
    method: 'PUT',
    path: '/courses/{courseId}/update',
    options: {
      description: 'Update course by autherized user using course ID',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['team', 'traningAndPlacement', 'facha'],
      },
      validate: {
        params: Joi.object({
          courseId: Courses.field('id')
        }),
        query: Joi.object({
          courseName: Joi.string().required()
        })
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        const { courseId } = request.params;
        const { courseName } = request.query; 
        
        let seedCourse = new CourseSeeder(courseName, courseId);
        const exercises = await seedCourse.init();
        const courseUpdated = await coursesService.updateCourse(exercises)
        return {courseUpdated}
      },
    }
  }
];
