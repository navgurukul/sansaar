const Joi = require('@hapi/joi');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'GET',
    path: '/partners',
    options: {
      description: 'List of all partners in the system.',
      tags: ['api'],
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
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const partners = await displayService.transformPartnersData(data.partners);
        logger.info('List of all partners in the system');
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

        // If the user does not have `admin` as one of the role
        if (request.auth.credentials.scope.indexOf('admin') < 0) {
          // If the user's partner id doesn't match the route
          if (partnerId !== request.auth.credentials.partner_id) {
            logger.error('Access Denied. Please contact meraki@navgurukul.org');
            return {
              error: true,
              message: `Access Denied. Please contact meraki@navgurukul.org if you think this is an error.`,
            };
          }
        }
        const [err, data] = await partnerService.getPartnerUsersDetails(partnerId, request.query);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const students = await displayService.filterPartnersUsersData(data.students);
        logger.info(
          `id- ${request.auth.credentials.id} Get a partner students data and class activities (by partner ID)`
        );
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
        logger.info(
          `id- ${request.auth.credentials.id} Create a bitly link for Meraki android app and Web app for a partner`
        );
        return partnerService.partnerSpecificLink(
          request.headers.platform,
          request.params.partnerId
        );
      },
    },
  },
  {
    method: 'POST',
    path: '/partners/addUser',
    options: {
      description: 'Add an existing user to your partner by email.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('partner'),
      },
      validate: {
        payload: Joi.object({
          email: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { partnerService } = request.services();
        const partnerId = request.auth.credentials.partner_id;
        const partnerUser = await partnerService.getPartnerUser(request.payload.email, partnerId);
        if (partnerId == null) {
          return { error: true, message: 'partner_id is NULL of this user.' };
        }
        try {
          logger.info(`id- ${request.auth.credentials.id} Added a user`);
          return partnerUser;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },
  {
    method: 'PUT',
    path: '/partners/{userId}/user',
    options: {
      description: 'Update partners user name',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('partner'),
      },
      validate: {
        params: Joi.object({
          userId: Joi.number().integer(),
        }),
        payload: Joi.object({
          name: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { partnerService } = request.services();
        let userUpdated;
        const [err, updatepartnerpser] = await partnerService.updatePartnerUser(
          request.params.userId,
          request.payload.name
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (updatepartnerpser === 1) {
          userUpdated = {
            status: `success`,
            message: `${request.payload.name} updated successfully!`,
          };
        }
        logger.info(`id- ${request.auth.credentials.id} updated a user`);
        return userUpdated;
      },
    },
  },
  {
    method: 'DELETE',
    path: '/partners/{userId}/user',
    options: {
      description: 'Remove an user from the partner (Not deleting from the db)',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('partner'),
      },
      validate: {
        params: Joi.object({
          userId: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { partnerService } = request.services();
        const { userId } = request.params;
        let removeAnPartnerUser;
        const [err, deleted] = await partnerService.removeAnUserFromPartner(userId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (deleted === 1) {
          removeAnPartnerUser = {
            status: `success`,
            message: `Yaay! ${userId} user removed successfully!`,
          };
        }
        logger.info(`id- ${request.auth.credentials.id} Remove an user from the partner`);
        return removeAnPartnerUser;
      },
    },
  },
  {
    method: 'POST',
    path: '/partners/partnerGroup/upload-CSV',
    options: {
      payload: {
        output: 'file',
        multipart: true,
      },
      description: 'Add partner group',
      notes: 'file-upload',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('partner'),
      },
      plugins: {
        'hapi-swagger': {
          payloadType: 'form',
        },
      },
      validate: {
        payload: Joi.object({
          file: Joi.any().meta({ swaggerType: 'file' }).description('file'),
        }),
      },
      handler: async (request, h) => {
        const { partnerService } = request.services();
        const csvFile = request.payload.file.filename;
        const [err, partnergroup] = await partnerService.partnerGroup(csvFile);
        let uploaded;
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (partnergroup === true) {
          uploaded = {
            status: `success`,
            message: `Yaay! ${csvFile} uploaded successfully!`,
          };
        }
        logger.info(`id- ${request.auth.credentials.id} ${uploaded} file uploaded successfully!`);
        return uploaded;
      },
    },
  },
];
