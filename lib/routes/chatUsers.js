const Joi = require('@hapi/joi');
const { async } = require('crypto-random-string');
// const User = require('../models/user');

module.exports = [
  {
    method: 'GET',
    path: '/chat/users',
    options: {
      description: 'Get all chat users',
      tags: ['api'],
      validate: {
        query: Joi.object({
          deactivated: Joi.boolean().default(false),
          dir: Joi.string().length(1).default('f'),
          guests: Joi.boolean().default(true),
          limit: Joi.number().default(10),
          order_by: Joi.string().default('id'),
        }),
      },
      handler: async (request) => {
        const { chatUsersService } = request.services();
        return chatUsersService.getAllUsers(request.query);
      },
    },
  },
  {
    method: 'GET',
    path: '/chat/user/{userId}',
    options: {
      description: 'Get chat user details',
      tags: ['api'],
      validate: {
        params: Joi.object({
          userId: Joi.string().pattern(/^@([a-z0-9])+:(navgurukul.org)$/),
        }),
      },
      handler: async (request) => {
        const { chatUsersService } = request.services();
        return chatUsersService.getUser(request.params.userId);
      },
    },
  },
  {
    method: 'POST',
    path: '/chat/user/create',
    options: {
      description: 'Create a new user in chat',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          displayName: Joi.string().min(6),
          id: Joi.string().pattern(/^@([a-z0-9])+:(navgurukul.org)$/),
          password: Joi.string().min(8),
          threepids: Joi.array(),
        }),
      },
      handler: async (request) => {
        const { chatUsersService } = request.services();
        return chatUsersService.createChatUser(request.payload);
      },
    },
  },
  {
    method: 'POST',
    path: '/chat/login',
    options: {
      description: 'User chat login',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request) => {
        const { chatUsersService } = request.services();
        return chatUsersService.userChatLogin(request.auth.credentials.id);
      },
    },
  },
];
