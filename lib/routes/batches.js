const Joi = require('@hapi/joi');
const logger = require('../../server/logger');
const { getRouteScope } = require('./helpers');
const { UTCToISTConverter } = require('../helpers/index');

module.exports = [
  {
    method: 'GET',
    path: '/batches/{pathwayId}',
    options: {
      description:
        'Gets a list of all upcoming, ongoing batches and doubt_classes with pagination.',
      tags: ['api'],
      validate: {
        query: Joi.object({
          page: Joi.number().required(),
          limit: Joi.number().required(),
          typeOfClass: Joi.string().valid('batch', 'doubt_class').default('batch'),
        }),
        params: Joi.object({
          pathwayId: Joi.number().required(),
        }),
      },
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      handler: async (request, h) => {
        try {
          const { batchesService } = request.services();
          const { page, limit, typeOfClass } = request.query;
          const { pathwayId } = request.params;
          let user_id = request.auth.credentials.id;

          const [err, batches] = await batchesService.getAllPartnerBatch(
            page,
            limit,
            pathwayId,
            typeOfClass,
            user_id
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

  {
    method: 'GET',
    path: '/batches/classes/{recruiterId}',
    options: {
      description: 'Gets a list of all upcoming classes.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin']),
      },
      validate: {
        params: Joi.object({
          recruiterId: Joi.number().required(),
        }),
      },
      handler: async (request, h) => {
        const { batchesService, displayService } = request.services();
        try {
          const { recruiterId } = request.params;
          let user_id = request.auth.credentials.id;
          const { scope } = request.auth.credentials;

          // get classes of the particular batch
          const [err, classes] = await batchesService.getAllBatchClasses(recruiterId);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          const data = await displayService.upcomingClassesWithEnrolledKey(classes, user_id, scope);
          logger.info('Gets a batch classes');
          return data;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },

  {
    method: 'GET',
    path: '/users/EnrolledBatches',
    options: {
      description: 'Gets a list of all upcoming classes in a pathways',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const {
          pathwayServiceV2,
          batchesService
        } = request.services();

        const [err, pathways] = await pathwayServiceV2.pathwaysNames();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        function determineBatchStatus(batchStart, batchEnd) {
          const currentTime = new Date();
        
          if (currentTime < batchStart) {
            return 'upcoming';
          } else if (currentTime >= batchStart && currentTime <= batchEnd) {
            return 'running';
          } else {
            return 'completed';
          }
        }
        // default date of 2019 1 1 now to give all the upcoming classes
        const defaultDate = UTCToISTConverter(new Date(2019, 0, 1));
        const allClasses = [];
        
        for (const pathway of pathways) {
          const [err, classes] = await batchesService.getAllPartnerBatch(1, 100, pathway.id, 'batch', request.auth.credentials.id, defaultDate);
        
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
        
          const allEnrolledClasses = classes.batches.filter((batch) => batch.enroled === true).map((batch) => {
            batch.status = determineBatchStatus(UTCToISTConverter(new Date(batch.batch_start)),UTCToISTConverter(new Date(batch.batch_end)));
            return batch;
          });
          allClasses.push(...allEnrolledClasses);
        }
        
        return h.response(allClasses).code(200) ;
      },
    },
  },
];
