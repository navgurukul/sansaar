const Joi = require('@hapi/joi');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'GET',
    path: '/volunteers',
    options: {
      description: 'List of all volunteers in the system.',
      tags: ['api'],
      validate: {
        query: Joi.object({
          name: Joi.string().optional(),
        }),
      },
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      handler: async (request, h) => {
        const { userRoleService } = request.services();
        const [err, data] = await userRoleService.getAllVolunteers(request.query.name);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },
];
