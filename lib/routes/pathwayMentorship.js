const Joi = require('@hapi/joi');
const Pathway = require('../models/pathway');
const User = require('../models/user');

module.exports = [
  {
    method: 'POST',
    path: '/pathway/{pathwayId}/mentorship/users/{userId}/mentees/add',
    options: {
      description: 'This description will appear in swagger.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['team', 'facha', 'dumbeldore', 'trainingAndPlacement'],
      },
      validate: {
        params: Joi.object({
          pathwayId: Pathway.field('id'),
          userId: User.field('id'),
        }),
        payload: Joi.object({
          menteeIds: Joi.array().items(User.field('id')),
        }),
      },
      handler: async (request) => {
        const { pathwayService, userService } = request.services();
        await pathwayService.findById(request.params.pathwayId);
        await userService.findById(request.params.userId);
      },
    },
  },
];
