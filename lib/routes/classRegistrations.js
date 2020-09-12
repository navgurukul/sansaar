const Joi = require('@hapi/joi');
const ClassRegistrations = require('../models/classRegistrations');
const Classes = require('../models/classes');
const User = require('../models/user');
const { getRouteScope } = require('./helpers');

module.exports = [
  {
    method: 'GET',
    path: '/classes',
    options: {
      description: 'Gets a list of all classes user registered to',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('classAdmin'),
      },
      handler: async (request) => {
        const { classRegistrationsService, displayService } = request.services();
        const userId = request.auth.credentials.id;
        const classes = await classRegistrationsService.getClassesByUserId(userId);
        return { classes: await displayService.getClasses(classes) };
      },
    },
  },
  {
    method: 'GET',
    path: '/classes/user/{userId}',
    options: {
      description:
        'Gets a list of all classes a particular user registered to ( Meant for dashboard admin )',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
      },
      handler: async (request) => {
        const { classRegistrationsService, displayService } = request.services();
        const { userId } = request.params;
        const classes = await classRegistrationsService.getClassesByUserId(userId);
        return { classes: await displayService.getClasses(classes) };
      },
    },
  },
  {
    method: 'POST',
    path: '/classes/{classId}/register',
    options: {
      description: 'Registers to a specific class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        payload: Joi.object({
          feedback: ClassRegistrations.field('feedback').optional(),
          feedback_at: ClassRegistrations.field('feedback_at').optional(),
        }),
      },
      handler: async (request) => {
        const { classRegistrationsService } = request.services();
        const { classId } = request.params;
        const userId = request.auth.credentials.id;
        const payload = {
          ...request.payload,
          user_id: userId,
          class_id: classId,
          registered_at: new Date(),
        };
        return classRegistrationsService.registerToClassById(payload);
      },
    },
  },
  {
    method: 'DELETE',
    path: '/classes/{classId}/unregister',
    options: {
      description: 'Cancel registration to a specific class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
      },
      handler: async (request) => {
        const { classRegistrationsService } = request.services();
        const { classId } = request.params;
        const userId = request.auth.credentials.id;
        return classRegistrationsService.removeRegistrationById(classId, userId);
      },
    },
  },
];
