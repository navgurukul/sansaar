const Joi = require('@hapi/joi');
// const Teacher = require('../models/teacher');

// const Pathways = require('../models/pathway');
const Teacher_registration = require('../models/teachers_reg');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/teachers/registation',
    options: {
      description: 'Using for creating the teachers registation',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      //   scope: getRouteScope('team'),
      // },
      validate: {
          payload: Joi.object({
            name: Joi.string(),
            email: Joi.string(),
            contact_no: Joi.number().integer(),
            status: Joi.string(),
            // photo:Joi.string()
          })
      },
      handler: async (request, h) => {
        console.log(request.payload);
        const { userService, displayService } = request.services();
        console.log(request.params)
        await Teacher_registration.query().insert(request.params);
        console.log('sending the data')
        // Teacher_reg
        // const { userId } = request.params;

        
        return { user: NaN };
      },
    },
  },
  {
    method: 'GET',
    path: '/teachers/registation/{email}',
    options: {
      description: 'checking the email is exit or not!',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      //   scope: getRouteScope('team'),
      // },
      validate: {
        params: Joi.object({
          email: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        console.log(request.params);
        // const { pathwayService, userService, displayService } = request.services();
        // // eslint-disable-next-line
        // const [errInUser, userExists] = await userService.findById(request.params.userId);
        
        return { user: NaN };
      },
    },
  },
  {
    method: 'PUT',
    path: '/teachers/registation/{email}',
    options: {
      description: 'checking the email is exit or not!',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      //   scope: getRouteScope('team'),
      // },
      validate: {
        params: Joi.object({
          email: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        console.log(request.params);
        // const { pathwayService, userService, displayService } = request.services();
        // // eslint-disable-next-line
        // const [errInUser, userExists] = await userService.findById(request.params.userId);
        
        return { user: NaN };
      },
    },
  },
  {
    method: 'DELETE',
    path: '/teachers/registation/{email}',
    options: {
      description: 'checking the email is exit or not!',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      //   scope: getRouteScope('team'),
      // },
      validate: {
        params: Joi.object({
          email: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        console.log(request.params);
        // const { pathwayService, userService, displayService } = request.services();
        // // eslint-disable-next-line
        // const [errInUser, userExists] = await userService.findById(request.params.userId);
        
        return { user: NaN };
      },
    },
  },
]