/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const EnglishAiHistory = require('../models/englishAiHistory');
const logger = require('../../server/logger');
const EnglishAiContent = require('../models/englishAiContent');

module.exports = [
    {
        method: 'GET',
        path: '/englishAi/content/{level}',
        options: {
            description: 'Get english ai content by level',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                params: Joi.object({
                    level: Joi.number().integer().required(),
                }),
            },
            handler: async (request, h) => {
                const { EnglishAiService } = request.services();
                const [err, EnglishAiCont] = await EnglishAiService.getEnglishAiDataByLevel(
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
            auth: {
                strategy: 'jwt',
            },
            validate: {
                params: Joi.object({
                    id: Joi.number().integer().required(),
                }),
            },
            handler: async (request, h) => {
                const { EnglishAiService } = request.services();
                const [err, EnglishAiCont] = await EnglishAiService.getEnglishAiDataByid(id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return EnglishAiCont;
            },
        },
    },

];
