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

    {
        method: 'POST',
        path: '/c4ca/team',
        options: {
            description: 'create team - team size must be between 2 to 6',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                payload: Joi.object({
                    team_name: Joi.string().required(),
                    team_size: Joi.number().integer().greater(2).less(6).required(),
                    team_members: Joi.array().items(Joi.string()),
                })
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const user_id = request.auth.credentials.id;
                if (request.payload.team_members.length !== request.payload.team_size) {
                    return h.response({ msg: 'team size and team members count should be same and must be in between 2 to 6' }).code(400);
                }
                const [err, resp] = await c4caService.createTeam(request.payload, user_id);
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
        path: '/c4ca/teams/{teacher_id}',
        options: { 
            description: 'get teams by teacher id',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
          validate: {
            params: Joi.object({
                teacher_id: Joi.number().integer().required(),
            }),
          },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.getTeamsByTeacherId(request.params.teacher_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
                return resp;
            }
        }
    }
];
