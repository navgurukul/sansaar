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
          phone_number: Joi.string()
          .min(7)
          .max(15)
          .pattern(/^(?:\+?\d{1,3}[\s-]?)?(?:\d{10}|\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}|\(\d{1,4}\)[\s-]?\d{6,10}|\d{1,4}[\s-]?\d{6,10})$/)
          .required()
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
  {
    method: 'GET',
    path: '/Update/dataIntoSheet/{pathway_id}',
    options: {
      description: 'Storing the data into the sheet',
      tags: ['api'],
      validate: {
        params: Joi.object({
          pathway_id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { teacherService, pathwayServiceV2 } = request.services();

        try {
          if (request.params.pathway_id !== 10) {
            return h.response({ error: 'Invalid pathway id' }).code(400);
          }
          const [
            errTotalUsersID,
            userIDs,
            infoUser,
          ] = await teacherService.TeacherCapacityBuildingTotalUsersID();

          if (errTotalUsersID) {
            logger.error(JSON.stringify(errTotalUsersID));
            return h.response(errTotalUsersID).code(errTotalUsersID.code);
          }

          const [
            errpathwayIDBy,
            pathwayCourses,
            assessmentIds
          ] = await pathwayServiceV2.pathwayIDBycoursesExercisesAssessmentsIds(
            request.params.pathway_id
          );
          
          if (errpathwayIDBy) {
            logger.error(JSON.stringify(errpathwayIDBy));
            return h.response(errpathwayIDBy).code(errpathwayIDBy.code);
          }
          const promises = await pathwayServiceV2.resultScorePathwayCoursesForUsers(
            userIDs,
            pathwayCourses
          );
          const [error, results] = await Promise.all(promises);
          if (error) {
            logger.error(JSON.stringify(error));
            return h.response(error).code(error.code);
          }
          const [err, DataLoader] = await teacherService.DataLoaderSheetOBJ(infoUser, results, assessmentIds);
          if (err) {
            return h.response(err).code(err.code);
          }
          return h.response(DataLoader).code(200);
        } catch (error) {
          logger.error(error);
          return h.response({ error: 'Internal server error' }).code(500);
        }
      },
    },
  },

  // for getting teachers details of TCBPI pathway
  {
    method: 'GET',
    path: '/teacher/getTeacherCapacityBuilding',
    options: {
      description: 'GET teacher Capacity Building',
      tags: ['api'],
      handler: async (request, h) => {
        const { teacherService } = request.services();
        const [err, teacherCapacityBuilding] = await teacherService.getTeacherCapacityBuilding();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return teacherCapacityBuilding;
      },
    },
  },
 
];
