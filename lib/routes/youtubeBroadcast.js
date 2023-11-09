/* eslint-disable eqeqeq */
const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const _ = require('lodash');
// const { getEditableRoles, getRouteScope } = require('./helpers');


module.exports = [
    {
        method: 'POST',
        path: '/youtubeBroadcast/schedule', // Fixed typo in the path
        options: {
          description: 'Youtube broadCast live schedule.',
          tags: ['api'],
          auth: {
            strategy: 'jwt',
          },
          validate: {
            payload: Joi.object({
              classes: Joi.array().items(Joi.object({
                title: Joi.string().required(),
                description: Joi.string().required(),
                start_time: Joi.string().required(),
                end_time: Joi.string().required(),
                // class_id: Joi.number().integer().greater(0)
              })),
            }),
          },
          handler: async (request, h) => {
            let {id,email} = request.auth.credentials
            const { youtubeBroadCastService, CalendarService } = request.services();
            let oauth2Client = await CalendarService.setCalendarCredentials(id,email)        
            let res = await youtubeBroadCastService.createLiveBroadcast(
              oauth2Client,
              request.payload.classes
            );
            return h.response(res).code(200);
          },
        },
    },
    {
      method: 'PUT',
      path: '/youtubeBroadcast/{video_id}',
      options: {
        description: 'Update the youtube broadcast.',
        tags: ['api'],
        auth: {
          strategy: 'jwt',
        },
        validate: {
          params: Joi.object({
            video_id: Joi.number().integer().greater(0),
            class_id: Joi.number().integer().greater(0)
          }),
          payload: Joi.object({
            class: Joi.object({
              title: Joi.string(),
              description: Joi.string(),
              start_time: Joi.string(),
              end_time: Joi.string(),
            }),
          }),
        },
        handler: async (request, h) => {
          const {  youtubeBroadCastService, CalendarService } = request.services();
          let oauth2Client = await CalendarService.setCalendarCredentials(id,email)        
          let res = await youtubeBroadCastService.updateLiveBroadcast(oauth2Client, request.query, request.class);
          return h.response(res).code(200);
        },
      },
    },
];
