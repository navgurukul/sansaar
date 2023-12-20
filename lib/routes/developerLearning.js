/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
    {
        method: 'POST',
        path: '/developers/create',
        options: {
            description: 'create developer',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                payload: Joi.object({
                    name: Joi.string(),
                    email: Joi.string().email(),
                    role: Joi.string(),
                    education: Joi.string(),
                    skills: Joi.string(),
                    experience: Joi.string(),
                    programming_languages: Joi.string(),
                    resonal_language: Joi.string(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { developerLearning } = request.services();
                    const data = await developerLearning.createDeveloper(request.payload);
                    logger.info('developer created successfully')
                    return h.response(data).code(200);
                } catch (error) {
                    logger.error(error);
                    return h.response({ error: 'Internal Server Error' }).code(500);
                }
            },
        },
    },
];
