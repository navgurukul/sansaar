/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
    {
        method: 'POST',
        path: '/analytics',
        options: {
            description: 'create for analytics',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                payload: Joi.object({
                    page_url: Joi.string().required(),
                    durations: Joi.number().integer().greater(0),
                    page_title: Joi.string().required(),
                })
            },
            handler: async (request, h) => {
                const { analytics } = request.services();
                const user_id = request.auth.credentials.id;
                const [err, resp] = await analytics.pushNow(request.payload, user_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            },
        },
    },
    {
        method: 'GET',
        path: '/analytics/all',
        options: {
            description: 'create for analytics',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            handler: async (request, h) => {
                const { analytics } = request.services();
                const [err, resp] = await analytics.getData();
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            },
        },
    },
    {
        method: 'GET',
        path: '/analytics/{user_id}',
        options: {
            description: 'create for analytics',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                params: Joi.object({
                    user_id: Joi.number().integer().greater(0).required(),
                })
            },
            handler: async (request, h) => {
                const { analytics } = request.services();
                const user_id = request.params.user_id;
                const [err, resp] = await analytics.getDataByID(user_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            },
        },
    },
    {
        method: 'PUT',
        path: '/analytics/{id}',
        options: {
            description: 'create for analytics',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                payload: Joi.object({
                    page_url: Joi.string(),
                    durations: Joi.number().integer().greater(0),
                    page_title: Joi.string(),
                }),
                params: Joi.object({
                    id: Joi.number().integer().greater(0).required(),
                })
            },
            handler: async (request, h) => {
                const { analytics } = request.services();
                const [err, resp] = await analytics.getDataByData(request.params.id,request.payload);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            },
        },
    },
    {
        method: 'POST',
        path: '/user/data',
        options: {
            description: 'create for analytics',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                payload: Joi.object({
                    name: Joi.string().required(),
                    email: Joi.email().required(),
                })
            },
            handler: async (request, h) => {
                const { analytics } = request.services();
                const [err, resp] = await analytics.createUser(request.payload);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            },
        },
    },
    {
        method: 'GET',
        path: '/analytics/user/{userId}',
        options: {
            description: 'create for analytics',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate:{
                params: Joi.object({
                    userId: Joi.number().integer().greater(0).required(),
                })
            },
            handler: async (request, h) => {
                const { analytics } = request.services();
                const [err, resp] = await analytics.getDataUser(request.params.userId);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            },
        },
    },
    {
        method: 'POST',
        path: '/analytics/session',
        options: {
            description: 'create for analytics',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                payload: Joi.object({
                    session_name: Joi.string().required(),
                    durations: Joi.number().integer().greater(0),
                    user_id: Joi.number().integer().greater(0),
                    start_time: Joi.string(),
                    end_time: Joi.string(),  
                })
            },
            handler: async (request, h) => {
                const { analytics } = request.services();
                const [err, resp] = await analytics.creteSession(request.payload);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            },
        },
    },
    {
        method: 'GET',
        path: '/analytics/session/{id}',
        options: {
            description: 'create for analytics',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                params: Joi.object({
                    id: Joi.number().integer().greater(0).required(),
                })
            },
            handler: async (request, h) => {
                const { analytics } = request.services();
                const id = request.params.id;
                const [err, resp] = await analytics.getSessionDataByID(id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            },
        },
    },
    {
        method: 'POST',
        path: '/analytics/events',
        options: {
            description: 'create for analytics',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                payload: Joi.object({
                    event_name: Joi.string().required(),
                    durations: Joi.number().integer().greater(0),
                    start_time: Joi.string(),
                    end_time: Joi.string(), 
                    view_page_id:Joi.number().integer().greater(0),
                    session_id:Joi.number().integer().greater(0),
                    user_id: Joi.number().integer().greater(0),
                })
            },
            handler: async (request, h) => {
                const { analytics } = request.services();
                const [err, resp] = await analytics.createEvent(request.payload);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            },
        },
    },
    {
        method: 'GET',
        path: '/analytics/events/{id}',
        options: {
            description: 'create for analytics',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                params: Joi.object({
                    id: Joi.number().integer().greater(0).required(),
                })
            },
            handler: async (request, h) => {
                const { analytics } = request.services();
                const id = request.params.id;
                const [err, resp] = await analytics.getEvent(id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            },
        },
    }
]