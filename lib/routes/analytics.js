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
                console.log(request.payload, 'KKKKKKKKK')
                const [err, resp] = await analytics.pushNow(request.payload, user_id);
                if (err) {
                    console.log(err, 'EEEEEEEEE')
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
]