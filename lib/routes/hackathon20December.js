/* eslint-disable prefer-destructuring */
const Joi = require('@hapi/joi');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');

module.exports = [
    {
        method: 'POST',
        path: '/hackathon20December/SIGNUP',
        options: {
            tags: ['api'],
            validate: {
                payload: Joi.object({
                    name: Joi.string().required(),
                    email: Joi.string().email().required(),
                    password: Joi.string().required(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { hackathon20DecemberService } = request.services();
                    const [err, data] = await hackathon20DecemberService.createHackathonSignup(request.payload);
                    if (err) {
                        logger.error(JSON.stringify(err));
                        return h.response(err).code(err.code);
                    }
                    return data;
                } catch (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
            },
        }
    },
    {
        // create a login api for hackathon
        method: 'POST',
        path: '/hackathon20December/LOGIN',
        options: {
            tags: ['api'],
            validate: {
                payload: Joi.object({
                    email: Joi.string().email().required(),
                    password: Joi.string().required(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { hackathon20DecemberService } = request.services();
                    const [err, data] = await hackathon20DecemberService.createHackathonLogin(request.payload);
                    if (err) {
                        logger.error(JSON.stringify(err));
                        return h.response(err).code(err.code);
                    }
                    return data;
                } catch (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
            },
        },
    },
]