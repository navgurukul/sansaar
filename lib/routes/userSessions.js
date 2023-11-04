const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'GET',
    path: '/users/addSessionToken',
    options: {
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      description: 'Get a session token for a user',
      tags: ['api'],
      handler: async (request, h) => {
        const { userSessionService } = request.services();
        const [err, data] = await userSessionService.getSessionId();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },
  {
    method: 'GET',
    path: '/users/checkSessionToken',
    options: {
      description: 'Check if session token is valid',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        query: Joi.object({
          token: Joi.string().required(),
        }),
      },
    },
    handler: async (request, h) => {
      const { userSessionService } = request.services();
      const [err, data] = await userSessionService.validateSessionToken(request.query.token);

      if (err) {
        logger.error(JSON.stringify(err));
        return h.response(err).code(err.code);
      }
      return data;
    },
  },
  {
    method: 'GET',
    path: '/users/removeSessionToken',
    options: {
      description: 'Check if session token exists',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        query: Joi.object({
          token: Joi.string().required(),
        }),
      },
    },
    handler: async (request, h) => {
      const { userSessionService } = request.services();
      const [err, data] = await userSessionService.removeSessionToken(request.query.token);

      if (err) {
        logger.error(JSON.stringify(err));
        return h.response(err).code(err.code);
      }
      return data;
    },
  },
];
