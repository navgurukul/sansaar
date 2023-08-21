/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
    {
        method: 'GET',
        path: '/englishAi/contentLevelWise/{level}',
        options: {
            description: 'Get english ai content by level',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                params: Joi.object({
                    level: Joi.number().integer().required(),
                }),
            },
            handler: async (request, h) => {
                const { englishAiService } = request.services();
                const [err, EnglishAiCont] = await englishAiService.getEnglishAiDataByLevel(
                    request.params.level
                );
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return EnglishAiCont;
            },
        },
    },

    {
        method: 'GET',
        path: '/englishAi/content/{id}',
        options: {
            description: 'Get english ai content by id',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                params: Joi.object({
                    id: Joi.number().integer().required(),
                }),
            },
            handler: async (request, h) => {
                const { englishAiService } = request.services();
                const [err, EnglishAiCont] = await englishAiService.getEnglishAiDataByid(request.params.id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return EnglishAiCont;
            },
        },
    },

    {
        method: 'GET',
        path: '/englishAi/history/{user_id}',
        options: {
            description: 'Get english ai history by user id',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                params: Joi.object({
                    user_id: Joi.number().integer().required(),
                }),
            },
            handler: async (request, h) => {
                const { englishAiService } = request.services();
                const [err, EnglishAiHist] = await englishAiService.getEnglishAiHistoryByUserId(
                    request.params.user_id
                );
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return EnglishAiHist;
            },
        },
    },

    {
        method: 'POST',
        path: '/englishAi/content',
        options: {
            description: 'Add english ai content',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                payload: Joi.object({
                    title: Joi.string().max(200).required(),
                    content: Joi.string(),
                    link: Joi.string(),
                    level: Joi.number().integer(),
                })
            },
            handler: async (request, h) => {
                const { englishAiService } = request.services();
                // console.log(request.payload)
                const [err, resp] = await englishAiService.addEnglishAiContent(
                    request.payload
                );
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
        path: '/englishAi/history',
        options: {
            description: 'Add english ai content history',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                payload: Joi.object({
                    english_ai_id: Joi.number().integer(),
                    user_id: Joi.number().integer(),
                    createdAt: Joi.date(),
                })
            },
            handler: async (request, h) => {
                const { englishAiService } = request.services();
                request.creadentials.user_id = 109
                const [err, resp] = await englishAiService.addEnglishAiContentHistory(
                    request.payload
                );
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            },
        },
    },

];
