/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const fs = require('fs');
const path = require('path');
const Courses = require('../models/courses');
const logger = require('../../server/logger');
const classInformation = require('../helpers/classesInfo/pythonClassInfo.json');

const androidVersions = {
  latest: 35
};

module.exports = [
  {
    method: 'GET',
    path: '/courses',
    options: {
      description: 'Get all courses ⓜ',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const {
          coursesService,
          displayService,
          coursesServiceV2,
          progressTrackingService,
        } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, courses] = await coursesServiceV2.getAllCourses();
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          // eslint-disable-next-line
          for (const p of courses) {
            p.completed_portion = 0;
            if (request.auth.credentials !== null) {
              // eslint-disable-next-line
              const [error, percentage] = await progressTrackingService.getProgressTrackPercentage(
                request.auth.credentials.id,
                p.id
              );
              if (error) {
                logger.error(JSON.stringify(error));
                return h.response(error).code(error.code);
              }
              p.completed_portion = percentage;
            }
          }
          if (request.auth.isAuthenticated) {
            const authUser = request.auth.credentials;
            const allCourses = await displayService.allCoursesWithEnrolled(courses, authUser);
            logger.info('Get all courses');
            return allCourses;
          }
          logger.info('Get all courses');
          return courses;
        }
        const [err, courses] = await coursesService.getAllCourses();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (request.auth.isAuthenticated) {
          const authUser = request.auth.credentials;
          const allCourses = await displayService.allCoursesWithEnrolled(courses, authUser);
          logger.info('Get all courses');
          return allCourses;
        }
        logger.info('Get all courses');
        return courses;
      },
    },
  },

  {
    method: 'POST',
    path: '/courseEditor/ImageUploadS3',
    options: {
      payload: {
        maxBytes: 10485760,
        parse: true,
        output: 'stream',
        allow: ['multipart/form-data'],
        multipart: true,
      },
      description: 'coursesImageUploadS3',
      notes: 'image-upload',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          payloadType: 'form',
        },
      },
      validate: {
        payload: Joi.object({
          image: Joi.any().meta({ swaggerType: 'file' }).description('file').required(),
        }),
      },
      handler: async (request) => {
        const { coursesServiceV2 } = request.services();
        const data = await coursesServiceV2.uploadToS3(request.payload.image);
        return data;
      },
    },
  },
  {
    method: 'POST',
    path: '/courseEditor/ImageUploadS3/byUrl',
    options: {
      description: 'course editor upload by url',
      notes: 'image-upload',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          payloadType: 'form',
        },
      },
      validate: {
        payload: Joi.object({
          url: Joi.string().required(),
        }),
      },
      handler: async (request) => {
        return {
          success: 1,
          file: {
            url: request.payload.url,
          },
        };
      },
    },
  },
  // No use case, dropped in v2
  {
    method: 'GET',
    path: '/courses/recommended',
    options: {
      description: 'Get recommended courses',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { coursesService, coursesServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, courses] = await coursesServiceV2.getRecommendedCourses();
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info('Get recommended courses');
          return courses;
        }
        const [err, courses] = await coursesService.getRecommendedCourses();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get recommended courses');
        return courses;
      },
    },
  },

  {
    method: 'GET',
    path: '/courses/{courseId}/exercises',
    options: {
      description: 'Get complete list of exercises in the course ⓜ',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        // mode: 'optional',
      },
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
        query: Joi.object({
          lang: Joi.string(),
        }),
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        // const user = request.auth.credentials;
        const { courseId } = request.params;
        const {
          coursesService,
          coursesServiceV2,
          pathwayService,
          pathwayServiceV2,
          displayService,
          assessmentService,
          classesService,
        } = request.services();
        let sequence = Math.floor(Math.random() * 1000 + 1);
        /**
         * EXPERIMENTAL
         *
         * TO BE REMOVED
         */
        if (courseId === 1000) {
          const data = fs.readFileSync(path.resolve(__dirname, '../_mockAPIs/classTopic.json'));
          return data.toString();
        }

        if (courseId === 2000) {
          const data = fs.readFileSync(path.resolve(__dirname, '../_mockAPIs/typing.json'));
          return data.toString();
        }
        /**
         * EXPERIMENTAL
         *
         * TO BE REMOVED
         */
        const language =
          ['hi', 'en', 'te', 'mr', 'ta'].indexOf(request.query.lang) > -1
            ? request.query.lang
            : 'en';
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          let classesRegisteredByUser;
          let oldClassesRegisteredByUser;
          const [err, courseWithexercise] = await coursesServiceV2.getCourseExercise(
            courseId,
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
          if (getPathwayId !== null && request.auth.credentials !== null && request.auth.credentials.id) {
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
            if (getSingleClasses != null && getSingleClasses.length > 0 && request.auth.credentials.id) {
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
            if (appVersion > androidVersions.latest) {
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
            }

            if (enrolledClasses.length > 0 && request.auth.credentials.id) {
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
            if (request.auth.credentials.id) {
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
            }
            if (recurringId !== undefined && request.auth.credentials.id) {
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
                let classesIds = []
                course.exercises.forEach((dic) => {
                  if ('title' in dic & 'start_time' in dic & 'end_time' in dic) {
                    classesIds.push(dic.id)
                  }
                })
                for (let singleClass in singleClassWithFacilitator) {
                  // eslint-disable-next-line
                  const classes = await displayService.filterClassDetails(
                    singleClassWithFacilitator[singleClass],
                    sequence,
                    course.name
                  );
                  sequence += 1;
                  if (!classesIds.includes(classes.id)) {
                    course.exercises.push(classes);
                  }
                }
              }
            }
          }
          // eslint-disable-next-line
          course.exercises.sort(function (a, b) {
            return parseFloat(a.sequence_num) - parseFloat(b.sequence_num);
          });
          logger.info('Get complete list of exercises in the course');
          // if (flag) {
          //   redisClient.set(
          //     `courseV2_${language}_${courseId}_${user ? user.partner_id : null}`,
          //     JSON.stringify(course)
          //   ); // setting course data in cache with default expiry
          // }
          const PythonCourseIds = [87, 89, 17, 8, 10, 11, 88, 86, 21].includes(courseId);
          if (PythonCourseIds) {
            course.exercises[course.exercises.length - 1].project_id = 890907;
            return { course };
          }
          return { course };
        }

        const [err, course] = await coursesService.getCourseExercise(courseId, language);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get complete list of exercises in the course');
        // if (flag) {
        //   redisClient.set(
        //     `courseV1_${language}_${courseId}_${user ? user.partner_id : null}`,
        //     JSON.stringify(course)
        //   );
        // }
        return { course };
      },
    },
  },

  // v2 API
  {
    method: 'GET',
    path: '/courses/{courseId}/exercises/v2',
    options: {
      description: 'Get complete list of exercises in the course ⓜ',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
        query: Joi.object({
          lang: Joi.string(),
        }),
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        // const user = request.auth.credentials;
        const { courseId } = request.params;
        const {
          coursesService,
          coursesServiceV2,
          pathwayService,
          pathwayServiceV2,
          displayService,
          assessmentService,
          classesService,
        } = request.services();
        let sequence = Math.floor(Math.random() * 1000 + 1);

        const language =
          ['hi', 'en', 'te', 'mr', 'ta'].indexOf(request.query.lang) > -1
            ? request.query.lang
            : 'en';
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          let classesRegisteredByUser;
          let oldClassesRegisteredByUser;
          const [err, courseWithexercise] = await coursesServiceV2.getCourseExercise(
            courseId,
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
          if (getPathwayId !== null && request.auth.credentials !== null && request.auth.credentials.id) {
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
                getPathwayId
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
            if (getSingleClasses != null && getSingleClasses.length > 0 && request.auth.credentials.id) {
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
            if (appVersion > androidVersions.latest) {
              // eslint-disable-next-line
              const Assessment = await assessmentService.findAssessmentByCourseDetailsV2(
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
            }

            if (enrolledClasses.length > 0 && request.auth.credentials.id) {
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
            if (request.auth.credentials.id) {
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
            }
            if (recurringId !== undefined && request.auth.credentials.id) {
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
                let classesIds = []
                course.exercises.forEach((dic) => {
                  if ('title' in dic & 'start_time' in dic & 'end_time' in dic) {
                    classesIds.push(dic.id)
                  }
                })
                for (let singleClass in singleClassWithFacilitator) {
                  // eslint-disable-next-line
                  const classes = await displayService.filterClassDetails(
                    singleClassWithFacilitator[singleClass],
                    sequence,
                    course.name
                  );
                  sequence += 1;
                  if (!classesIds.includes(classes.id)) {
                    course.exercises.push(classes);
                  }
                }
              }
            }
          }
          // eslint-disable-next-line
          course.exercises.sort(function (a, b) {
            return parseFloat(a.sequence_num) - parseFloat(b.sequence_num);
          });
          logger.info('Get complete list of exercises in the course');
          // if (flag) {
          //   redisClient.set(
          //     `courseV2_${language}_${courseId}_${user ? user.partner_id : null}`,
          //     JSON.stringify(course)
          //   ); // setting course data in cache with default expiry
          // }
          const PythonCourseIds = [87, 89, 17, 8, 10, 11, 88, 86, 21].includes(courseId);
          if (PythonCourseIds) {
            course.exercises[course.exercises.length - 1].project_id = 890907;
            return { course };
          }
          return { course };
        }

        const [err, course] = await coursesService.getCourseExercise(courseId, language);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get complete list of exercises in the course');
        // if (flag) {
        //   redisClient.set(
        //     `courseV1_${language}_${courseId}_${user ? user.partner_id : null}`,
        //     JSON.stringify(course)
        //   );
        // }
        return { course };
      },
    },
  },

  //v3 slug Integration into the courses
  {
    method: 'GET',
    path: '/courses/{courseId}/content/slug',
    options: {
      description: 'Get complete list of exercises in the course ⓜ',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          courseId: Courses.field('id').required(),
        }),
        query: Joi.object({
          lang: Joi.string().required(),
        }),
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { courseId } = request.params;
        const {
          coursesServiceV2,
          classesService,
        } = request.services();
        const language =
          ['hi-IN', 'en', 'te-IN', 'kn-IN', 'te-IN', 'or-IN'].indexOf(request.query.lang) > -1
            ? request.query.lang
            : 'en';
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          let oldClassesRegisteredByUser;
          const [err, courseWithexercise] = await coursesServiceV2.getCourseExercisesBySlug(
            courseId,
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
          if (getPathwayId !== null) {
            oldClassesRegisteredByUser = await classesService.getIfStudentEnrolled(
              request.auth.credentials.id,
              getPathwayId
            );
            userEnrolledInOldBatches = oldClassesRegisteredByUser.message === 'enrolled';
            if (
              userEnrolledInOldBatches &&
              oldClassesRegisteredByUser.recurring_id !== null &&
              oldClassesRegisteredByUser.recurring_id !== undefined
            ) {
              const [
                errInclassDetails,
                classDetails,
              ] = await classesService.getClassesByRecurringId(
                oldClassesRegisteredByUser.recurring_id
              );
              for (let data of classDetails) {
                let id = data.id;
                let [err, slug_id, classData] = await classesService.getClassByClassId(id, courseWithexercise.name, getPathwayId, courseWithexercise.id);
                if (slug_id !== null && slug_id !== undefined && classData !== null && classData !== undefined) {
                  courseWithexercise.course_content.forEach((item, index) => {
                    if (item.content_type === 'exercise' && item.slug_id === slug_id) {
                      // Find the index of the item with matching slug_id
                      let insertIndex = index + 1; // Insert just after the current item
                      courseWithexercise.course_content.splice(insertIndex, 0, classData[0]); // Insert 'classData' into the array
                    }
                  });
                }
                if (err) {
                  logger.error(JSON.stringify(err));
                }
              }
              return { course: courseWithexercise };
            }
          }
          return { course: courseWithexercise };
        }
      },
    },
  },
  // No use case, dropped in v2
  {
    method: 'POST',
    path: '/courses/{courseId}/enroll',
    options: {
      description: 'Enroll in the course with the given ID.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
      },
      handler: async (request, h) => {
        const { coursesService } = request.services();
        const authUser = request.auth.credentials;
        const { courseId } = request.params;
        const courseEnroll = async (txn) => {
          const [err, enrolled] = await coursesService.enrollInCourse(courseId, authUser, txn);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info('enrolled');
          return enrolled;
        };
        const enrollInCourse = await h.context.transaction(courseEnroll);
        logger.info('Enroll in the course with the given ID');
        return enrollInCourse;
      },
    },
  },

  {
    method: 'GET',
    path: '/courses/name',
    options: {
      description:
        'Get course by name for identifying whether course exist or not while running courseSeeder script ⓜ',
      tags: ['api'],
      validate: {
        query: Joi.object({
          name: Courses.field('name'),
          courseType: Joi.string().valid('markdown', 'json').allow(null).optional(),
        }),
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { coursesService, coursesServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, course] =
            request.query.courseType || request.query.courseType === 'null'
              ? await coursesServiceV2.findByCourseName(
                request.query.name,
                request.query.courseType
              )
              : await coursesServiceV2.findByCourseName(request.query.name);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info('Get course by name');
          return { course };
        }
        const [err, course] =
          request.query.courseType || request.query.courseType === 'null'
            ? await coursesService.findByCourseName(request.query.name, request.query.courseType)
            : await coursesService.findByCourseName(request.query.name);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get course by name');
        return { course };
      },
    },
  },

  {
    method: 'PUT',
    path: '/courses/seed',
    options: {
      description: 'Seed course',
      tags: ['api'],
      validate: {
        query: Joi.object({
          course: Joi.string(),
          updateDB: Joi.boolean(),
        }),
      },
      handler: async (request) => {
        const { courseParserService } = request.services();
        const course = await courseParserService.courseParser(
          request.query.course,
          request.query.updateDB
        );
        logger.info('Seed course');
        return course;
      },
    },
  },

  {
    method: 'GET',
    path: '/exercises/ExerciseDataMigratingWithSlugIDs',
    options: {
      description: 'migrating the exercises data from exercise_completion_V2 table to exercise_history table',
      tags: ['api'],
      handler: async (request) => {
        const { coursesServiceV2 } = request.services();
        const course = await coursesServiceV2.migrateExerciserDataWithSlug();
        logger.info('migrating the exercises data from exercise_completion_V2 table to exercise_history table');
        return course;
      },
    },
  },

  // create a get api for functions migratePathwaysOngoingTopicOutcome
  {
    method: 'GET',
    path: '/aa/migratePathwaysOngoingTopicOutcome',
    options: {
      description: 'migratePathwaysOngoingTopicOutcome',
      tags: ['api'],
      handler: async (request) => {
        const { coursesServiceV2 } = request.services();
        const course = await coursesServiceV2.migratePathwaysOngoingTopicOutcome();
        logger.info('migratePathwaysOngoingTopicOutcome');
        return course;
      },
    },
  },
];
