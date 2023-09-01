const Joi = require('@hapi/joi');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/user/signup',
    options: {
      description: 'Create a new user or (SIGN UP)',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          first_name: Joi.string().required(),
          last_name: Joi.string().required(),
          gender: Joi.string().required(),
          country: Joi.string(),
          password: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { hackathonUserService } = request.services();
        const [err, data] = await hackathonUserService.createNewUser(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },

  

  {
    method: 'POST',
    path: '/user/login',
    options: {
      description: '(LOGIN)',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          user_id: Joi.string().required(),
          password: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { hackathonUserService } = request.services();
        const [err, data] = await hackathonUserService.login(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },


  {
    method: 'GET',
    path: '/user/{user_id}',
    options: {
      description: 'Get user by user_id',
      tags: ['api'],
      validate: {
        params: Joi.object({
          user_id: Joi.string().required()
        }),
      },
      handler: async (request, h) => {
        const { hackathonUserService } = request.services();
        const [err, data] = await hackathonUserService.getUserByUserId(request.params.user_id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },
  // -----------------------------------------------------------------------------------------------------------------------------------
  // GTA Game

  {
    method: 'POST',
    path: '/user/gta_game/signup',
    options: {
      description: 'Create a new user or (SIGN UP)',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          first_name: Joi.string().required(),
          last_name: Joi.string().required(),
          gender: Joi.string().required(),
          country: Joi.string(),
          password: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { hackathonUserService } = request.services();
        const [err, data] = await hackathonUserService.gtacreateNewUser(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },


  {
    method: 'POST',
    path: '/user/gta_game/login',
    options: {
      description: '(LOGIN)',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          user_id: Joi.string().required(),
          password: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { hackathonUserService } = request.services();
        const [err, data] = await hackathonUserService.gtalogin(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },


  {
    method: 'GET',
    path: '/user/gta_game/{user_id}',
    options: {
      description: 'Get user by user_id',
      tags: ['api'],
      validate: {
        params: Joi.object({
          user_id: Joi.string().required()
        }),
      },
      handler: async (request, h) => {
        const { hackathonUserService } = request.services();
        const [err, data] = await hackathonUserService.gtagetUserByUserId(request.params.user_id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },


   // -----------------------------------------------------------------------------------------------------------------------------------
  // News App

  {
    method: 'POST',
    path: '/user/news_app/signup',
    options: {
      description: 'Create a new user or (SIGN UP)',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          first_name: Joi.string().required(),
          last_name: Joi.string().required(),
          gender: Joi.string().required(),
          country: Joi.string(),
          password: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { hackathonUserService } = request.services();
        const [err, data] = await hackathonUserService.newsAppCreateNewUser(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },


  {
    method: 'POST',
    path: '/user/news_app/login',
    options: {
      description: '(LOGIN)',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          user_id: Joi.string().required(),
          password: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { hackathonUserService } = request.services();
        const [err, data] = await hackathonUserService.newsAppLogin(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },


  {
    method: 'GET',
    path: '/user/news_app/{user_id}',
    options: {
      description: 'Get user by user_id',
      tags: ['api'],
      validate: {
        params: Joi.object({
          user_id: Joi.string().required()
        }),
      },
      handler: async (request, h) => {
        const { hackathonUserService } = request.services();
        const [err, data] = await hackathonUserService.newsAppGetUserByUserId(request.params.user_id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },

   // -----------------------------------------------------------------------------------------------------------------------------------
  // Talk Mitra

  {
    method: 'POST',
    path: '/user/talk_mitra/signup',
    options: {
      description: 'Create a new user or (SIGN UP)',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          first_name: Joi.string().required(),
          last_name: Joi.string().required(),
          gender: Joi.string().required(),
          country: Joi.string(),
          password: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { hackathonUserService } = request.services();
        const [err, data] = await hackathonUserService.talkMitraCreateNewUser(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },


  {
    method: 'POST',
    path: '/user/talk_mitra/login',
    options: {
      description: '(LOGIN)',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          user_id: Joi.string().required(),
          password: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { hackathonUserService } = request.services();
        const [err, data] = await hackathonUserService.talkMitraLogin(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },


  {
    method: 'GET',
    path: '/user/talk_mitra/{user_id}',
    options: {
      description: 'Get user by user_id',
      tags: ['api'],
      validate: {
        params: Joi.object({
          user_id: Joi.string().required()
        }),
      },
      handler: async (request, h) => {
        const { hackathonUserService } = request.services();
        const [err, data] = await hackathonUserService.talkMitraGetUserByUserId(request.params.user_id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },

];


