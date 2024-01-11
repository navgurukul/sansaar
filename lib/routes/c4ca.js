/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const _ = require('lodash');
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
                    profile_url: Joi.any().meta({ swaggerType: 'file' }).description('file').optional(),
                })
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const user_id = request.auth.credentials.id;
                const { profile_url } = request.payload;
                const { c4ca_partner_id, c4ca_facilitator_id } = request.auth.credentials;
                if (c4ca_partner_id !== null && c4ca_partner_id !== undefined) {
                    const [err, resp] = await c4caService.setTeacherProfile(profile_url, request.payload, user_id, c4ca_partner_id, c4ca_facilitator_id);
                    if (err) {
                        logger.error(JSON.stringify(err));
                        return c4caService.responseWrapper(null, err.message);
                    }
                    const response_ = await c4caService.responseWrapper(resp, "success");
                    return response_;
                }
                return c4caService.responseWrapper(null, "partner id is not present");
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
                return c4caService.responseWrapper(null, "you are not a valid teacher");
            },
        },
    },

    {
        method: 'PUT',
        path: '/c4ca/teacher/update/{teacher_id}',
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
                params: Joi.object({
                    teacher_id: Joi.number().integer().required(),
                }),
                payload: Joi.object({
                    name: Joi.string().optional(),
                    school: Joi.string().optional(),
                    district: Joi.string().optional(),
                    state: Joi.string().optional(),
                    phone_number: Joi.string().regex(/^[0-9]{10}$/).optional(),
                    email: Joi.string().optional(),
                    profile_url: Joi.any().meta({ swaggerType: 'file' }).description('file').optional(),
                    // partner_id: Joi.number().integer().optional(),
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
                return c4caService.responseWrapper(resp, "success");
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
                return c4caService.responseWrapper(resp, "success");
            }
        }
    },


    {
        method: 'GET',
        path: '/c4ca/teacher/teams/{teacher_id}',
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
                const [err, resp] = await c4caService.getTeamsWithTopicByTeacherId(request.params.teacher_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(resp, "success");
            }
        }
    },

    {
        method: 'GET',
        path: '/c4ca/team/{team_id}',
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
        method: 'GET',
        path: '/c4ca/team',
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
        path: '/c4ca/teacher_Data',
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
        path: '/c4ca/facilitator/getAll',
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
        path: '/c4ca/facilitator/getById/{id}',
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
        path: '/c4ca/facilitator/update/{id}',
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
        path: '/c4ca/facilitator/delete/{id}',
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
        path: '/c4ca/facilitator/getByPartnerId/{partner_id}',
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
        path: '/c4ca/teams',
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
        path: '/c4ca/teacher/{facilitator_id}',
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
        method: 'POST',
        path: '/c4ca/projectTopic/{module_id}',
        options: {
            payload: {
                maxBytes: 104857600,
                parse: true,
                output: 'stream',
                allow: ['multipart/form-data'],
                multipart: true,
            },
            description: 'upload project topic in s3',
            notes: 'File Upload',
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
                params: Joi.object({
                    module_id: Joi.number().required(),
                }),
                payload: Joi.object({
                    project_title: Joi.string().optional(),
                    project_summary: Joi.string(),
                    project_topic: Joi.any().meta({ swaggerType: 'file' }).description('file').optional(),
                    is_submitted: Joi.boolean().default(false),
                }),
            },
            handler: async (request, h) => {
                // console.log(request.auth.credentials, '^^^^^^^^6')
                const { c4caService } = request.services();
                const {team_id} = request.auth.credentials;
                const {project_title} = request.payload;
                const {project_summary} = request.payload;
                const {is_submitted} = request.payload;
                const {module_id} = request.params
                //    uplaod project_uploadFile in s3
                const [err, resp] = await c4caService.uploadProjectTopic(request.payload.project_topic, team_id, project_title, project_summary, is_submitted, module_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return {status:err.message};
                }
                return c4caService.responseWrapper(resp, "success");
            }
        }
    },

    {
        method: 'POST',
        path: '/c4ca/projectSubmit/{module_id}',
        options: {
            payload: {
                maxBytes: 104857600,
                parse: true,
                output: 'stream',
                allow: ['multipart/form-data'],
                multipart: true,
            },
            description: 'upload project in s3',
            notes: 'File Upload',
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
                params: Joi.object({
                    module_id: Joi.number().required(),
                }),
                payload: Joi.object({
                    project_link: Joi.string().optional(),
                    project_file_url: Joi.any().meta({ swaggerType: 'file' }).description('file').optional(),
                    is_submitted: Joi.boolean().default(false),
                }),
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const {team_id} = request.auth.credentials;
                //    uplaod project_uploadFile in s3
                const {module_id} = request.params
                const [err, resp] = await c4caService.uploadProjectSubmit(request.payload.project_file_url, team_id, request.payload.project_link, request.payload.is_submitted, module_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return {status:err.message};
                    
                }
                return c4caService.responseWrapper(resp, "success");
            }
        }
    },

    {
        method: 'GET',
        path: '/c4ca/projectTopic/{module_id}',
        options: {
            description: 'get project topic by team id and count of project submitted',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                params: Joi.object({
                    module_id: Joi.number().required(),
                }),
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const {team_id} = request.auth.credentials;
                const {module_id} = request.params

                const [err, resp] = await c4caService.getProjectTopicByTeamId(team_id,module_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(resp, "success");
            }
        }

    },

    {
        method: 'GET',
        path: '/c4ca/projectSubmit/{module_id}',
        options: {
            description: 'get project submitted by team id and count of project submitted',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                params: Joi.object({
                    module_id: Joi.number().required(),
                }),
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const {team_id} = request.auth.credentials;
                const {module_id} = request.params
                const [err, resp] = await c4caService.getProjectSubmitByTeamId(team_id, module_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(resp, "success");
            }
        }
    },

    {
        method: 'POST',
        path: '/c4ca/projectTopic/unlockedDate/{module_id}',
        options: {
            description: 'share project topic by team id',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                params: Joi.object({
                    module_id: Joi.number().required(),
                }),
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const {team_id} = request.auth.credentials;
                const {module_id} = request.params
                const [err, resp] = await c4caService.shareProjectTopicTime(team_id, module_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(resp, "success");
            }
        }

    },

    {
        method: 'POST',
        path: '/c4ca/projectSubmit/unlockedDate/{module_id}',
        options: {
            description: 'share project submit by team id',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                params: Joi.object({
                    module_id: Joi.number().required(),
                }),
            },

            handler: async (request, h) => {
                const { c4caService } = request.services();
                const {team_id} = request.auth.credentials;
                const {module_id} = request.params
                const [err, resp] = await c4caService.shareProjectSubmitTime(team_id, module_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(resp, "success");
            }
        }
    },
    {
        method: 'GET',
        path: '/c4ca/assessment/getAttemptAssessment',
        options: {
            description: 'Get all aassessment attend by team id',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                let user_id;
                let team_id;
                if (request.auth.credentials.id) {
                    user_id = request.auth.credentials.id;
                } else {
                    team_id = request.auth.credentials.team_id;
                }
                const [err, response_] = await c4caService.getAllAttemptAssessment(user_id, team_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return c4caService.responseWrapper(response_, "success");
            }
        }
    },

    {
        method: 'GET',
        path: '/c4ca/totalData',
        options: {
            description: 'get total numbers of data of Students, Teachers, Facilitators, Teams, Projects',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
            },
            validate: {
                query: Joi.object({
                    partner_id: Joi.number().integer().optional(),
                }),
            },
            handler: async (request, h) => {
                const { c4caService } = request.services();
                const [err, resp] = await c4caService.getTotalData(request.query.partner_id);
                if (err) {
                    logger.error(JSON.stringify(err));
                    return c4caService.responseWrapper(null, err.message);
                }
                return await c4caService.responseWrapper(resp, "success");
            }
        }
    },

    {
        method: 'GET',
        path: '/c4ca/{teacher_id}',
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
