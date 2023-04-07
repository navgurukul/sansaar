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
        scope: getRouteScope(['partner', 'partner_view', 'partner_edit']),
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
          // If the user does not have partner_group_id
          if (!request.auth.credentials.partner_group_id) {
            // If the user's partner id doesn't match the route
            if (partnerId !== request.auth.credentials.partner_id) {
              logger.error('Access Denied. Please contact meraki@navgurukul.org');
              return {
                error: true,
                message: `Access Denied. Please contact meraki@navgurukul.org if you think this is an error.`,
              };
            }
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
        return { count: data.count, partner_name: data.partner_name, students };
      },
    },
  },
  {
    method: 'PUT',
    path: '/partners/{partnerId}/merakiLink',
    options: {
      description: 'Create a bitly link for Meraki android app and Web app for a partner.',
      tags: ['api'],
      // Making this route open (So student's can easily download the meraki app by partner specific url)
      // auth: {
      //   strategy: 'jwt',
      //   scope: getRouteScope('partner'),
      // },
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
        logger.info(`Create a bitly link for Meraki android app and Web app for a partner`);
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
        scope: getRouteScope(['admin', 'partner', 'partner_edit']),
      },
      validate: {
        payload: Joi.object({
          email: Joi.string().required(),
        }),
        query: Joi.object({
          partner_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { partnerService } = request.services();
        // const partnerId = request.auth.credentials.partner_id;
        const partnerId = request.query.partner_id;
        const partnerUser = await partnerService.getPartnerUser(request.payload.email, partnerId);
        if (partnerId == null) {
          return {
            error: true,
            message: `Hey ${request.auth.credentials.name} you're partner_id is null, if you want to add a user then please login with a partner-specific link. Note:- you can see partner dashboard coz you have admin access as well.`,
          };
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
        scope: getRouteScope(['partner', 'partner_edit']),
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
        scope: getRouteScope(['partner', 'partner_edit']),
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
        let notRemoveAnPartnerUser;
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
          logger.info(`id- ${request.auth.credentials.id} Remove an user from the partner`);
          return removeAnPartnerUser;
          // eslint-disable-next-line
        } else {
          notRemoveAnPartnerUser = {
            error: `true`,
            message: `Admins/Partners/Volunteers cannot be removed`,
          };
          return notRemoveAnPartnerUser;
        }
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
        scope: getRouteScope('admin'),
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
  {
    method: 'GET',
    path: '/partners/{clusterId}/groups',
    options: {
      description: 'Get data for the partner cluster',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['partner', 'partner_view', 'partner_edit']),
      },
      validate: {
        params: Joi.object({
          clusterId: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { partnerService } = request.services();
        const { clusterId } = request.params;
        const [err, partnerGroupData] = await partnerService.getPartnerGroupData(clusterId);

        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${request.auth.credentials.id}, state partner_group data!`);
        return partnerGroupData;
      },
    },
  },
  {
    method: 'GET',
    path: '/partners/clusters',
    options: {
      description: 'Get all the clusters',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('partner'),
      },
      handler: async (request, h) => {
        const { partnerService } = request.services();
        const [err, clusters] = await partnerService.getAllClusters();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${request.auth.credentials.id}, Get all the clusters data`);
        return clusters;
      },
    },
  },

  {
    method: 'GET',
    path: '/partners/{partnerID}',
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
        const { partnerService } = request.services();
        const [err, data] = await partnerService.getPartnerThrowUserID(request.params.partnerID);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data[0];
      },
    },
  },





  {
    method: 'POST',
    path: '/partners/create',
    options: {
      description: 'Create the new partners.',
      tags: ['api'],
      auth: {
        strategy: 'jwt'
      },
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          contact_name: Joi.string().required(),
          email: Joi.string().email().required(),
          location: Joi.string(),
          use_for:Joi.string(),
        })
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [error, data] = await partnerService.createPartner(request.payload);
          if (error != null) {
            return { "Error": error }
          }
          return data

        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },

  {
    method: 'PUT',
    path: '/partners/{id}/update',
    options: {
      description: 'update the exist partner by id.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        // scope: getRouteScope(['admin','partner_edit']),
      },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().greater(0)
        }),
        payload: Joi.object({
          name: Joi.string(),
          contact_name: Joi.string(),
          email: Joi.string().email().allow(null),
          created_at: Joi.date(),
          location: Joi.string(),
          use_for:Joi.string(),
          status: Joi.string().default("Newly Onboarded"),
        })
      } 
    },
    handler: async (request, h) => {
      try {
        let { partnerService } = request.services()
        const { id } = request.params;
        const partnerData = request.payload;
        const [error, data] = await partnerService.updatePartner(id, partnerData);
        if (error != null) {
          
          return { "Error": error }
        }
        return data
      } catch (err) {
        logger.error(JSON.stringify(err));
        return h.response(err).code(err.code);
      }
    }
  },
  {
    method: 'DELETE',
    path: '/partners/{userId}',
    options: {
      description: 'Delete the partner by id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        // scope: getRouteScope(['partner', 'partner_edit']),
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
        let notRemoveAnPartnerUser;
        const [err, deleted] = await partnerService.deletePartner(userId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (deleted === 1) {
          removeAnPartnerUser = {
            status: `success`,
            message: `Yep, tata bye bye!!! userid is ${userId} removed successfully!`,
          };
          logger.info(`id- ${request.auth.credentials.id} Remove an user from the partner`);
          return removeAnPartnerUser;
          // eslint-disable-next-line
        } else {
          notRemoveAnPartnerUser = {
            error: `true`,
            message: deleted,
          };
          return notRemoveAnPartnerUser;
        }
      },
    },
  },
  {
    method: 'GET',
    path: '/partners/allPartners',
    options: {
      description: 'get the all partners data',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const { partnerService } = request.services();
        const [errorInpartnerData, partnerData] = await partnerService.getAllPartners();
        if (errorInpartnerData) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return partnerData;
      },
    },
  }
];
