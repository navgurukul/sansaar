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
          pathwayId: PathwayCourses.field('pathway_id'),
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
      description: 'Update the courses for a specific pathway ID.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      validate: {
        params: Joi.object({
          pathwayId: PathwayCourses.field('pathway_id'),
        }),
        payload: Joi.object({
          course_id: PathwayCourses.field('course_id'),
          sequence_num: PathwayCourses.field('sequence_num'),
          pathwayCourseId: Joi.number().integer(),
        }),
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        const { pathwayId } = request.params;
        const pathwayCourses = await coursesService.updateCoursesByPathwayId(
          pathwayId,
          request.payload,
          request.auth.credentials
        );
        return { pathwayCourses };
      },
    },
  },
];
