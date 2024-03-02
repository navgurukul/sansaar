/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
    {
        method: 'GET',
        path: '/englishAi/content/today',
        options: {
            description: 'Get all english ai content',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            handler: async (request, h) => {
                const { englishAiService } = request.services();
                const [err, resp] = await englishAiService.getCurrentArticle();
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
        path: '/englishAi/history',
        options: {
            description: 'Get english ai history by user id',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            handler: async (request, h) => {
                const { englishAiService } = request.services();
                const [err, EnglishAiHist] = await englishAiService.getEnglishAiHistoryByUser(
                    request.auth.credentials.id
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
            description: 'Add english ai content automatically - not really',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            // validate: {
            //     payload: Joi.object({
            //         title: Joi.string().max(200).required(),
            //         content: Joi.string(),
            //         link: Joi.string(),
            //         level: Joi.number().integer(),
            //     })
            // },
            handler: async (request, h) => {
                const { englishAiService } = request.services();
                const [err, resp] = await englishAiService.addEnglishAiContent();
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
                query: Joi.object({
                    english_ai_id: Joi.number().integer().required(),
                }),
            },
            handler: async (request, h) => {
                const { englishAiService } = request.services();
                const user_id = request.auth.credentials.id;
                const [err, resp] = await englishAiService.addEnglishAiContentHistory(
                    request.query.english_ai_id,
                    user_id
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
