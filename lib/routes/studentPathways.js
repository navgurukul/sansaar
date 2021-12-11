const Joi = require('@hapi/joi');
const User = require('../models/user');
const Pathways = require('../models/pathway');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/users/{userId}/pathways',
    options: {
      description: 'Mark user as member of the given pathways.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
        payload: Joi.object({
          pathwayIds: Joi.array().items(Pathways.field('id')),
        }),
      },
      handler: async (request, h) => {
        const { pathwayService, userService, displayService } = request.services();
        // eslint-disable-next-line
        const [errInUser, userExists] = await userService.findById(request.params.userId);
        if (errInUser) {
          logger.error(JSON.stringify(errInUser));
          return h.response(errInUser).code(errInUser.code);
        }

        const { userId } = request.params;
        const { pathwayIds } = request.payload;

        const addPathwaysAndFetchUser = async (txn) => {
          // eslint-disable-next-line
          const [errInAddingPathway, pathwayAdded] = await pathwayService.addPathways(
            userId,
            pathwayIds,
            txn
          );
          if (errInAddingPathway) return [errInAddingPathway, null];
          const [err, user] = await userService.findById(userId, txn);
          if (err) {
            logger.error(JSON.stringify(err));
            return [err, null];
          }
          return [null, user];
        };

        const [err, user] = await h.context.transaction(addPathwaysAndFetchUser);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Mark user as member of the given pathways');
        return { user: await displayService.userProfile(user) };
      },
    },
  },
  {
    method: 'DELETE',
    path: '/users/{userId}/pathways',
    options: {
      description: 'Remove the membership of a user from the given pathways.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
        payload: Joi.object({
          pathwayIds: Joi.array().items(Pathways.field('id')),
        }),
      },
      handler: async (request, h) => {
        const { pathwayService, userService, displayService } = request.services();
        // eslint-disable-next-line
        const [errInUser, userExists] = await userService.findById(request.params.userId);
        if (errInUser) {
          logger.error(JSON.stringify(errInUser));
          return h.response(errInUser).code(errInUser.code);
        }
        const { userId } = request.params;
        const { pathwayIds } = request.payload;

        const removePathwaysAndFetchUser = async (txn) => {
          // eslint-disable-next-line
          const [errInRemovingPathway, pathwayRemoved] = await pathwayService.removePathways(
            userId,
            pathwayIds,
            txn
          );
          if (errInRemovingPathway) {
            logger.error(JSON.stringify(errInRemovingPathway));
            return [errInRemovingPathway, null];
          }
          const [err, user] = await userService.findById(userId, txn);
          if (err) {
            logger.error(JSON.stringify(err));
            return [err, null];
          }
          return [null, user];
        };

        const [err, user] = await h.context.transaction(removePathwaysAndFetchUser);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`UserId ${userId} Remove the membership of a user from the given pathways`);
        return { user: await displayService.userProfile(user) };
      },
    },
  },
];
