const Joi = require('@hapi/joi');
const fs = require('fs-extra');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'GET',
    path: '/course',
    options: {
      description: 'Get all courses',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      //   mode: 'optional',
      // },
      handler: async () => {
        const filenames = fs.readdirSync('curriculum_new');
        const courses = [];
        filenames.forEach((file) => {
          courses.push({ name: file });
        });
        return courses;
      },
    },
  },

  {
    method: 'GET',
    path: '/course/{courseName}/exercises',
    options: {
      description: 'Get complete list of exercises in the course',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      //   mode: 'optional',
      // },
      validate: {
        params: Joi.object({
          courseName: Joi.string().max(100).required(),
        }),
        query: Joi.object({
          lang: Joi.string(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { courseName } = request.params;
        const { courseEditorService } = request.services();
        const course = {};
        const language =
          ['hi', 'en', 'te', 'mr', 'ta'].indexOf(request.query.lang) > -1
            ? request.query.lang
            : 'en';
        const [err, details] = await courseEditorService.findDetailInCourseVersionsById(
          courseName,
          language
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const fileDir = `curriculum_new/${courseName}/${details[0].version}/PARSED_CONTENT`;
        const filenames = fs.readdirSync(fileDir);
        const courses = [];
        filenames.forEach((file) => {
          courses.push(file);
        });
        course.name = courseName;
        // eslint-disable-next-line
        const [error, exercise] = await courseEditorService.getCourseExerciseForCourseEditor(
          `${fileDir}/${courses[0]}`,
          `${fileDir}/${courses[1]}`,
          courseName,
          language
        );
        if (error) {
          logger.error(JSON.stringify(error));
          return h.response(error).code(error.code);
        }
        course.exercise = exercise;
        return { course };
      },
    },
  },

  {
    method: 'PUT',
    path: '/course/{courseName}/exercise/{exerciseName}',
    options: {
      description: 'Update exercises of the course',
      tags: ['api'],
      validate: {
        params: Joi.object({
          courseName: Joi.string(),
          exerciseName: Joi.string(),
        }),
        payload: Joi.object({
          name: Joi.string().max(100).optional(),
          content: Joi.string().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { courseEditorService } = request.services();
        if (!fs.existsSync(`curriculum_new/${request.params.courseName}`)) {
          return {
            error: true,
            message: 'course name is wrong',
            type: 'NotFound',
            data: {},
            code: 500,
          };
        }
        const [err, details] = await courseEditorService.findDetailInCourseVersionsById(
          request.params.courseName,
          'en'
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        // eslint-disable-next-line
        const version = parseInt(details[0].version.split('v')[1]) + 1;
        const folderName = `curriculum_new/${request.params.courseName}/v${version}`;
        await courseEditorService.copyFolder(
          folderName,
          request.params.courseName,
          details[0].version,
          `v${version}`
        );
        const [errInUpdating, exercises] = await courseEditorService.updateSingleExercises(
          folderName,
          request.params.exerciseName,
          request.payload,
          `curriculum_new/${request.params.courseName}/v${details[0].version.split('v')[1]}`
        );
        if (errInUpdating) {
          logger.error(JSON.stringify(errInUpdating));
          return h.response(errInUpdating).code(errInUpdating.code);
        }
        if (exercises === 'notUpdated') {
          return {
            error: true,
            message: 'please try with updated exercise name',
            type: 'NotFound',
            data: {},
            code: 500,
          };
        }
        return exercises;
      },
    },
  },

  {
    method: 'POST',
    path: '/course/{courseName}/exercise',
    options: {
      description: 'Create exercises of the course',
      tags: ['api'],
      validate: {
        params: Joi.object({
          courseName: Joi.string(),
        }),
        payload: Joi.object({
          name: Joi.string().max(100).required(),
          content: Joi.string(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { courseEditorService } = request.services();
        if (!fs.existsSync(`curriculum_new/${request.params.courseName}`)) {
          return {
            error: true,
            message: 'course name is wrong',
            type: 'NotFound',
            data: {},
            code: 500,
          };
        }
        const [err, details] = await courseEditorService.findDetailInCourseVersionsById(
          request.params.courseName,
          'en'
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        // eslint-disable-next-line
        const version = `v${parseInt(details[0].version.split('v')[1]) + 1}`;
        const folderName = `curriculum_new/${request.params.courseName}/${version}`;
        await courseEditorService.copyFolder(
          folderName,
          request.params.courseName,
          details[0].version,
          version
        );
        const [errInUpdating, exercises] = await courseEditorService.addSingleExercise(
          folderName,
          request.payload
        );
        if (errInUpdating) {
          logger.error(JSON.stringify(errInUpdating));
          return h.response(errInUpdating).code(errInUpdating.code);
        }
        if (fs.existsSync(folderName)) {
          if (fs.existsSync(`${folderName}/PARSED_CONTENT/MODIFIED_FILES`)) {
            fs.readdirSync(`${folderName}/PARSED_CONTENT/MODIFIED_FILES`).forEach(async (file) => {
              const propertiesFilePath = `${folderName}/PARSED_CONTENT/PROPERTIES_FILES/${
                file.split('.')[0]
              }`;
              await courseEditorService.fixedTranslation(propertiesFilePath);
            });
          }
        }
        return exercises;
      },
    },
  },

  {
    method: 'GET',
    path: '/course/{courseName}/reviewExercises',
    options: {
      description: 'Get complete list of exercises in the course',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      //   mode: 'optional',
      // },
      validate: {
        params: Joi.object({
          courseName: Joi.string().max(100).required(),
        }),
        query: Joi.object({
          lang: Joi.string(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { courseName } = request.params;
        const { courseEditorService } = request.services();
        const course = {};
        const language =
          ['hi', 'en', 'te', 'mr', 'ta'].indexOf(request.query.lang) > -1
            ? request.query.lang
            : 'en';
        const [err, details] = await courseEditorService.findDetailInCourseVersionsById(
          courseName,
          language
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        // eslint-disable-next-line
        const version = parseInt(details[0].version.split('v')[1]) + 1;
        const folderName = `curriculum_new/${request.params.courseName}/v${version}`;
        if (!fs.existsSync(folderName)) {
          return {
            error: true,
            message: "we don't have any updated code for this course right now",
            type: 'NotFound',
            data: {},
            code: 404,
          };
        }
        const fileDir = `curriculum_new/${courseName}/v${version}/PARSED_CONTENT`;
        const filenames = fs.readdirSync(fileDir);
        const courses = [];
        filenames.forEach((file) => {
          courses.push(file);
        });
        course.name = courseName;
        const [error, exercise] = await courseEditorService.getCourseExerciseForCourseEditor(
          `${fileDir}/${courses[0]}`,
          `${fileDir}/${courses[1]}`,
          courseName,
          language
        );
        if (error) {
          logger.error(JSON.stringify(error));
          return h.response(error).code(error.code);
        }
        course.exercise = exercise;
        return { course };
      },
    },
  },

  {
    method: 'PUT',
    path: '/course/{courseName}/promoteCourseVersion',
    options: {
      description: 'Update exercises of the course',
      tags: ['api'],
      validate: {
        params: Joi.object({
          courseName: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { courseName } = request.params;
        const { courseEditorService } = request.services();
        const language =
          ['hi', 'en', 'te', 'mr', 'ta'].indexOf(request.query.lang) > -1
            ? request.query.lang
            : 'en';
        const [err, details] = await courseEditorService.findDetailInCourseVersionsById(
          courseName,
          language
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        // eslint-disable-next-line
        const version = parseInt(details[0].version.split('v')[1]) + 1;
        const folderName = `curriculum_new/${request.params.courseName}/v${version}`;
        if (!fs.existsSync(folderName)) {
          return {
            error: true,
            message: "we don't have any updated code for this course right now",
            type: 'NotFound',
            data: {},
            code: 404,
          };
        }
        const [errInUpdating, courseVersion] = await courseEditorService.updateCourseVersion(
          courseName,
          `v${version}`
        );
        if (errInUpdating) {
          logger.error(JSON.stringify(errInUpdating));
          return h.response(errInUpdating).code(errInUpdating.code);
        }
        return courseVersion;
      },
    },
  },

  {
    method: 'POST',
    path: '/course/v1_to_v2_migration',
    options: {
      description: 'migrate courses v1 to v2',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      //   scope: getRouteScope('admin'),
      // },
      handler: async (request, h) => {
        const { coursesService, courseEditorService } = request.services();
        const [err, courses] = await coursesService.getAllCourses({ course_type: 'json' });
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get all courses');
        const [error, addCourse] = await courseEditorService.createCourses(courses);
        if (error) {
          logger.error(JSON.stringify(error));
          return h.response(error).code(error.code);
        }
        return { addCourse };
      },
    },
  },
];
