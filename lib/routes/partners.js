const Joi = require('@hapi/joi');

module.exports = [
  {
    method: 'GET',
    path: '/partners/{partnerId}/users',
    options: {
      description: 'Get a partner students data and class activities (by partner ID)',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          partnerId: Joi.number().integer(),
        }),
        query: Joi.object({
          limit: Joi.number().integer(),
          page: Joi.number().integer(),
        }),
      },
      handler: async (request) => {
        const { partnerService, displayService } = request.services();
        const { partnerId } = request.params;
        const [err, res] = await partnerService.getPartnerUsersDetails(partnerId, request.query);
        if (err) {
          return err;
        }
        return displayService.filterPartnersUsersData(res);
      },
    },
  },
];
