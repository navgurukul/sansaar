const Joi = require('@hapi/joi');
const User = require('../models/user');

module.exports = [
  {
    method: 'POST',
    path: '/users/auth/google',
    options: {
      description: 'Generate JWT for sansaar using google idToken.',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          idToken: Joi.string().required(),
        }),
      },
      handler: async (request) => {
        const { userService } = request.services();
        const user = await userService.loginWithGoogle(request.payload.idToken);

        return { user };
      },
    },
  },
  {
    method: 'GET',
    path: '/users',
    options: {
      handler: async (request) => ({ underConstruction: 1 }),
    },
  },
  {
    method: 'GET',
    path: '/users/{userId}',
    options: {
      tags: ['api'],
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
      },
      handler: async (request) => {
        const { userService } = request.services();
        const user = await userService.findById(request.params.userId);

        return { user };
      },
    },
  },
  {
    method: 'GET',
    path: '/users/me',
    options: {
      handler: async (request) => ({ underConstruction: 1 }),
    },
  },
];
