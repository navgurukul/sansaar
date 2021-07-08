const Joi = require('@hapi/joi');

module.exports = [
  {
    method: 'GET',
    path: '/partners',
    options: {
      description: 'List of all partners in the system.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        query: Joi.object({
          limit: Joi.number().integer().optional(),
          page: Joi.number().integer().optional(),
          name: Joi.string().optional(),
        }),
      },
      handler: async (request, h) => {
        const { partnerService, displayService } = request.services();
        const [err, partners] = await partnerService.getAllPartner(request.query);
        if (err) {
          return h.response(err).code(err.code);
        }
        return displayService.transformPartnersData(partners);
      },
    },
  },
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
          limit: Joi.number().integer().optional(),
          page: Joi.number().integer().optional(),
          name: Joi.string().optional(),
        }),
      },
      handler: async (request, h) => {
        const { partnerService, displayService } = request.services();
        const { partnerId } = request.params;
        const [err, res] = await partnerService.getPartnerUsersDetails(partnerId, request.query);
        if (err) {
          return h.response(err).code(err.code);
        }
        return displayService.filterPartnersUsersData(res);
      },
    },
  },
  {
    method: 'PUT',
    path: '/partners/{partnerId}/meraki-link',
    options: {
      description: 'Create meraki-link(short) and Get partner details with the given ID.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          partnerId: Joi.number().integer(),
        }),
      },
      handler: async (request) => {
        const { partnerService } = request.services();
        const partner = await partnerService.meraki_link(request.params.partnerId);
        return { data: partner };
      },
    },
  },
];
