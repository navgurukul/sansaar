const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/merakihackthon/28Sep',
    options: {
      description: 'create assessment.',
      tags: ['api'],
    //   auth: { strategy: 'jwt' },
      validate: {
        payload: Joi.object({
          user_id: Joi.number(),
          email: Joi.string(),
          durations: Joi.number(),
        }),
      },
      handler: async (request, h) => {
        const { hackthone28Sep } = request.services();
        const [err, MerakiData] = await hackthone28Sep.merakiTrackdata(request.payload);
        console.log(MerakiData);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return MerakiData;
      },
    },
  },
];
