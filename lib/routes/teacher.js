const Joi = require('@hapi/joi');
require('aws-sdk');
const logger = require('../../server/logger');
const path = require('path');
const fs = require('fs');


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
          zone: Joi.string().required(),
          school_id: Joi.number().integer(),
          school_name: Joi.string(),
          teacher_name: Joi.string().required(),
          teacher_id: Joi.number().integer().required(),
          class_of_teacher: Joi.string(),
          phone_number: Joi.string()
            .min(7)
            .max(15)
            .pattern(/^(?:\+?\d{1,3}[\s-]?)?(?:\d{10}|\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}|\(\d{1,4}\)[\s-]?\d{6,10}|\d{1,4}[\s-]?\d{6,10})$/)
            .required(),
          employee_type: Joi.string().valid('teacher', 'principal', 'mentor_teacher', 'school_inspector', 'clerical_staff').required(),
        }),
      },
      handler: async (request, h) => {
        const { teacherService } = request.services();
        const payload_ = request.payload;
        payload_.user_id = request.auth.credentials.id;
        payload_.email = request.auth.credentials.email;
        try {
          const [err, data] = await teacherService.createTeacherCapacityBuilding(payload_);
          if (err) {
            logger.error(`Error creating teacher capacity building: ${JSON.stringify(err)}`);
            return h.response({
              statusCode: err.code || 500,
              error: err.message || 'Internal Server Error',
            }).code(err.code || 500);
          }
          return h.response(data).code(200);
        } catch (error) {
          logger.error(`Unexpected error: ${error.message}`);
          return h.response({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred. Please try again later.'
          }).code(500);
        }

      },
    },
  },

  {
    method: 'GET',
    path: '/teacherusers',
    options: {
      description: 'Get users filtered by name or email',
      notes: 'Returns all users where either name or email contains the provided search term',
      tags: ['api'],
      validate: {
        query: Joi.object({
          search: Joi.string().optional().description('Search term to filter by name or email')
        })
      },
      handler: async (request, h) => {
        try {
          console.log('Received query:', request.query);  // Log the query parameters
          const { teacherService } = request.services();
          const [err, data] = await teacherService.filterOrEmail(request.query);
  
          if (err) {
            console.error('Error filtering users:', err);
            return h.response({
              message: 'Failed to filter users.',
              error: err.message
            }).code(400);
          }
  
          console.log('Data retrieved:', data);  // Log the data retrieved
          return h.response({
            message: 'Users filtered successfully.',
            data: data
          }).code(200);
  
        } catch (error) {
          console.error('Internal server error:', error);
          return h.response({
            message: 'Internal server error.',
            error: error.message
          }).code(500);
        }
      }
    }
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
    path: '/tcb/csv/{pathway_id}',
    options: {
      description: 'Storing the teachers data into the csv file',
      tags: ['api'],
      validate: {
        params: Joi.object({
          pathway_id: Joi.number().integer().required(),
        }),
        query: Joi.object({
          page: Joi.number().integer(),
          limit: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { teacherService, pathwayServiceV2 } = request.services();
        const { page, limit } = request.query;

        try {
          if (request.params.pathway_id !== 10) {
            return h.response({ error: 'Invalid pathway id' }).code(400);
          }
          const [
            errTotalUsersID,
            usersData,
          ] = await teacherService.TeacherCapacityBuildingTotalUsersIDNew(page, limit);
          console.log(errTotalUsersID,"errTotalUsersID")
          console.log(usersData,"usersData")

          if (errTotalUsersID) {
            logger.error(JSON.stringify(errTotalUsersID));
            return h.response(errTotalUsersID).code(errTotalUsersID.code);
          }

          const [
            errpathwayIDBy,
            pathwayCourses,
            total_assessmentIds,
          ] = await pathwayServiceV2.pathwayIDBycoursesExercisesAssessmentsIdsNew(
            request.params.pathway_id
          );
          console.log(errpathwayIDBy,"assess")
          console.log("courses",pathwayCourses,"courses")
          console.log( "assesstotal",total_assessmentIds,"assesstotal")

          const outcomes = [];
          for (let user of usersData.results) {
            const [err, DataLoader] = await teacherService.DataLoaderSheetOBJNew(
              user,
              pathwayCourses,
              total_assessmentIds,
            );
            outcomes.push(DataLoader);
          }
          if (errpathwayIDBy) {
            return h.response(errpathwayIDBy).code(errpathwayIDBy.code);
          }
          await teacherService.insertIntoCSV(outcomes);
          return h.response(outcomes).code(200);

        } catch (error) {
          logger.error(error);
          return h.response({ error: 'Internal server error' }).code(500);
        }
      },
    },
  },

  {
    method: 'GET',
    path: '/tcb/csv/progress/roport',
    options: {
      description: 'Download the teachers 1359_mcdigital_teachers_progress.csv file',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['admin', 'partner'],
      },
      handler: (request, h) => {
        try {
          const filePath = path.join(__dirname, '../../1359_mcdigital_teachers_progress.csv');
          // Check if file exists
          if (!fs.existsSync(filePath
          )) {
            return h.response({ error: 'File not found' }).code(404);
          }

          // Serve the file for download
          return h.file(filePath, {
            mode: 'attachment',
            filename: '1359_mcdigital_teachers_progress.csv'
          })
            .header('X-Download-Status', 'Download successful')
            .header('Cache-Control', 'no-cache, no-store, must-revalidate')
            .header('Pragma', 'no-cache')
            .header('Expires', '0');
        } catch (error) {
          logger.error(error);
          return h.response({ error: 'Internal server error' }).code(500);
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/tcb/teachers/last-week/login',
    options: {
      description: 'GET new last week logged In teachers details',
      tags: ['api'],
      handler: async (request, h) => {
        try {
          const { teacherService, pathwayServiceV2 } = request.services();
          const [err, teachers] = await teacherService.getLastWeekLoggedInTeachers();
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          if (teachers.length > 0) {
            let pathway_id = 10;
            const [
              errpathwayIDBy,
              pathwayCourses,
              total_assessmentIds,
            ] = await pathwayServiceV2.pathwayIDBycoursesExercisesAssessmentsIdsNew(pathway_id);

            const outcomes = [];
            for (let user of teachers) {
              const [err, DataLoader] = await teacherService.DataLoaderSheetOBJNew(
                user,
                pathwayCourses,
                total_assessmentIds,
              );
              outcomes.push(DataLoader);
            }
            if (errpathwayIDBy) {
              return h.response(errpathwayIDBy).code(errpathwayIDBy.code);
            }
            await teacherService.insertNewUsersIntoCSV(outcomes);
            return h.response(outcomes).code(200);
          }
          else {
            return h.response({ error: 'There have been no users who logged in since last week' }).code(404);
          }
        }
        catch (error) {
          logger.error(error);
          return h.response({ error: 'Internal server error' }).code(500);
        }
      },
    },
  },

  {
    method: 'GET',
    path: '/tcb/csv/last-week/login-report',
    options: {
      description: 'Retrive the 1359_last_week_users_login.csv file with the details of last week logged in users.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['admin', 'partner'],
      },
      handler: (request, h) => {
        try {
          const filePath = path.join(__dirname, '../../1359_last_week_users_login.csv');
          // Check if file exists
          if (!fs.existsSync(filePath
          )) {
            return h.response({ error: 'File not found' }).code(404);
          }

          // Serve the file for download
          return h.file(filePath, {
            mode: 'attachment',
            filename: '1359_last_week_users_login.csv'
          })
            .header('X-Download-Status', 'Download successful')
            .header('Cache-Control', 'no-cache, no-store, must-revalidate')
            .header('Pragma', 'no-cache')
            .header('Expires', '0');
        } catch (error) {
          logger.error(error);
          return h.response({ error: 'Internal server error' }).code(500);
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/tcb/csv/read-date-csv',
    options: {
      description: 'Read the teachers data from the csv file and return date',
      tags: ['api'],
      validate: {
        query: Joi.object({
          // No query parameters required for this route
        }),
      },
      handler: async (request, h) => {
        const { teacherService } = request.services();
        const [err, data] = await teacherService.getSheetUpdatedColumnData();
        if (err) {
          return h.response(err).code(err.code || 500);
        }
        return h.response(data).code(200);
      },
    },
    // eslint-disable-next-line prettier/prettier
  },

  {
    method: 'GET',
    path: '/teacher/courses',
    options: {
      description: 'Get compulsory and optional courses by teacher email',
      tags: ['api'],
      auth: 'jwt',  
      handler: async (request, h) => {
        const { teacherService } = request.services();
        const { email } = request.auth.credentials; 
        try {
          const result = await teacherService.getTeacherAndCourses(email);
          if (result.error) {
            return h.response({ error: result.error }).code(400);
          }
          return h.response(result).code(200);
        } catch (error) {
          return h.response({ error: 'Internal server error' }).code(500);
        }
      }
    }
  }
];
