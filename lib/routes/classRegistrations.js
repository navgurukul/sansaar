const Joi = require('@hapi/joi');
const ClassRegistrations = require('../models/classRegistrations');
const Classes = require('../models/classes');
const User = require('../models/user');

module.exports = [
  {
    method: 'GET',
    path: '/classes/{userId}',
    options: {
      description: 'Gets a list of all classes user registered to',
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
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        payload: Joi.object({
          user_id: ClassRegistrations.field('user_id'),
          registered_at: ClassRegistrations.field('registered_at'),
          feedback: ClassRegistrations.field('feedback'),
          feedback_at: ClassRegistrations.field('feedback_at'),
        }),
      },
      handler: async (request) => {
        const { classRegistrationsService } = request.services();
        const { classId } = request.params;
        const payload = { ...request.payload, class_id: classId };
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
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        payload: Joi.object({
          user_id: ClassRegistrations.field('user_id'),
        }),
      },
      handler: async (request) => {
        const { classRegistrationsService } = request.services();
        const { classId } = request.params;
        return classRegistrationsService.removeRegistrationById(classId, request.payload);
      },
    },
  },
];
