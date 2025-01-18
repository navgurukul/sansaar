/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const _ = require('lodash');
const logger = require('../../server/logger');

module.exports = [
    // up
    {
        method: 'POST',
        path: '/career/teacher',
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
                    name: Joi.string().min(3).max(100).required(),
                    school: Joi.string().min(3).max(100).required(),
                    district: Joi.string().min(3).max(100).required(),
                    state: Joi.string().min(2).max(100).required(),
                    phone_number: Joi.string().regex(/^[0-9]{10}$/).required(),
                    email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu'] } }).required(),
                    profile_url: Joi.any().meta({ swaggerType: 'file' }).description('file').optional(),
                })
            },
            handler: async (request, h) => {
                const { careerService } = request.services();
                const user_id = request.auth.credentials.id;
                const { profile_url } = request.payload;
                const { cluster_manager_id } = request.auth.credentials;
                if (cluster_manager_id !== null && cluster_manager_id !== undefined) {
                    const [err, resp] = await careerService.setTeacherProfile(profile_url, request.payload, user_id, cluster_manager_id);
                    if (err) {
                        logger.error(JSON.stringify(err));
                        return careerService.responseWrapper(null, err.message);
                    }
                    const response_ = await careerService.responseWrapper(resp, "success");
                    return response_;
                }
                return careerService.responseWrapper(null, "partner id is not present");
            },
        },
    },

    {
        method: 'POST',
        path: '/career/team',
        options: {
            description: 'create team - team size must be between 2 to 6',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                payload: Joi.object({
                    team_name: Joi.string().min(3).required(),
                    team_size: Joi.number().integer().greater(2).less(6).required(),
                    team_members: Joi.array().items(Joi.object({
                        name: Joi.string().required(),
                        class: Joi.number().required(),
                    })),
                    school: Joi.string().required(),
                    district: Joi.string().required(),
                    state: Joi.string().required(),
                })
            },
            handler: async (request, h) => {
                const { careerService } = request.services();
                const user_id = request.auth.credentials.id;

                const [errTeacher, teacher] = await careerService.checkIfTeacher(user_id);

                if (errTeacher) {
                    logger.error(JSON.stringify(err));
                    return careerService.responseWrapper(null, err.message);
                }
                if (teacher) {
                    const [err, resp] = await careerService.createTeam(request.payload, user_id);
                    if (err) {
                        logger.error(JSON.stringify(err));
                        return careerService.responseWrapper(null, err.message);
                    }
                    const [err_, resp_] = await careerService.addStudentsToTeam(request.payload, resp.teacher_id, resp.id);
                    if (err_) {
                        logger.error(JSON.stringify(err_));
                        return careerService.responseWrapper(null, err.message);
                    }
                    const response_ = await careerService.responseWrapper({ ...resp, team_members: resp_ }, "success")
                    return response_;
                }
                return careerService.responseWrapper(null, "you are not a valid teacher");
            },
        },
    },

    // up
    {
        method: 'PUT',
        path: '/career/teacher/{teacher_id}',
        options: {
            payload: {
                maxBytes: 104857600,
                parse: true,
                output: 'stream',
                allow: ['multipart/form-data'],
                multipart: true,
            },
            description: 'update teacher profile',
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
                    name: Joi.string().min(3).max(100).required(),
                    school: Joi.string().min(3).max(100).required(),
                    district: Joi.string().min(3).max(100).required(),
                    state: Joi.string().min(2).max(100).required(),
                    phone_number: Joi.string().regex(/^[0-9]{10}$/).required(),
                    email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu'] } }).required(),
                    profile_url: Joi.any().meta({ swaggerType: 'file' }).description('file').optional(),
                })
            },
            handler: async (request, h) => {
                const { careerService } = request.services();
                const user_id = request.auth.credentials.id;
                const [err, resp] = await careerService.updateTeacherProfile(request.payload, request.params.teacher_id, user_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return careerService.responseWrapper(null, err.message);
                }
                return resp;
            }
        }
    },


    {
        method: 'DELETE',
        path: '/career/teacher/{teacher_id}',
        options: {
            description: 'delete career teacher profile',
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
                const { careerService } = request.services();
                const user_id = request.auth.credentials.id;
                const [err, resp] = await careerService.deleteTeacherProfile(request.params.teacher_id, user_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return careerService.responseWrapper(null, err.message);
                }
                return careerService.responseWrapper(resp, "success");
            }
        }
    },


    {
        method: 'GET',
        path: '/career/teams/{teacher_id}',
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
                const { careerService } = request.services();
                const [err, resp] = await careerService.getTeamsByTeacherId(request.params.teacher_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return careerService.responseWrapper(null, err.message);
                }
                return careerService.responseWrapper(resp, "success");
            }
        }
    },


    {
        method: 'GET',
        path: '/career/teacher/teams/{teacher_id}',
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
                const { careerService } = request.services();
                const [err, resp] = await careerService.getTeamsWithTopicByTeacherId(request.params.teacher_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return careerService.responseWrapper(null, err.message);
                }
                return careerService.responseWrapper(resp, "success");
            }
        }
    },

    {
        method: 'GET',
        path: '/career/team/{team_id}',
        options: {
            description: 'get team details by team id',
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
                const { careerService } = request.services();
                const [err, resp] = await careerService.getTeamByTeamId(request.params.team_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return careerService.responseWrapper(null, err.message);
                }
                const response_ = await careerService.responseWrapper(resp, 'success')
                return response_;
            }
        }
    },

    {
        method: 'GET',
        path: '/career/team',
        options: {
            description: 'get team details logied in team',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const token = request.headers.authorization;
                const { team_id } = request.auth.credentials;
                const [err, resp] = await c4caService.getTeamByTeamId(team_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                resp.flag = 'c4ca';
                const response_ =  c4caService.responseWrapper(resp, 'success')
                response_.token = token || null;

                return response_;
            }
        }
    },


    {
        method: 'PUT',
        path: '/career/team/update/{team_id}',
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
                    team_name: Joi.string().min(3).optional(),
                    team_size: Joi.number().integer().greater(2).less(6),
                    team_members: Joi.array().items(Joi.object({
                        name: Joi.string(),
                        class: Joi.number(),
                    })),
                }),
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.updateTeamById(request.payload, request.params.team_id);
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
        method: 'GET',
        path: '/career/teacher_Data',
        options: {
          description: 'Get teacher data',
          tags: ['api'],
          auth: {
            strategy: 'jwt',
          },
          handler: async (request, h) => {
            const { c4caService } = request.services();
            const user_id = request.auth.credentials.id;
            try {
              const [err, resp] = await c4caService.getTeacherData(user_id);
              if (err) {
                logger.error(JSON.stringify(err));
                return c4caService.responseWrapper(null, err.message);
              }
              if (resp === null) {
                return c4caService.responseWrapper(null, 'Teacher not found');
              }
              const response_ = await c4caService.responseWrapper(resp, 'success');
              return response_;
            } catch (error) {
              logger.error(JSON.stringify(error));
              return c4caService.responseWrapper(null, 'Internal Server Error');
            }
          },
        },
      },

    {
        method: 'DELETE',
        path: '/career/team/delete/{team_id}',
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

    {
        method: 'POST',
        path: '/career/team/login',
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
                if (resp) {
                    const token = await c4caService.createToken({ id: resp.id, teacher_id: resp.teacher_id, flag: 'c4ca' });
                    const out_ = await c4caService.responseWrapper({
                        ...resp,
                        flag: 'c4ca',
                        token: token.token
                    }, 'success')
                    return out_;
                }
                return c4caService.responseWrapper(null, 'login id or password incorrect')
            },
        },
    },



    // Facilitator

    {
        method: 'GET',
        path: '/career/facilitator/getAll',
        options: {
            description: 'Get all facilitator',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                query: Joi.object({
                    limit: Joi.number().integer().optional(),
                    page: Joi.number().integer().optional(),
                }),
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.getAllFacilitator(request.query.limit, request.query.page);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(resp, "success");
            },
        },
    },

    {
        method: 'GET',
        path: '/career/facilitator/getById/{id}',
        options: {
            description: 'Get facilitator by id',
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
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.getFacilitatorById(request.params.id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(resp, "success");
            },
        },
    },

    {
        method: 'PUT',
        path: '/career/facilitator/update/{id}',
        options: {
            description: 'update facilitator details by id',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                params: Joi.object({
                    id: Joi.number().integer().required(),
                }),
                payload: Joi.object({
                    name: Joi.string().required(),
                    point_of_contact: Joi.string(),
                    email: Joi.string().email().required(),
                    c4ca_partner_id: Joi.number().integer().required(),
                    phone_number: Joi.string().regex(/^[0-9]{10}$/),
                })
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.updateFacilitatorById(request.payload, request.params.id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(resp, "success");
            },
        },
    },

    {
        method: 'DELETE',
        path: '/career/facilitator/delete/{id}',
        options: {
            description: 'delete facilitator by id',
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
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.deleteFacilitatorById(request.params.id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(resp, "success");
            },
        },
    },

    {
        method: 'GET',
        path: '/career/facilitator/getByPartnerId/{partner_id}',
        options: {
            description: 'Get facilitators data by partner id',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                params: Joi.object({
                    partner_id: Joi.number().integer().required(),
                }),
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.getFacilitatorByPartnerId(request.params.partner_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(resp, "success");
            },
        },
    },

    {
        method: 'GET',
        path: '/career/teams',
        options: {
            description: 'Get facilitators data by partner id',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                query: Joi.object({
                    district: Joi.string().optional(),
                    school: Joi.string().optional(),
                }),
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.getTeamsByDistrictOrSchool(request.query.district, request.query.school);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(resp, "success");
            },
        },
    },

    {
        method: 'GET',
        path: '/career/teacher/{facilitator_id}',
        options: {
            description: 'Get all teachers data by facilitator_id',
            tags: ['api'],
            // auth: {
            //     strategy: 'jwt',
            // },
            validate: {
                params: Joi.object({
                    facilitator_id: Joi.string().required(),
                }),
                query: Joi.object({
                    page: Joi.number().optional(),
                    limit: Joi.number().optional(),
                }),
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.getTeachersByFacilitator(request.params.facilitator_id,
                    request.query.page, request.query.limit);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(resp, "success");
            },
        },
    },

    {
        method: 'GET',
        path: '/career/{teacher_id}',
        options: {
            description: 'get partner name -> facilitator name -> teacher name by teacher id',
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
                const {teacher_id} = request.params;
                const [err, resp] = await c4caService.getTeacherById(teacher_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                if (resp === undefined) return c4caService.responseWrapper(null, 'teacher not found');
                const response_ = await c4caService.responseWrapper(resp, 'success')
                return response_;
            }
        }
    },

];
