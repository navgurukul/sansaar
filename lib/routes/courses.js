const Joi = require('@hapi/joi');
const PathwayCourses = require('../models/pathwayCourses');

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
];
