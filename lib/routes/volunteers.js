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
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      handler: async (request, h) => {
        const { userRoleService } = request.services();
        const [err, data] = await userRoleService.getAllVolunteers();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },
  {
    method: 'POST',
    path: '/volunteers/Automation',
    options: {
      description: 'add number and pathways of volunteer',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        payload: Joi.object({
          contact: Joi.string()
            .length(10)
            .pattern(/^[0-9]+$/)
            .required(),
          pathway_id: Joi.number().required(),
        }),
      },
      handler: async (request, h) => {
        const { userService, userRoleService } = request.services();
        const { payload } = request;
        const [err, user] = await userService.updateContactById(
          request.auth.credentials.id,
          payload.contact
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const details = {};
        details.user_id = request.auth.credentials.id;
        details.pathway_id = payload.pathway_id;
        // eslint-disable-next-line
        const [error, volunteer] = await userRoleService.createVolunteer(details);
        if (error) {
          logger.error(JSON.stringify(error));
          return h.response(error).code(error.code);
        }
        return user;
      },
    },
  },

  {
    method: 'PUT',
    path: '/volunteers',
    options: {
      // description: 'add number and pathways of volunteer',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        payload: Joi.object({
          hours_per_week: Joi.number().integer(),
          available_on_days: Joi.array().items(
            Joi.string().valid('SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA')
          ),
          available_on_time: Joi.string().pattern(
            // eslint-disable-next-line
            /^(0?[1-9]|1[012])(:[0-5]\d) [APap][mM]$/
          ),
        }),
      },
    },
    handler: async (request) => {
      // eslint-disable-next-line no-unused-vars
      const { userService, userRoleService } = request.services();
      const [error, result] = await userRoleService.volunteerWorking(
        request.payload,
        request.auth.credentials.id
      );
      if (error) {
        return error;
      }
      return result;
    },
  },
];
