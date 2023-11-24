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
                id: Joi.number().integer().greater(0),
                recurring_id: Joi.number().integer().greater(0).allow(null),
              })),
            }),
          },
          handler: async (request, h) => {
            let {id,email} = request.auth.credentials;
            const { youtubeBroadCastService } = request.services();
            
            let [err,res] = await youtubeBroadCastService.createLiveBroadcast(
              id, 
              email,
              request.payload.classes
            );
            if (err){
              return h.response(err).code(err.code);
            }
            return h.response(res).code(200);
          },
        },
    },
    {
      method: 'PUT',
      path: '/youtubeBroadcast',
      options: {
        description: 'Update the youtube broadcast.',
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
              class_id: Joi.number().integer().greater(0),
            })),
          }),
        },
        handler: async (request, h) => {
          const {  youtubeBroadCastService } = request.services();
          let {id,email} = request.auth.credentials;
          let [err,res]= await youtubeBroadCastService.updateLiveBroadcast(id,email, request.payload.classes);
          if (err){
            return h.response(err).code(err.code);
          }
          return h.response(res).code(200);
        },
      },
    },
    {
      method: 'GET',
      path: '/youtubeBroadcast/{recurring_id}',
      options: {
        description: 'Update the youtube broadcast.',
        tags: ['api'],
        auth: {
          strategy: 'jwt',
        },
        validate: {
          params: Joi.object({
            recurring_id: Joi.number().integer().greater(0),
          }),
        },
        handler: async (request, h) => {
          const {  youtubeBroadCastService } = request.services();
          console.log(request.params.recurring_id,'<<<<<<<<<<<<<<<<<<<<<<<<');
          let [err,res]= await youtubeBroadCastService.gettingLiveBroadcast(request.params.recurring_id);
          if (err){
            return h.response(err).code(err.code);
          }
          return h.response(res).code(200);
        },
      },
    },
    {
      method: 'DELETE',
      path: '/youtubeBroadcast/{recurring_id}/{class_id}',
      options: {
        description: 'Update the youtube broadcast.',
        tags: ['api'],
        auth: {
          strategy: 'jwt',
        },
        validate: {
          params: Joi.object({
            recurring_id: Joi.number().integer().greater(0),
            class_id: Joi.number().integer().greater(0),
          }),
        },
        handler: async (request, h) => {
          const {  youtubeBroadCastService } = request.services();
          let {id,email} = request.auth.credentials;
          let [err,res]= await youtubeBroadCastService.deleteBroadcast(id,email, request.params.recurring_id,request.params.class_id);
          if (err){
            return h.response(err).code(err.code);
          }
          return h.response(res).code(200);
        },
      },
    },
];
