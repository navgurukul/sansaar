const Joi = require('@hapi/joi');
const logger = require('../../server/logger');
const { getRouteScope } = require('./helpers');

module.exports = [
  // up
  {
    method: 'GET',
    path: '/career/cluster-manager/{clusterManagerID}',
    options: {
      description: 'Get all teachers by cluster manager id.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          clusterManagerID: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { careerManagementService, CareerService } = request.services();
          const [err, data] = await careerManagementService.getClusterManagerBy(
            request.params.clusterManagerID
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return careerManagementService.responseWrapper(null, err.message);
        }
        const response_ = await CareerService.responseWrapper(data, "success");
        return response_;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },

  // up
  {
    method: 'POST',
    path: '/career/cluster-manager',
    options: {
      description: 'Create a new cluster manager.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        //scope: getRouteScope(['admin']),
      },
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          point_of_contact: Joi.string(),
          email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu'] } }).required(),
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
          const { careerManagementService } = request.services();
          const [err, data] = await careerManagementService.createClusterManager(request.payload);
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

  // up
  {
    method: 'PUT',
    path: '/career/cluster-manager/{clusterManagerID}',
    options: {
      description: 'Update the cluster manager by id.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        //scope: getRouteScope(['admin']),
      },
      validate: {
        params: Joi.object({
          c4ca_partner_id: Joi.number().integer().greater(0).required(),
        }),
        payload: Joi.object({
          name: Joi.string().required(),
          point_of_contact_name: Joi.string(),
          email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu'] } }).required(),
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
        const { careerManagementService } = request.services();
        const { clusterManagerID } = request.params;
        const managerData = request.payload;
        const [err, data] = await careerManagementService.clusterManagerUpdataBy(clusterManagerID, managerData);
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

  // up
  {
    method: 'DELETE',
    path: '/career/cluster-manager/{clusterManagerID}',
    options: {
      description: 'Delete the cluster manager by id.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        // scope: getRouteScope(['admin']),
      },
      validate: {
        params: Joi.object({
          clusterManagerID: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { careerManagementService } = request.services();
          const { clusterManagerID } = request.params;
          const [err] = await careerManagementService.deleteClusterManagerBy(clusterManagerID);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return {
            status: `success`,
            message: `Cluster manager ${clusterManagerID} removed successfully!`,
          };
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },


  // up
  {
    method: 'GET',
    path: '/career/admin',
    options: {
      description:
        'Get all the cluster managers and their associated facilitators. (admin view)',
      tags: ['api'],
      validate: {
        query: Joi.object({
          page: Joi.number().optional(),
          limit: Joi.number().optional(),
        })
      },
      auth: {
        strategy: 'jwt',
        // scope: getRouteScope(['careerAdmin']), // verify this
      },
      handler: async (request, h) => {
        try {
          const { careerManagementService } = request.services();
          const { page, limit } = request.query;
          console.log(page, limit,  '***')

          const [err, batches] = await careerManagementService.getAllClusterManagers(
            limit,
            page
            );

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

];
