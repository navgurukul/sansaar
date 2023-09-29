const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/merakihackthon/28Sep/merakiTrack',
    options: {
      description: 'post track data.',
      tags: ['api'],
        auth: { strategy: 'jwt' },
      validate: {
        payload: Joi.object({
          // user_id: Joi.number(),
          email: Joi.string(),
          // durations: Joi.number(),
        }),
      },
      handler: async (request, h) => {
        const { hackthone28Sep } = request.services();
        let user_id = request.auth.credentials.id;

        request.payload.user_id = user_id;
        const [err, MerakiData] = await hackthone28Sep.merakiTrackdata(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return MerakiData;
      },
    },
  },

  {
    method: 'GET',
    path: '/merakihackthon/28Sep/getIDbyEmail',
    options: {
      description: 'get data by email.',
      tags: ['api'],
      //   auth: { strategy: 'jwt' },
      validate: {
        query: Joi.object({
          email: Joi.string(),
        }),
      },
    },
    handler: async (request, h) => {
      const { hackthone28Sep } = request.services();
      const [err, MerakiData] = await hackthone28Sep.getIDbyEmail(request.query);
      console.log(MerakiData);
      if (err) {
        logger.error(JSON.stringify(err));
        return h.response(err).code(err.code);
      }
      return MerakiData;
    },
  },
  {
    method: 'GET',
    path: '/merakihackthon/28Sep/getAllData',
    options: {
      description: 'get data by email.',
      tags: ['api'],
      //   auth: { strategy: 'jwt' },
      // validate: {
      //   query: Joi.object({
      //     email: Joi.string(),
      //   }),
      // },
    },
    handler: async (request, h) => {
      const { hackthone28Sep } = request.services();
      const [err, MerakiData] = await hackthone28Sep.getAllData();
      console.log(MerakiData);
      if (err) {
        logger.error(JSON.stringify(err));
        return h.response(err).code(err.code);
      }
      return MerakiData;
    },
  },
];
