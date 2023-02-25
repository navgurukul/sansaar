const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'GET',
    path: '/search/{user_id}',
    options: {
      description: 'Get details popular search if there is no user_id put null value',
      tags: ['api'],
      validate: {
        params: Joi.object({
          user_id: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { searchService } = request.services();
        const [err, data] = await searchService.showing_popular_searches(request.params.user_id);

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
    path: '/search/{user_id}/{name}',
    options: {
      description: 'Posting the user search data ',
      tags: ['api'],
      validate: {
        params: Joi.object({
          name: Joi.string(),
          user_id: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        console.log('running this api', request.params);
        const { searchService } = request.services();
        const [err, data] = await searchService.sending_data(request.params);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },
];