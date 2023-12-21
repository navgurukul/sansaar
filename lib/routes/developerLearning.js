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
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                payload: Joi.object({
                    name: Joi.string(),
                    email: Joi.string().email(),
                    password: Joi.string(),
                    role: Joi.string(),
                    education: Joi.string(),
                    intrests: Joi.array(),
                    skills: Joi.array(),
                    experience: Joi.string(),
                    programming_languages: Joi.string(),
                    known_framworks: Joi.array(),
                    resonal_language: Joi.string(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { developerLearning } = request.services();
                    const info = request.payload;
                    const data = await developerLearning.createDeveloper(info);
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
            // auth: {
            //     strategy: 'jwt',
            // },
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
            // auth: {
            //     strategy: 'jwt',
            // },
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
            // auth: {
            //     strategy: 'jwt',
            // },
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
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                params: Joi.object({
                    developerId: Joi.number().integer(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { developerLearning } = request.services();
                    const { developerId } = request.params;
                    const data = await developerLearning.getDeveloperProgressById(developerId);
                    logger.info('Get developers progress');
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
        path: '/developers/{developerId}/profile',
        options: {
            description: 'Get developer profile',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                params: Joi.object({
                    developerId: Joi.number().integer(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { developerLearning } = request.services();
                    const { developerId } = request.params;
                    const data = await developerLearning.developerProfile(developerId);
                    logger.info('Get developers profile');
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
    path: '/developers/recommended/courses/{developerId}',
    options: {
      description: 'Get developer recommended courses based on their profile',
      tags: ['api'],
      // auth: {
      //     strategy: 'jwt',
      // },
      validate: {
        params: Joi.object({
          developerId: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { developerLearning } = request.services();
          
          let interests = await developerLearning.interestsDeveloper(request.params.developerId)

          let res = [];
          for (let ser of interests) {
            const array = await developerLearning.courseLinks(ser);
            let div_num = parseInt(array.length / interests.length);
            // for (let i = array.length - 1; i > 0; i--) {
            //   const j = Math.floor(Math.random() * (i + 1));
            //   [array[i], array[j]] = [array[j], array[i]];
            // }
            const firstFive = array.slice(0, div_num); // Get the first five elements
            res.push(...firstFive);
          }
          return h.response(res).code(200);
        } catch (error) {
          logger.error(error);
          return h.response({ error: 'Internal Server Error' }).code(500);
        }
      },
    },
  },

  // login api
  {
    method: 'GET',
    path: '/developers/login/{email}/{password}',
    options: {
        description: 'Get developer profile',
        tags: ['api'],
        // auth: {
        //     strategy: 'jwt',
        // },
        validate: {
            params: Joi.object({
                email: Joi.string().email(),
                password: Joi.string(),
            }),
        },
        handler: async (request, h) => {
            try {
                const { developerLearning } = request.services();
                const data = await developerLearning.developerLogin(request.params);
                return h.response(data).code(200);
            } catch (error) {
                logger.error(error);
                return h.response({ error: 'Internal Server Error' }).code(500);
            }
        },
    },
    },
];
