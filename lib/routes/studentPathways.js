const Joi = require('@hapi/joi');
const User = require('../models/user');
const Pathways = require('../models/pathway');
const { getRouteScope } = require('./helpers');

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
        const { userService, displayService } = request.services();
        const [errInUser, userExists] = await userService.findById(request.params.userId);
        if (errInUser) {
          return errInUser;
        }

        const { userId } = request.params;
        const { pathwayIds } = request.payload;

        const addPathwaysAndFetchUser = async (txn) => {
          await userService.addPathways(userId, pathwayIds, txn);
          const [err, user] = await userService.findById(userId, txn);
          if (err) {
            return [err, null];
          }
          return [null, user];
        };

        const [err, user] = await h.context.transaction(addPathwaysAndFetchUser);
        if (err) {
          return err;
        }

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
        const { userService, displayService } = request.services();
        const [errInUser, userExists] = await userService.findById(request.params.userId);
        if (errInUser) return errInUser;

        const { userId } = request.params;
        const { pathwayIds } = request.payload;

        const removePathwaysAndFetchUser = async (txn) => {
          await userService.removePathways(userId, pathwayIds, txn);
          const [err, user] = await userService.findById(userId, txn);
          if (err) {
            return [err, null];
          }
          return [null, user];
        };

        const [err, user] = await h.context.transaction(removePathwaysAndFetchUser);
        if (err) {
          return err;
        }

        return { user: await displayService.userProfile(user) };
      },
    },
  },
];
