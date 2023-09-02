/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
    {
        method: 'POST',
        path: '/c4ca/teacher_profile',
        options: {
            description: 'setup teacher profile',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                payload: Joi.object({
                    name: Joi.string().required(),
                    school: Joi.string().required(),
                    district: Joi.string().required(),
                    state: Joi.string().required(),
                    partner_id: Joi.number().integer().required(),
                })
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const user_id = request.auth.credentials.id;
                const [err, resp] = await c4caService.setTeacherProfile(request.payload, user_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            },
        },
    },
];
