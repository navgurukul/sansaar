const Joi = require('@hapi/joi');
const fs = require('fs-extra');
const logger = require('../../server/logger');
const { getRouteScope } = require('./helpers');
const Courses = require('../models/courses');

module.exports = [
  {
    method: 'POST',
    path: '/courseEditor/v1_to_v2_migration',
    options: {
      description: 'migrate courses v1 to v2',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('admin'),
      },
      handler: async (request, h) => {
        const { courseEditorService } = request.services();
        const [error, addCourse] = await courseEditorService.createCourses();
        if (error) {
          logger.error(JSON.stringify(error));
          return h.response(error).code(error.code);
        }
        return { addCourse };
      },
    },
  },
  {
    method: 'PUT',
    path: '/courseEditor/{courseId}/promoteCourseVersion',
    options: {
      description: 'Update exercises of the course',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('publisher'),
      },
      validate: {
        params: Joi.object({
          courseId: Joi.number().integer(),
        }),
        query: Joi.object({
          lang: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { courseId } = request.params;
        const { courseEditorService, coursesServiceV2 } = request.services();
        const language =
          ['hi', 'en', 'te', 'mr', 'ta'].indexOf(request.query.lang) > -1
            ? request.query.lang
            : 'en';
        const [err, details] = await courseEditorService.findDetailInCourseVersionsById(
          courseId,
          language
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (details === null || details === undefined || details.length <= 0) {
          return {
            error: true,
            message: 'Course Id Not Found',
            type: 'NotFound',
            data: {},
            code: 404,
          };
        }
        // eslint-disable-next-line
        const version = parseInt(details[0].version.split('v')[1]) + 1;
        const [errorWhileFetchingDetails, coursesDetails] = await coursesServiceV2.getCourseById(
          courseId
        );
        if (errorWhileFetchingDetails) {
          logger.error(JSON.stringify(errorWhileFetchingDetails));
          return h.response(errorWhileFetchingDetails).code(errorWhileFetchingDetails.code);
        }
        const folderName = `curriculum_v2/${coursesDetails.name}_${coursesDetails.id}/v${version}`;
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
          courseId,
          `v${version}`
        );
        if (errInUpdating) {
          logger.error(JSON.stringify(errInUpdating));
          return h.response(errInUpdating).code(errInUpdating.code);
        }
        const data = {};
        data.content_editors_user_id = request.auth.credentials.id;
        data.course_id = coursesDetails.id;
        data.course_states = 'published';
        await courseEditorService.courseEditorStatus(data);

        return courseVersion;
      },
    },
  },

  {
    method: 'GET',
    path: '/courseEditor/{courseId}/reviewExercises',
    options: {
      description: 'Get complete list of exercises in the course',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['editor', 'publisher']),
      },
      validate: {
        params: Joi.object({
          courseId: Joi.number().integer(),
        }),
        query: Joi.object({
          lang: Joi.string(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { courseId } = request.params;
        const { courseEditorService, coursesServiceV2 } = request.services();
        const course = {};
        const language =
          ['hi', 'en', 'te', 'mr', 'ta'].indexOf(request.query.lang) > -1
            ? request.query.lang
            : 'en';
        const [err, details] = await courseEditorService.findDetailInCourseVersionsById(
          courseId,
          language
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        // eslint-disable-next-line
        const version = parseInt(details[0].version.split('v')[1]) + 1;
        const [errorWhileFetchingDetails, coursesDetails] = await coursesServiceV2.getCourseById(
          courseId
        );
        if (errorWhileFetchingDetails) {
          logger.error(JSON.stringify(errorWhileFetchingDetails));
          return h.response(errorWhileFetchingDetails).code(errorWhileFetchingDetails.code);
        }

        const folderName = `curriculum_v2/${coursesDetails.name}_${coursesDetails.id}/v${version}`;
        if (!fs.existsSync(folderName)) {
          return {
            error: true,
            message: "we don't have any updated code for this course right now",
            type: 'NotFound',
            data: {},
            code: 404,
          };
        }
        const fileDir = `curriculum_v2/${coursesDetails.name}_${coursesDetails.id}/v${version}/PARSED_CONTENT`;
        const filenames = fs.readdirSync(fileDir);
        const courses = [];
        filenames.forEach((file) => {
          courses.push(file);
        });
        course.name = `${coursesDetails.name}_${coursesDetails.id}`;
        const [error, exercise] = await courseEditorService.getCourseExerciseForCourseEditor(
          `${fileDir}/${courses[0]}`,
          `${fileDir}/${courses[1]}`,
          `${coursesDetails.name}_${coursesDetails.id}`,
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
    path: '/courseEditor/exercise/{exerciseId}',
    options: {
      description: 'Update exercises of the course',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('editor'),
      },
      validate: {
        params: Joi.object({
          exerciseId: Joi.number().integer(),
        }),
        payload: Joi.object({
          name: Joi.string().max(100).optional(),
          content: Joi.string().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { courseEditorService, exercisesServiceV2, coursesServiceV2 } = request.services();
        const [
          errorWhileFetchingDetails,
          exerciseDetails,
        ] = await exercisesServiceV2.getExerciseById(request.params.exerciseId);
        if (errorWhileFetchingDetails) {
          logger.error(JSON.stringify(errorWhileFetchingDetails));
          return h.response(errorWhileFetchingDetails).code(errorWhileFetchingDetails.code);
        }
        if (
          exerciseDetails === null ||
          exerciseDetails === undefined ||
          exerciseDetails.length <= 0
        ) {
          return {
            error: true,
            message: 'exercise does not exists',
            type: 'NotFound',
            data: {},
            code: 500,
          };
        }
        const [
          errorWhileFetchingCoursesDetails,
          coursesDetails,
        ] = await coursesServiceV2.getCourseById(exerciseDetails[0].course_id);
        if (errorWhileFetchingCoursesDetails) {
          logger.error(JSON.stringify(errorWhileFetchingCoursesDetails));
          return h
            .response(errorWhileFetchingCoursesDetails)
            .code(errorWhileFetchingCoursesDetails.code);
        }
        if (coursesDetails === null || coursesDetails === undefined) {
          return {
            error: true,
            message: 'course does not exists',
            type: 'NotFound',
            data: {},
            code: 500,
          };
        }

        const [
          errorInEditorDetails,
          editorDetails,
        ] = await courseEditorService.getCourseEditorDetail(coursesDetails.id);
        if (errorInEditorDetails) {
          logger.error(JSON.stringify(errorInEditorDetails));
          return h.response(errorInEditorDetails).code(errorInEditorDetails.code);
        }
        if (
          editorDetails.length > 0 &&
          editorDetails[0].course_states === 'changed' &&
          editorDetails[0].content_editors_user_id != request.auth.credentials.id
        ) {
          return {
            error: true,
            message:
              'Unable to update course, please contact muskanth20@navgurukul.org or kirithiv@navgurukul.org',
            type: 'bad request',
            data: {},
            code: 400,
          };
        }

        if (!fs.existsSync(`curriculum_v2/${coursesDetails.name}_${coursesDetails.id}`)) {
          return {
            error: true,
            message: 'course name is wrong',
            type: 'NotFound',
            data: {},
            code: 500,
          };
        }
        const [err, details] = await courseEditorService.findDetailInCourseVersionsById(
          coursesDetails.id,
          'en'
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        // eslint-disable-next-line
        const version = parseInt(details[0].version.split('v')[1]) + 1;
        const folderName = `curriculum_v2/${coursesDetails.name}_${coursesDetails.id}/v${version}`;
        await courseEditorService.copyFolder(
          folderName,
          `${coursesDetails.name}_${coursesDetails.id}`,
          details[0].version,
          `v${version}`
        );
        const [errInUpdating, exercises] = await courseEditorService.updateSingleExercises(
          folderName,
          exerciseDetails[0].name,
          request.payload,
          `curriculum_v2/${coursesDetails.name}_${coursesDetails.id}/v${
            details[0].version.split('v')[1]
          }`
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
        const data = {};
        data.content_editors_user_id = request.auth.credentials.id;
        data.course_id = coursesDetails.id;
        data.course_states = 'changed';
        await courseEditorService.courseEditorStatus(data);

        return exercises;
      },
    },
  },
  {
    method: 'GET',
    path: '/courseEditor/{courseId}/exercises',
    options: {
      description: 'Get complete list of exercises in the course',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
        query: Joi.object({
          lang: Joi.string(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { courseId } = request.params;
        const {
          courseEditorService,
          coursesServiceV2,
          pathwayService,
          pathwayServiceV2,
          displayService,
          assessmentService,
          classesService,
        } = request.services();
        let sequence = Math.floor(Math.random() * 1000 + 1);
        if (courseId === 1000) {
          const data = fs.readFileSync(path.resolve(__dirname, '../_mockAPIs/classTopic.json'));
          return data.toString();
        }

        if (courseId === 2000) {
          const data = fs.readFileSync(path.resolve(__dirname, '../_mockAPIs/typing.json'));
          return data.toString();
        }
        const language =
          ['hi', 'en', 'te', 'mr', 'ta'].indexOf(request.query.lang) > -1
            ? request.query.lang
            : 'en';

        let classesRegisteredByUser;
        let oldClassesRegisteredByUser;
        const [errorInDetails, details] = await courseEditorService.findDetailInCourseVersionsById(
          courseId,
          language
        );
        if (errorInDetails) {
          logger.error(JSON.stringify(errorInDetails));
          return h.response(errorInDetails).code(errorInDetails.code);
        }
        // eslint-disable-next-line
        const [err, courseWithexercise] = await courseEditorService.getCourseExercise(
          courseId,
          details[0].version,
          language
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const [errInPathwayId, getPathwayId] = await coursesServiceV2.getPathwayIdByCourseId(
          courseId
        );
        if (errInPathwayId) {
          logger.error(JSON.stringify(errInPathwayId));
        }
        let userEnrolled = false;
        let userEnrolledInOldBatches = false;
        const enrolledClasses = [];
        if (getPathwayId !== null && request.auth.credentials !== null) {
          const [errInPathwayIdDetails, getPathwayIdDetails] = await pathwayServiceV2.findById(
            getPathwayId
          );
          if (errInPathwayIdDetails) {
            logger.error(JSON.stringify(errInPathwayIdDetails));
          }
          const [errInOldPathway, getOldPathway] = await pathwayService.getOldPathwayIdByCode(
            getPathwayIdDetails.code
          );
          if (errInOldPathway) {
            logger.error(JSON.stringify(errInOldPathway));
          }
          if (getOldPathway !== null) {
            oldClassesRegisteredByUser = await classesService.getIfStudentEnrolled(
              request.auth.credentials.id,
              getOldPathway[0].id
            );
            userEnrolledInOldBatches = oldClassesRegisteredByUser.message === 'enrolled';
            if (
              userEnrolledInOldBatches &&
              oldClassesRegisteredByUser.recurring_id !== null &&
              oldClassesRegisteredByUser.recurring_id !== undefined
            ) {
              const [
                errInVersionOneClasses,
                getVersionOneClasses,
              ] = await classesService.getClassesByRecurringId(
                oldClassesRegisteredByUser.recurring_id
              );
              if (errInVersionOneClasses) {
                logger.error(JSON.stringify(errInVersionOneClasses));
              }

              if (getPathwayIdDetails.code === 'PRGPYT') {
                let index = 28 - getVersionOneClasses.length;
                getVersionOneClasses.forEach((e) => {
                  e.sub_title = classInformation[index].subTitle;
                  e.exercise_id = classInformation[index].exerciseId;
                  e.course_id = classInformation[index].courseId;
                  e.pathway_id = getPathwayId;
                  e.type = 'batch';
                  e.is_enrolled = true;
                  index += 1;
                });
              }
              enrolledClasses.push(...getVersionOneClasses);
            }
          }
          classesRegisteredByUser = await classesService.getIfStudentEnrolled(
            request.auth.credentials.id,
            getPathwayId
          );
          userEnrolled = classesRegisteredByUser.message === 'enrolled';
        }

        const course = await displayService.courseV2(courseWithexercise);
        let recurringId;
        // eslint-disable-next-line
        for (let exercise in course.exercises) {
          course.exercises[exercise].course_name = course.name;
          course.exercises[exercise].sequence_num = sequence;
          course.exercises[exercise].content_type = 'exercise';
          sequence += 1;
          const [
            errorInsingleClasses,
            getSingleClasses,
            // eslint-disable-next-line
          ] = await classesService.getClassByExercise(course.exercises[exercise].id);
          if (errorInsingleClasses) {
            logger.error(JSON.stringify(errorInsingleClasses));
          }
          if (getSingleClasses != null && getSingleClasses.length > 0) {
            // eslint-disable-next-line
            for (let singleClass in getSingleClasses) {
              // eslint-disable-next-line
              const singleClassDetails = await classesService.getFixedClasses(
                getSingleClasses[singleClass],
                request.auth.credentials
              );
              // eslint-disable-next-line
              const singleClassBanner = await classesService.getBannerClassByclassDetails(
                singleClassDetails
              );
              course.exercises[exercise].content.push(singleClassBanner);
            }
          }
          // eslint-disable-next-line
          const Assessment = await assessmentService.findAssessmentByCourseDetails(
            course.exercises[exercise],
            courseId,
            course.name,
            sequence,
            request.auth.credentials
          );
          if (Assessment.length > 0) {
            // eslint-disable-next-line
            for (const singleAssessment in Assessment) {
              course.exercises.push(Assessment[singleAssessment]);
              sequence += 1;
            }
          }

          if (enrolledClasses.length > 0) {
            // eslint-disable-next-line
            for (const e in enrolledClasses) {
              if (
                enrolledClasses[e].course_id === courseId &&
                enrolledClasses[e].exercise_id === course.exercises[exercise].id
              ) {
                // eslint-disable-next-line
                const classesForOldversion = await displayService.filterClassDetails(
                  enrolledClasses[e],
                  sequence,
                  course.name
                );
                sequence += 1;
                course.exercises.push(classesForOldversion);
              }
            }
          }
          if (recurringId === undefined || recurringId === null) {
            if (getPathwayId !== null) {
              if (userEnrolled) {
                recurringId = classesRegisteredByUser.recurring_id;
              } else {
                // eslint-disable-next-line
                const classDetails = await classesService.getcohortClassByExercise(
                  course.exercises[exercise].id,
                  request.auth.credentials
                );
                if (classDetails.length > 0) {
                  recurringId = classDetails[0].recurring_id;
                }
              }
            } else {
              // eslint-disable-next-line
              const classDetails = await classesService.getcohortClassByExercise(
                course.exercises[exercise].id,
                request.auth.credentials
              );
              if (classDetails.length > 0) {
                recurringId = classDetails[0].recurring_id;
              }
            }
          }
          if (recurringId !== undefined) {
            const [
              errInFetching,
              getRecurringClasses,
              // eslint-disable-next-line
            ] = await classesService.getClassesIdByRecurringIdAndExerciseId(
              recurringId,
              course.exercises[exercise].id,
              classesRegisteredByUser
            );
            if (errInFetching) {
              logger.error(JSON.stringify(errInFetching));
            }
            if (getRecurringClasses !== null && getRecurringClasses.length > 0) {
              // eslint-disable-next-line
              const singleClassWithFacilitator = await displayService.getUpcomingClassFacilitators(
                getRecurringClasses
              );
              // eslint-disable-next-line
              for (let singleClass in singleClassWithFacilitator) {
                // eslint-disable-next-line
                const classes = await displayService.filterClassDetails(
                  singleClassWithFacilitator[singleClass],
                  sequence,
                  course.name
                );
                sequence += 1;
                course.exercises.push(classes);
              }
            }
          }
        }
        // eslint-disable-next-line
        course.exercises.sort(function (a, b) {
          return parseFloat(a.sequence_num) - parseFloat(b.sequence_num);
        });
        logger.info('Get complete list of exercises in the course');
        return { course };
      },
    },
  },
  {
    method: 'POST',
    path: '/courseEditor',
    options: {
      description: 'Create courseEditor',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['admin', 'partner', 'volunteer']),
      },
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          type: Joi.string().optional(),
          short_description: Joi.string().optional(),
          logo: Joi.string().optional(),
          course_type: Joi.string().optional(),
          lang_available: Joi.array().items(Joi.string()).optional(), // supported only in V2
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { courseEditorService } = request.services();
        const addCourse = async (txn) => {
          return courseEditorService.createNewCourseEditor(request.payload, txn);
        };
        const newCourse = await h.context.transaction(addCourse);
        logger.info('Create courseEditor');
        return { newCourse };
      },
    },
  },
  {
    method: 'DELETE',
    path: '/courseEditor/{courseId}',
    options: {
      description: 'Delete the course by Id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          // Don't import validation from Models. Write Joi validation since we use the same endpoint to update two models
          courseId: Joi.number().integer().required(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { courseEditorService } = request.services();
        const { courseId } = request.params;
        const deleteACourse = async () => {
          const [err, deleted] = await courseEditorService.deleteCourseById(courseId);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return deleted;
        };
        logger.info('Delete the course by id');
        return h.context.transaction(deleteACourse);
      },
    },
  },
];
