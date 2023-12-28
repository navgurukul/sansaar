/* eslint-disable prefer-destructuring */
const Joi = require('@hapi/joi');
const { getRouteScope } = require('./helpers');
const logger = require('../../server/logger');

module.exports = [
    {
        method: 'POST',
        path: '/hackathonCourses/ENROLL/{course_id}', // Fixed path by adding curly braces around course_id
        options: {
            tags: ['api'],
            validate: {
                params: Joi.object({
                    course_id: Joi.number().integer().greater(0).less(9).required(),
                }),
                payload: Joi.object({
                    email: Joi.string().email().required(),
                }),
            },
            handler: async (request, h) => {
                try {
                    console.log(request.payload.email, request.params.course_id, "request.payload.email, request.params.course_id");
                    const { hackathonCoursesService } = request.services();
                    const [err, data] = await hackathonCoursesService.createHackathonCourses(request.payload.email, request.params.course_id);
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
        method: 'POST',
        path: '/hackathonCourses/UPDATE_PROGRESS/{course_id}',
        options: {
            tags: ['api'],
            validate: {
                params: Joi.object({
                    course_id: Joi.number().integer().greater(0).less(9).required(),
                }),
                payload: Joi.object({
                    email: Joi.string().email().required(),
                    exercise_id: Joi.number().integer().required(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { hackathonCoursesService } = request.services();
                    const [err, data] = await hackathonCoursesService.updateProgress(request.payload, request.params.course_id);
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
        method: 'GET',
        path: '/hackathonCourses/GET_ENROLLED_COURSES/{email}',
        options: {
            tags: ['api'],
            validate: {
                params: Joi.object({
                    email: Joi.string().email().required(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { hackathonCoursesService } = request.services();
                    const [err, data] = await hackathonCoursesService.getEnrolledCourses(request.params.email);
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

    // create a post api for asking a qustions for users and the user can ask the questions by emailid
    {
        method: 'POST',
        path: '/hackathonCourses/ASK_QUESTIONS',
        options: {
            tags: ['api'],
            validate: {
                payload: Joi.object({
                    email: Joi.string().email().required(),
                    questions: Joi.string(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { hackathonCoursesService } = request.services();
                    const [err, data] = await hackathonCoursesService.askQuestions(request.payload);
                    if (err) {
                        logger.error(JSON.stringify(err));
                        return h.response(err).code(err.code);
                    }
                    return data;
                } catch (err) {
                    console.log(err, 'EEEEEEEEEEEEE')
                    logger.error(JSON.stringify(err));
                    return h.response(err).code(err.code);
                }
            },
        }
    },

    // create a post api for answering the qustions for users and store its answer in the database by questions id
    {
        method: 'POST',
        path: '/hackathonCourses/SUBMIT_ANSWER',
        options: {
            tags: ['api'],
            validate: {
                payload: Joi.object({
                    question_id: Joi.number().integer().required(),
                    answers: Joi.string(),
                    email: Joi.string().email().required(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { hackathonCoursesService } = request.services();
                    const [err, data] = await hackathonCoursesService.submitAnswers(request.payload);
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

    // get API - get all questions, by email id
    {
        method: 'GET',
        path: '/hackathonCourses/GET_ALL_QUESTIONS',
        options: {
            tags: ['api'],
            // validate: {
            //     params: Joi.object({
            //         email: Joi.string().email().required(),
            //     }),
            // },
            handler: async (request, h) => {
                try {
                    const { hackathonCoursesService } = request.services();
                    const [err, data] = await hackathonCoursesService.getAllQuestions();
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

    // get API - get all answers, by question id and with questions
    {
        method: 'GET',
        path: '/hackathonCourses/GET_ALL_ANSWERS/{question_id}',
        options: {
            tags: ['api'],
            validate: {
                params: Joi.object({
                    question_id: Joi.number().integer().required(),
                }),
            },
            handler: async (request, h) => {
                try {
                    const { hackathonCoursesService } = request.services();
                    const [err, data] = await hackathonCoursesService.getAllAnswers(request.params.question_id);
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

]