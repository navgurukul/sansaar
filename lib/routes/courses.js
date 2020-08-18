const Joi = require('@hapi/joi');
const PathwayCourses = require('../models/pathwayCourses');
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
        const { coursesService } = request.services();
        const authUser = request.auth.credentials;
        const courses = await coursesService.getAllCourses(authUser);
        return courses;
      },
    },
  },
  {
    method: 'GET',
    path: '/courses/pathway/{pathwayId}',
    options: {
      description: 'Get all courses of a particular pathway id.',
      tags: ['api'],
      validate: {
        params: Joi.object({
          pathwayId: PathwayCourses.field('pathwayId'),
        }),
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        const { pathwayId } = request.params;
        const coursesByPathwayId = await coursesService.findCoursesByPathwayId(pathwayId);
        return coursesByPathwayId;
      },
    },
  },
  {
    method: 'PUT',
    path: '/courses/pathway/{pathwayId}',
    options: {
      description: 'Update, remove, create courses in a pathway.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      validate: {
        params: Joi.object({}),
        payload: Joi.object({
          pathwayId: PathwayCourses.field('pathwayId'),
          courseId: PathwayCourses.field('courseId'),
          sequenceNum: PathwayCourses.field('sequenceNum'),
        }),
      },
      handler: async (request, h) => {
        const { coursesService, displayService } = request.services();
        const { pathwayId } = request.params;
      },
    },
  },
];
