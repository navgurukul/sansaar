const Joi = require('@hapi/joi');
require('aws-sdk');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/teacher/create',
    options: {
      description: 'create the Teacher Capacity Building ',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        payload: Joi.object({
          zone: Joi.string(),
          school_id: Joi.number().integer(),
          school_name: Joi.string(),
          teacher_name: Joi.string(),
          teacher_id: Joi.number().integer(),
          class_of_teacher: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { teacherService } = request.services();
        const payload_ = request.payload;
        payload_.user_id = request.auth.credentials.id;
        payload_.email = request.auth.credentials.email;
        const [err, data] = await teacherService.createTeacherCapacityBuilding(payload_);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },

  {
    method: 'GET',
    path: '/teacher/checking',
    options: {
      description: 'GET teacher user details BY user_id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const { teacherService } = request.services();
        const user_id = request.auth.credentials.id;
        const [err, user_teacher] = await teacherService.getTeacherUserId(user_id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return user_teacher;
      },
    },
  },
  {
    method: 'DELETE',
    path: '/teacher/{user_id}',
    options: {
      description: 'DELETE BY userId_ teacher Capacity Building',
      tags: ['api'],
      validate: {
        params: Joi.object({
          user_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { teacherService } = request.services();
        const { user_id } = request.params;
        const [err, deleteProject] = await teacherService.DeleteUserIdTeacher(user_id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return deleteProject;
      },
    },
  },
];
