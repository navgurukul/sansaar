const Joi = require('@hapi/joi');
const logger = require('../../server/logger');
const { getRouteScope } = require('./helpers');

module.exports = [
  {
    method: 'GET',
    path: '/c4caPartners/{partnerID}',
    options: {
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          partnerID: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { c4caPartnerService, c4caService } = request.services();
          const [err, data] = await c4caPartnerService.getC4caPartnerBy(request.params.partnerID);
          if (err) {
            logger.error(JSON.stringify(err));
            return c4caService.responseWrapper(null, err.message);
          }
          const response_ = await c4caService.responseWrapper(data, 'success');
          return response_;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },

  // c4caPartners create ====>>>
  {
    method: 'POST',
    path: '/c4caPartners',
    options: {
      description: 'Create the new partner.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        // scope: getRouteScope(['admin']),
      },
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          point_of_contact: Joi.string(),
          email: Joi.string().email(),
          phone_number: Joi.string()
            .min(7)
            .max(15)
            .pattern(
              /^(?:\+?\d{1,3}[\s-]?)?(?:\d{10}|\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}|\(\d{1,4}\)[\s-]?\d{6,10}|\d{1,4}[\s-]?\d{6,10})$/
            )
            .optional(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { c4caPartnerService } = request.services();
          const [err, data] = await c4caPartnerService.createC4caPartner(request.payload);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },

  {
    method: 'PUT',
    path: '/c4caPartners/{c4ca_partner_id}',
    options: {
      description: 'update the exist partner by id.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        // scope: getRouteScope(['admin']),
      },
      validate: {
        params: Joi.object({
          c4ca_partner_id: Joi.number().integer().greater(0).required(),
        }),
        payload: Joi.object({
          name: Joi.string().required(),
          point_of_contact_name: Joi.string(),
          email: Joi.string().email().allow(null),
          phone_number: Joi.string()
            .min(7)
            .max(15)
            .pattern(
              /^(?:\+?\d{1,3}[\s-]?)?(?:\d{10}|\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}|\(\d{1,4}\)[\s-]?\d{6,10}|\d{1,4}[\s-]?\d{6,10})$/
            )
            .optional(),
        }),
      },
    },
    handler: async (request, h) => {
      try {
        const { c4caPartnerService } = request.services();
        const { c4ca_partner_id } = request.params;
        const partnerData = request.payload;
        const [err, data] = await c4caPartnerService.c4caPartnerUpdataBy(
          c4ca_partner_id,
          partnerData
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      } catch (err) {
        logger.error(JSON.stringify(err));
        return h.response(err).code(err.code);
      }
    },
  },

  {
    method: 'DELETE',
    path: '/c4caPartners/{c4ca_partner_id}',
    options: {
      description: 'Delete the partner by id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        // scope: getRouteScope(['admin']),
      },
      validate: {
        params: Joi.object({
          c4ca_partner_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { c4caPartnerService } = request.services();
          const { c4ca_partner_id } = request.params;
          const [err] = await c4caPartnerService.deleteC4caPartner(c4ca_partner_id);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return {
            status: `success`,
            message: `Yep, tata bye bye!!! partner is ${c4ca_partner_id} removed successfully!`,
          };
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },
  {
    method: 'GET',
    path: '/c4caPartners/admin',
    options: {
      description: 'Gets a list of all c4ca partners with pagination.',
      tags: ['api'],
      validate: {
        query: Joi.object({
          page: Joi.number().optional(),
          limit: Joi.number().optional(),
        }),
      },
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        try {
          const { c4caPartnerService } = request.services();
          const { page, limit } = request.query;

          const [err, batches] = await c4caPartnerService.getAllC4caPartnerData(limit, page);

          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return batches;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },
  // Facilitator
  {
    method: 'POST',
    path: '/c4ca/facilitator/create',
    options: {
      description: 'Create facilitator',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          point_of_contact: Joi.string(),
          email: Joi.string().email().required(),
          c4ca_partner_id: Joi.number().integer().required(),
          phone_number: Joi.string()
            .regex(/^[0-9]{10}$/)
            .required(),
        }),
      },
      handler: async (request, h) => {
        const { c4caPartnerService, c4caService } = request.services();
        const [err, resp] = await c4caPartnerService.createFacilitator(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return c4caService.responseWrapper(null, err.message);
        }
        const [err1, data] = await c4caPartnerService.c4caTeacherInviteLink(
          request.payload.c4ca_partner_id,
          resp.data.id
        );
        return c4caService.responseWrapper(data, 'Facilitator created successfully!');
      },
    },
  },
];
