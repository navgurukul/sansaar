/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const Joi = require('@hapi/joi');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'GET',
    path: '/volunteers',
    options: {
      description: 'List of all volunteers in the system.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        // scope: getRouteScope('admin'),
      },
      validate: {
        query: Joi.object({
          from: Joi.string(),
          to: Joi.string(),
          status: Joi.string(),
          name: Joi.string(),
          lang: Joi.string(),
          class_title: Joi.string(),
          pathway: Joi.number().integer().valid(1, 2),
        }),
      },
      handler: async (request, h) => {
        const { userRoleService } = request.services();
        const [err, data] = await userRoleService.getAllVolunteers(
          request.query.from,
          request.query.to,
          request.query.status,
          request.query.name,
          request.query.lang,
          request.query.class_title,
          request.query.pathway
        );
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
    path: '/volunteers/count',
    options: {
      description: 'count of volunteers according to pathways',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      handler: async (request, h) => {
        const { userRoleService } = request.services();
        const [err, data] = await userRoleService.getVolunteersCountAccordingToPathways();
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
    path: '/volunteers/Automation',
    options: {
      description: 'add number and pathways of volunteer',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        payload: Joi.object({
          contact: Joi.string().regex(/^[0-9]{10}$/),
          pathway_id: Joi.array().items(Joi.number().integer().valid(1, 2, 7)),
          hours_per_week: Joi.number().integer(),
          available_on_days: Joi.array().items(
            Joi.string().valid('SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA')
          ),
          available_on_time: Joi.object({
            first_time: Joi.string(),
            second_time: Joi.string(),
            third_time: Joi.string(),
          }),
        }),
      },
      handler: async (request, h) => {
        const { userService, userRoleService } = request.services();
        const { payload } = request;
        const [err, user] = await userService.updateContactById(
          request.auth.credentials.id,
          payload.contact
        );
        const available_days = request.payload.available_on_days.join();
        const available_time = request.payload.available_on_time;
        const l = [];
        for (const key in available_time) {
          l.push(available_time[key]);
        }
        const time_list = l.join();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const details = {};
        details.user_id = request.auth.credentials.id;
        details.hours_per_week = payload.hours_per_week;
        details.available_on_days = available_days;
        // eslint-disable-next-line no-undef
        details.available_on_time = time_list;
        // eslint-disable-next-line
        for (const i of payload.pathway_id) {
          details.pathway_id = i;
          // eslint-disable-next-line no-unused-vars
          const [error, volunteer] = await userRoleService.createVolunteer(details);
          if (error) {
            logger.error(JSON.stringify(error));
            return h.response(error).code(error.code);
          }
        }
        return user;
      },
    },
  },
  {
    method: 'PUT',
    path: '/volunteers',
    options: {
      description: 'volunteer updation',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        payload: Joi.object({
          status: Joi.string().valid('onboarding', 'inactive', 'dropout', 'active'),
          user_id: Joi.array().items(Joi.number()).required(),
        }),
        options: { allowunknown: true },
      },
      handler: async (request, h) => {
        const { userRoleService } = request.services();
        const [err, store] = await userRoleService.updatevolunteer(request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return store;
      },
    },
  },

  {
    method: 'DELETE',
    path: '/volunteers',
    options: {
      description: 'volunteer delete',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        payload: Joi.object({
          volunteer_ids: Joi.array().items(Joi.number()).required(),
        }),
        options: { allowunknown: true },
      },
      handler: async (request, h) => {
        const { userRoleService } = request.services();
        const [err, store] = await userRoleService.deleteVolunteer(request.payload.volunteer_ids);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return store;
      },
    },
  },

  {
    method: 'GET',
    path: '/allVolunteers',
    options: {
      description: 'List of all users according to the volunteer userId.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const { userRoleService } = request.services();
        const [err, data] = await userRoleService.volunteerUser();
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
    path: '/volunteers/{contact}',
    options: {
      description: 'check whether the number entered by a Volunteer is already registered or not',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          contact: Joi.string()
            .min(7)
            .max(15)
            .pattern(/^(1-)?[1-9]{1,3}-\d{7,12}$/)
            .required()
        }),
      },
      handler: async (request, h) => {
        const { userRoleService } = request.services();
        const [err, store] = await userRoleService.CheckNumberRegisteredOrNot(
          request.auth.credentials.id,
          request.params.contact
          );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return store;
      },
    },
  },
];