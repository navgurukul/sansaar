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
];


