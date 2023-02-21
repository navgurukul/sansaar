const Joi = require('@hapi/joi');
const { getRouteScope } = require('./helpers');
const botFunctions = require('../bot/actions');
const logger = require('../../server/logger');

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
        const { chatService } = request.services();
        logger.info('Get all chat users');
        return chatService.getAllUsers(request.query);
      },
    },
  },
  {
    method: 'GET',
    path: '/chat/users/{userId}',
    options: {
      description: 'Get chat user details',
      tags: ['api'],
      validate: {
        params: Joi.object({
          userId: Joi.string().pattern(/^@([a-z0-9])+:(navgurukul.org)$/),
        }),
      },
      handler: async (request) => {
        const { chatService } = request.services();
        logger.info('Get chat user details');
        return chatService.getUser(request.params.userId);
      },
    },
  },
  {
    method: 'POST',
    path: '/chat/users',
    options: {
      description: 'Create a new user in chat',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          displayName: Joi.string().min(6),
          id: Joi.string(),
          password: Joi.string().min(8),
          threepids: Joi.array(),
        }),
      },
      handler: async (request) => {
        const { chatService } = request.services();
        logger.info('Create a new user in chat');
        // return chatService.createChatUser(request.payload);
        return {}
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
        // const { chatService } = request.services();
        logger.info('User chat login');
        // return chatService.userChatLogin(request.auth.credentials.id);
        return []
      },
    },
  },
  {
    method: 'GET',
    path: '/chat/rooms',
    options: {
      description: 'Get Meraki chat rooms',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('classAdmin'),
      },
      handler: async (request) => {
        const { chatService } = request.services();
        const rooms = await chatService.getMerakiClassRooms();
        logger.info('Get Meraki chat rooms');
        return rooms;
      },
    },
  },
  {
    method: 'POST',
    path: '/chat/addUser/{roomId}',
    options: {
      description: 'Add users into Meraki chat rooms',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('classAdmin'),
      },
      validate: {
        params: Joi.object({
          roomId: Joi.string(),
        }),
        query: Joi.object({
          email: Joi.string().email(),
        }),
      },
      handler: async (request, h) => {
        const { userService, chatService } = request.services();
        const [err, user] = await userService.getUserByEmail(request.query.email);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (!user[0].chat_id) {
          logger.error(
            JSON.stringify({ error: true, message: 'User not found in matrix database' })
          );
          return h
            .response({ error: true, message: 'User not found in matrix database' })
            .code(404);
        }
        logger.info('Add users into Meraki chat rooms');
        // return chatService.addUsersToMerakiClass(
        //   request.params.roomId,
        //   `@${user[0].chat_id}:navgurukul.org`
        // );
      },
    },
  },
  {
    method: 'POST',
    path: '/chat/room',
    options: {
      description: 'Create Meraki chat rooms',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('classAdmin'),
      },
      validate: {
        payload: Joi.object({
          visibility: Joi.string().valid('public', 'private').required(),
          roomAliasName: Joi.string().optional(),
          name: Joi.string().required(),
          topic: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const data = await botFunctions.createARoom(request.payload);
        if (data.error) {
          logger.error(JSON.stringify(data.error));
          return h.response(data).code(data.code);
        }
        logger.info('Create Meraki chat rooms');
        return data;
      },
    },
  },
];
