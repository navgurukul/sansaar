const Joi = require('@hapi/joi');
const { getRouteScope } = require('./helpers');

module.exports = [
  {
    method: 'GET',
    path: '/partners',
    options: {
      description: 'List of all partners in the system.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
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
        const [err, data] = await partnerService.getAllPartner(request.query);
        if (err) {
          return h.response(err).code(err.code);
        }
        const partners = await displayService.transformPartnersData(data.partners);
        return { count: data.count, partners };
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
        scope: getRouteScope('partner'),
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
        if (
          !request.auth.credentials.scope.includes('partner') ||
          !request.auth.credentials.scope.includes('admin') ||
          partnerId !== request.auth.credentials.partner_id
        ) {
          return {
            error: true,
            message: `Access Denied. Please contact meraki@navgurukul.org if you think this is an error.`,
          };
        }
        const [err, data] = await partnerService.getPartnerUsersDetails(partnerId, request.query);
        if (err) {
          return h.response(err).code(err.code);
        }
        const students = await displayService.filterPartnersUsersData(data.students);
        return { count: data.count, students };
      },
    },
  },
  {
    method: 'PUT',
    path: '/partners/{partnerId}/merakiLink',
    options: {
      description: 'Create a bitly link for Meraki android app and Web app for a partner.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('partner'),
      },
      validate: {
        params: Joi.object({
          partnerId: Joi.number().integer(),
        }),
        headers: Joi.object({
          platform: Joi.string().valid('web', 'android').required(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request) => {
        const { partnerService } = request.services();
        return partnerService.partnerSpecificLink(
          request.headers.platform,
          request.params.partnerId
        );
      },
    },
  },
];
