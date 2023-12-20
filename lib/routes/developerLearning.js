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

    {
        method: 'POST',
        path: '/developers/courses/resource',
        options: {
            description: 'Create courses with its resource',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                payload: Joi.object({
                    course_name: Joi.string().required(),
                    course_url: Joi.string().regex(/^(https?|http):\/\/\S+$/).required(),
                    course_description: Joi.string(),
                    course_category: Joi.string(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { developerLearning } = request.services();
                    const data = await developerLearning.createResources(request.payload);
                    logger.info('course resource created successfully');
                    return h.response(data).code(200);
                } catch (error) {
                    logger.error(error);
                    return h.response({ error: 'Internal Server Error' }).code(500);
                }
            },
        },
    },

    {
        method: 'GET',
        path: '/developers/courses/all/resource',
        options: {
            description: 'Get all courses with its resource',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            handler: async (request, h) => {
                try {
                    const { developerLearning } = request.services();
                    const data = await developerLearning.getResources();
                    logger.info('Get course resources');
                    return h.response(data).code(200);
                } catch (error) {
                    logger.error(error);
                    return h.response({ error: 'Internal Server Error' }).code(500);
                }
            },
        },
    },

    {
        method: 'POST',
        path: '/developers/progress',
        options: {
            description: 'Capture developer progress',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                payload: Joi.object({
                    developers_resume_id: Joi.number().integer().greater(0).required(),
                    learning_resource_id: Joi.number().integer().greater(0).required(),
                    completed: Joi.boolean(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { developerLearning } = request.services();
                    const data = await developerLearning.createDeveloperProgressById(request.payload);
                    logger.info('progress captured successfully');
                    return h.response(data).code(200);
                } catch (error) {
                    logger.error(error);
                    return h.response({ error: 'Internal Server Error' }).code(500);
                }
            },
        },
    },

    {
        method: 'GET',
        path: '/developers/progress/{developerId}',
        options: {
          description: 'Get all courses with its resource',
          tags: ['api'],
          auth: {
            strategy: 'jwt',
          },
          validate: {
            params: Joi.object({
              developerId: Joi.number().integer(), 
            }),
          },
          handler: async (request, h) => {
            try {
              const { developerLearning } = request.services();
              const {developerId} = request.params; 
              const data = await developerLearning.getDeveloperProgressById(developerId);
              logger.info('Get developers progress');
              return h.response(data).code(200);
            } catch (error) {
              logger.error(error);
              return h.response({ error: 'Internal Server Error' }).code(500);
            }
          },
        },
      }
      
];
