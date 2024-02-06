/* eslint-disable prefer-destructuring */
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
    method: 'POST',
    path: '/partners/{group_id}/addstudent',
    options: {
      description: 'Add the student  to the  batch by group_id.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        payload: Joi.array().items(
          Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            group_id: Joi.number().integer().required(),
            partner_id: Joi.number().integer().required(),
          })
        ),
      },
      handler: async (request, h) => {
        const { partnerService } = request.services();
        const group_id = request.payload[0].group_id;
        const partner_id = request.payload[0].partner_id;
        const partnerUser = await partnerService.arrayCall(request.payload, group_id, partner_id);
        // if (spaceID == null) {
        //   return {
        //     error: true,
        //     message: `Hey ${request.auth.credentials.name} you're partner space is null, if you want to add a user then please login with a partner-specific link. Note:- you can see partner dashboard coz you have admin access as well.`,
        //   };
        // }
        try {
          logger.info(` Added a user`);
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
        logger.info(` updated a user`);
        return userUpdated;
      },
    },
  },

  {
    method: 'DELETE',
    path: '/partners/{user_id}/user',
    options: {
      description: 'Remove an user from the partner (Not deleting from the db)',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      //   scope: getRouteScope(['partner', 'partner_edit']),
      // },
      validate: {
        params: Joi.object({
          user_id: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { partnerService } = request.services();
        const { user_id } = request.params;
        let removeAnPartnerUser;
        let notRemoveAnPartnerUser;
        const [err, deleted] = await partnerService.removeAndUserFromPartner(user_id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (deleted === 1) {
          removeAnPartnerUser = {
            status: `success`,
            message: `Yaay! user removed successfully!`,
          };
          logger.info(`Yaay! user removed successfully!`);
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
        try {
          const { partnerService } = request.services();
          const [err, data] = await partnerService.getPartnerThrowPartnerID(
            request.params.partnerID
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
  },

  // partners create ====>>>
  {
    method: 'POST',
    path: '/partners/create/newpartner',
    options: {
      description: 'Create the new partner.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          point_of_contact_name: Joi.string(),
          email: Joi.string().email(),
          phone_number: Joi.string()
            .min(7)
            .max(15)
            .pattern(
              /^(?:\+?\d{1,3}[\s-]?)?(?:\d{10}|\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}|\(\d{1,4}\)[\s-]?\d{6,10}|\d{1,4}[\s-]?\d{6,10})$/
            )
            .optional(),
          platform: Joi.string().valid('meraki', 'c4ca').default('meraki').required(),
        }),
        
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, data] = await partnerService.createPartner(request.payload);
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
    path: '/partners/{partner_id}',
    options: {
      description: 'update the exist partner by id.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        params: Joi.object({
          partner_id: Joi.number().integer().greater(0).required(),
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
        const { partnerService } = request.services();
        const { partner_id } = request.params;
        const partnerData = request.payload;
        const [err, data] = await partnerService.updatePartner(partner_id, partnerData);
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
    path: '/partners/{partner_id}',
    options: {
      description: 'Delete the partner by id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        params: Joi.object({
          partner_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const { partner_id } = request.params;
          const [err] = await partnerService.deletePartner(partner_id);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return {
            status: `success`,
            message: `Yep, tata bye bye!!! partner is ${partner_id} removed successfully!`,
          };
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },

  // new space API
  // exist partner can create the newspace with this API
  {
    method: 'POST',
    path: '/partners/create/newspace',
    options: {
      description: 'Create the new space.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        query: Joi.object({
          partner_id: Joi.number().integer().greater(0).required(),
        }),
        payload: Joi.object({
          space_name: Joi.string().required(),
          point_of_contact_name: Joi.string(),
          email: Joi.string().email().allow(null),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, data] = await partnerService.createPartnerNewSpace(
            request.query.partner_id,
            request.payload
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
  },

  {
    method: 'PUT',
    path: '/partners/space/{space_id}',
    options: {
      description: 'update the exist partner space  by space_id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        params: Joi.object({
          space_id: Joi.number().integer().greater(0).required(),
        }),
        payload: Joi.object({
          space_name: Joi.string().required(),
          point_of_contact_name: Joi.string(),
          email: Joi.string().email().allow(null),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, Data] = await partnerService.updatePartnerSpace(
            request.params.space_id,
            request.payload
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },
  {
    method: 'GET',
    path: '/partners/space/{partner_id}',
    options: {
      description: 'get the space  data by the partner_id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin', 'partner']),
      },
      validate: {
        params: Joi.object({
          partner_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, Data] = await partnerService.getPartnerSpaceByPartnerID(
            request.params.partner_id
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },
  {
    method: 'GET',
    path: '/partners/spaceby/{space_id}',
    options: {
      description: 'get the all partners data',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin', 'partner']),
      },
      validate: {
        params: Joi.object({
          space_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, Data] = await partnerService.getPartnerSpaceBySpaceid(
            request.params.space_id
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },
  {
    method: 'DELETE',
    path: '/partners/space/{space_id}',
    options: {
      description: 'Delete the partner space by space_id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        params: Joi.object({
          space_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, Data] = await partnerService.deletePartnerSpace(request.params.space_id);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },

  {
    method: 'GET',
    path: '/partners/students/{group_id}',
    options: {
      description: 'get the students by the group id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin', 'partner']),
      },
      validate: {
        params: Joi.object({
          group_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, Data] = await partnerService.getStudentsByGroupID(request.params.group_id);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },
  // {
  //   method: 'DELETE',
  //   path: '/partners/{userId}/user',
  //   options: {
  //     description: 'Remove an user from the partner (Not deleting from the db)',
  //     tags: ['api'],
  //     auth: {
  //       strategy: 'jwt',
  //       // scope: getRouteScope(['partner', 'partner_edit']),
  //     },
  //     validate: {
  //       params: Joi.object({
  //         userId: Joi.number().integer(),
  //       }),
  //     },
  //     handler: async (request, h) => {
  //       const { partnerService } = request.services();
  //       const { userId } = request.params;
  //       let removeAnPartnerUser;
  //       const [err, deleted] = await partnerService.removeAndUserFromPartner(userId);
  //       if (err) {
  //         logger.error(JSON.stringify(err));
  //         return h.response(err).code(err.code);
  //       }
  //       if (deleted === 1) {
  //         removeAnPartnerUser = {
  //           status: `success`,
  //           message: `Yaay! ${userId} user removed successfully!`,
  //         };
  //       }
  //       logger.info(`Remove an user from the partner`);
  //       return removeAnPartnerUser;
  //     },
  //   },
  // },

  {
    method: 'DELETE',
    path: '/partners/students',
    options: {
      description: 'Removing the student from the partner group by the email',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        query: Joi.object({
          email: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, Data] = await partnerService.removeTheStudentFromGroup(request.query.email);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },

  {
    method: 'POST',
    path: '/partners/create/group',
    options: {
      description: 'partner create the new group.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        query: Joi.object({
          space_id: Joi.number().integer().greater(0).required(),
        }),
        payload: Joi.object({
          group_name: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, data] = await partnerService.createGroup(
            request.query.space_id,
            request.payload
          );
          if (err != null) {
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
    path: '/partners/group/{group_id}',
    options: {
      description: 'update the exist space group  by group_id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        params: Joi.object({
          group_id: Joi.number().integer().greater(0).required(),
        }),
        payload: Joi.object({
          group_name: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const update_data = request.payload;
          const [err, Data] = await partnerService.updateGroup(
            request.params.group_id,
            update_data
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },

  {
    method: 'DELETE',
    path: '/partners/group/{group_id}',
    options: {
      description: 'Delete the space group by group_id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        params: Joi.object({
          group_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, Data] = await partnerService.deleteGroup(request.params.group_id);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },

  {
    method: 'GET',
    path: '/partners/{space_id}/group',
    options: {
      description: 'get the groups  data by the space_id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin', 'partner']),
      },
      validate: {
        params: Joi.object({
          space_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, Data] = await partnerService.getGroupByspaceID(request.params.space_id);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },

  {
    method: 'GET',
    path: '/partners/groupBy/{group_id}',
    options: {
      description: 'get the groups data by the group_id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin', 'partner']),
      },
      validate: {
        params: Joi.object({
          group_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, Data] = await partnerService.getGroupByGroupID(request.params.group_id);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data; 
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },
  {
    method: 'GET',
    path: '/partner/{partner_id}',
    options: {
      description: 'With the partner_id. you will get spaces,groups and students data',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          partner_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) =>  {
        try {
          const { partnerService } = request.services();
          const [err, Data] = await partnerService.getPartnerTotalData(request.params.partner_id);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },
  {
    method: 'POST',
    path: '/partner/students/upload',
    options: {
      payload: {
        output: 'file',
        multipart: true,
      },
      description:
        'Bulk data uploading the students data to the database with the help of group_id',
      notes: 'file-upload',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      plugins: {
        'hapi-swagger': {
          payloadType: 'form',
        },
      },
      validate: {
        payload: Joi.object({
          file: Joi.any().meta({ swaggerType: 'file' }).description('file'),
          group_id: Joi.number().integer().required(),
          partner_id: Joi.number().integer().required(),
        }),
      },
    },
    // eslint-disable-next-line consistent-return
    handler: async (request, h) => {
      const { partnerService } = request.services();
      try {
        const { file, group_id, partner_id } = request.payload;
        if (!file) {
          return h.response({ message: 'No file uploaded' }).code(400);
        }
        let data;
        const filePath = file.path;
        const typeOfFile = file.filename.split('.');
        // eslint-disable-next-line eqeqeq
        if (typeOfFile[1] == 'csv') {
          data = await partnerService.extractDataFromCsv(filePath, group_id, partner_id);
          // eslint-disable-next-line eqeqeq
        } else if (typeOfFile[1] == 'xlsx') {
          data = await partnerService.extractDataFromXlsx(filePath, group_id, partner_id);
        } else {
          return h
            .response({
              message:
                'you trying to uploade the wrong formate file. try only google sheet, csv or xl',
            })
            .code(403);
        }
        // eslint-disable-next-line eqeqeq
        if (data[0].error == true) {
          const err = data[0];
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
          // eslint-disable-next-line eqeqeq
        }
        // eslint-disable-next-line eqeqeq
        if (data.length != 0) {
          const [err, fileCrpt] = await partnerService.returnCsvFile(data);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return fileCrpt;
        }
      } catch (error) {
        return h.response({ error: error.message }).code(500);
      }
    },
  },
  {
    method: 'GET',
    path: '/student/{email}',
    options: {
      description: ' it will check the email is exist or not data',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin', 'partner']),
      },
      validate: {
        params: Joi.object({
          email: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const [err, Data] = await partnerService.studentsSearchEmail(request.params.email);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },
  {
    method: 'PUT',
    path: '/partner/group/link',
    options: {
      description: 'Create a bitly link for Meraki android app and Web app for a partner.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        query: Joi.object({
          partner_id: Joi.number().integer().required(),
          space_id: Joi.number().integer().required(),
          group_id: Joi.number().integer().required(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { partnerService } = request.services();
        const { partner_id, space_id, group_id } = request.query;
        logger.info(`Create a bitly link for Meraki android app and Web app for a partner`);
        const [err, outPut] = await partnerService.groupSpecificLinkAuto(
          partner_id,
          space_id,
          group_id
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return outPut;
      },
    },
  },
  {
    method: 'GET',
    path: '/partners/batches/{group_id}',
    options: {
      description: 'get the batch details by the group_id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin', 'partner']),
      },
      validate: {
        params: Joi.object({
          group_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const { group_id } = request.params;
          const [err, Data] = await partnerService.getClsByGroupId(group_id);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },

  {
    method: 'GET',
    path: '/partners/batch_details/{recurring_id}',
    options: {
      description: 'get the batch details by the recurring_id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin', 'partner']),
      },
      validate: {
        params: Joi.object({
          recurring_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const { recurring_id } = request.params;
          const [err, Data] = await partnerService.getBatchesDataByRecurringId(recurring_id);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },
  {
    method: 'PUT',
    path: '/partners',
    options: {
      description: "Asign ID's to the users",
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        query: Joi.object({
          partner_id: Joi.number().integer().optional(),
          space_id: Joi.number().integer().optional(),
          group_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { partnerService } = request.services();
          const { partner_id, space_id, group_id } = request.query;
          const [err, Data] = await partnerService.AsignIdToUsers(partner_id, space_id, group_id);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return Data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  }
];
