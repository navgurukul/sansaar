/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
    {
        method: 'POST',
        path: '/c4ca/teacher_profile',
        options: {
            payload: {
                maxBytes: 104857600,
                parse: true,
                output: 'stream',
                allow: ['multipart/form-data'],
                multipart: true,
            },
            description: 'setup teacher profile',
            notes: 'File-upload',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            plugins: {
                'hapi-swagger': {
                    payloadType: 'form',
                },
            },
            validate: {
                payload: Joi.object({
                    name: Joi.string().required(),
                    school: Joi.string().required(),
                    district: Joi.string().required(),
                    state: Joi.string().required(),
                    phone_number: Joi.string().regex(/^[0-9]{10}$/).required(),
                    email: Joi.string().required(),
                    profile_url: Joi.any().meta({ swaggerType: 'file' }).description('file').required(),

                })
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const user_id = request.auth.credentials.id;
                const { profile_url } = request.payload;
                const { partner_id } = request.auth.credentials;
                const [err, resp] = await c4caService.setTeacherProfile(profile_url, request.payload, user_id, partner_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                const response_ = await c4caService.responseWrapper(resp, "success");
                return response_;
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
                    team_name: Joi.string().min(3).default('Avengers').required(),
                    team_size: Joi.number().integer().greater(2).less(6).required(),
                    team_members: Joi.array().items(Joi.object({
                        name: Joi.string().required(),
                        class: Joi.number().required(),
                    })),
                })
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const user_id = request.auth.credentials.id;

                const [errTeacher, teacher] = await c4caService.checkIfTeacher(user_id);

                if (errTeacher) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                if (teacher) {
                    const [err, resp] = await c4caService.createTeam(request.payload, user_id);
                    if (err) {
                        logger.error(JSON.stringify(err));
                        return c4caService.responseWrapper(null, err.message);
                    }
                    const [err_, resp_] = await c4caService.addStudentsToTeam(request.payload, resp.teacher_id, resp.id);
                    if (err_) {
                        logger.error(JSON.stringify(err_));
                        return c4caService.responseWrapper(null, err.message);
                    }
                    const response_ = await c4caService.responseWrapper({ ...resp, team_members: resp_ }, "success")
                    return response_;
                }
                return "you are not a valid teacher";
            },
        },
    },

    {
        method: 'PUT',
        path: '/c4ca/teacher/update/{teacher_id}',
        options: {
            description: 'update teacher profile',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                params: Joi.object({
                    teacher_id: Joi.number().integer().required(),
                }),
                payload: Joi.object({
                    name: Joi.string().required(),
                    school: Joi.string().required(),
                    district: Joi.string().required(),
                    state: Joi.string().required(),
                    phone_number: Joi.string().regex(/^[0-9]{10}$/).required(),
                    email: Joi.string().required(),
                    profile_url: Joi.string().required(),
                    partner_id: Joi.number().integer().required(),
                })
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const user_id = request.auth.credentials.id;
                const [err, resp] = await c4caService.updateTeacherProfile(request.payload, request.params.teacher_id, user_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return resp;
            }
        }
    },

    // ****work on this*****
    {
        method: 'DELETE',
        path: '/c4ca/teacher/delete/{teacher_id}',
        options: {
            description: 'delete teacher profile',
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
                const user_id = request.auth.credentials.id;
                const [err, resp] = await c4caService.deleteTeacherProfile(request.params.teacher_id, user_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return resp;
            }
        }
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
                    return c4caService.responseWrapper(null, err.message);
                }
                return resp;
            }
        }
    },

    {
        method: 'GET',
        path: '/c4ca/team/{team_id}',
        options: {
            description: 'get team details by team id',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                params: Joi.object({
                    team_id: Joi.number().integer().required(),
                }),
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.getTeamByTeamId(request.params.team_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                const response_ = await c4caService.responseWrapper(resp, 'success')
                return response_;
            }
        }
    },


    {
        method: 'PUT',
        path: '/c4ca/team/update/{team_id}',
        options: {
            description: 'update team details by team id',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                params: Joi.object({
                    team_id: Joi.number().integer().required(),
                }),
                payload: Joi.object({
                    team_name: Joi.string().min(3).default('Avengers').required(),
                    team_size: Joi.number().integer().greater(2).less(6).required(),
                })
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                // const user_id = request.auth.credentials.id;
                const [err, resp] = await c4caService.updateTeamById(request.payload, request.params.team_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return resp;
            },
        },
    },

    {
        method: 'GET',
        path: '/c4ca/teacher_Data',
        options: {
            description: 'get teacher data',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const user_id = request.auth.credentials.id;
                const [err, resp] = await c4caService.getTeacherData(user_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                if (resp === undefined) return c4caService.responseWrapper(null, 'teacher not found');
                const response_ = await c4caService.responseWrapper(resp, "success");
                return response_;
            }
        }
    },

    {
        method: 'DELETE',
        path: '/c4ca/team/delete/{team_id}',
        options: {
            description: 'delete team',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                params: Joi.object({
                    team_id: Joi.number().integer().required(),
                }),
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.deleteTeam(request.params.team_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                const response_ = await c4caService.responseWrapper(resp, "success");
                return response_;
            }
        }
    },

    // {
    //     method:'POST',
    //     path:'/c4ca/projectUpload',
    //     options:{
    //         payload:{
    //             maxBytes: 104857600,
    //             parse: true,
    //             output: 'stream',
    //             allow: ['multipart/form-data'],
    //             multipart: true, 
    //         },
    //         description:'upload project in s3',
    //         notes:'File Upload',
    //         tags:['api'],
    //         auth:{
    //             strategy:'jwt',
    //         },
    //         plugins: {
    //             'hapi-swagger': {
    //               payloadType: 'form',
    //             },
    //           },
    //         validate:{
    //             payload:Joi.object({
    //                 project_title: Joi.string().required(),
    //                 project_summary: Joi.string().required(),
    //                 project_uploadFile: Joi.any().meta({ swaggerType: 'file' }).description('file').required(),
    //             }),
    //         },
    //         handler:async(request,h)=>{
    //             const {c4caService}=request.services();
    //         //    uplaod project_uploadFile in s3
    //             const [err,resp]=await c4caService.uploadProject(request.payload.project_uploadFile);
    //             if(err){
    //                 logger.error(JSON.stringify(err));
    //                 return h.response(err).code(err.code);
    //             }
    //             return resp;
    //         }
    //     }
    // },

    {
        method: 'POST',
        path: '/c4ca/team/login',
        options: {
            description: 'Login team by id and password',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                payload: Joi.object({
                    login_id: Joi.string().required(),
                    password: Joi.string().required(),
                })
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.loginTeam(request.payload);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                const token = await c4caService.createToken({ id: resp.id, teacher_id: resp.teacher_id, flag: 'c4ca' });
                const out_ = await c4caService.responseWrapper({
                    ...resp,
                    flag: 'c4ca',
                    token: token.token
                }, 'success')
                return out_;
            },
        },
    },


];
