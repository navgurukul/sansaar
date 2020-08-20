const Joi = require('@hapi/joi');
const User = require('../models/user');
const { getRouteScope } = require('./helpers');
const Pathway = require('../models/pathway');

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
          pathwayIds: Joi.array().items(Pathway.field('id')),
        }),
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        await userService.findById(request.params.userId);

        const { userId } = request.params;
        const { pathwayIds } = request.payload;

        const addPathwaysAndFetchUser = async (txn) => {
          await userService.addPathways(userId, pathwayIds, txn);
          return userService.findById(userId, txn);
        };

        const user = await h.context.transaction(addPathwaysAndFetchUser);

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
          pathwayIds: Joi.array().items(Pathway.field('id')),
        }),
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        await userService.findById(request.params.userId);

        const { userId } = request.params;
        const { pathwayIds } = request.payload;

        const removePathwaysAndFetchUser = async (txn) => {
          await userService.removePathways(userId, pathwayIds, txn);
          return userService.findById(userId, txn);
        };

        const user = await h.context.transaction(removePathwaysAndFetchUser);

        return { user: await displayService.userProfile(user) };
      },
    },
  },
];
