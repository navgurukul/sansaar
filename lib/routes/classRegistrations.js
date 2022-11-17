const Joi = require('@hapi/joi');
const Classes = require('../models/classes');
const logger = require('../../server/logger');
const classInformation = require('../helpers/classesInfo/pythonClassInfo.json');
const { UTCToISTConverter } = require('../helpers/index');

module.exports = [
  {
    method: 'GET',
    path: '/classes',
    options: {
      description: 'Gets a list of all upcoming classes',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        headers: Joi.object({
          platform: Joi.string().valid('web', 'android').optional(),
          'version-code': Joi.string().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { classesService, displayService, userService } = request.services();
        const userId = request.auth.credentials.id;
        const { scope } = request.auth.credentials;
        // eslint-disable-next-line
        const [error, user] = await userService.findById(userId);
        if (error) {
          logger.error(JSON.stringify(error));
          return h.response(error).code(error.code);
        }
        // const [err, classes] = await classesService.getClasses(scope, user.partner_id);
        // get classes for a week
        const duration = UTCToISTConverter(new Date(new Date().setDate(new Date().getDate() + 7)));
        const [err, classes] = await classesService.getAllPartnerClasses(
          duration,
          scope,
          user.partner_id
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const data = await displayService.upcomingClassesWithEnrolledKey(classes, userId, scope);
        if (request.headers.platform === 'web' || request.headers['version-code'] >= 18) {
          return data;
        }
        logger.info('Gets a list of all upcoming classes');
        return data.map((d) => {
          return { class: d };
        });
      },
    },
  },

  {
    method: 'POST',
    path: '/classes/{classId}/register',
    options: {
      description: 'Registers to a specific class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        // query: Joi.object({
        //   'register-all': Joi.boolean().optional(),
        // }),
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        headers: Joi.object({
          'register-to-all': Joi.boolean().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        // forcefully enroll student's in all classes of the particular batch.
        if (
          request.headers['register-to-all'] === false ||
          request.headers['register-to-all'] === undefined
        ) {
          request.headers['register-to-all'] = true;
        }
        const { classesService } = request.services();
        const { classId } = request.params;
        const [err, register] = await classesService.registerClasses(
          classId,
          request.headers['register-to-all'],
          request.auth.credentials,
          h
        );
        if (err) {
          // eslint-disable-next-line
          logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(err));
          return h.response(err).code(err.code);
        }

        return register;
      },
    },
  },
  {
    method: 'DELETE',
    path: '/classes/{classId}/unregister',
    options: {
      description: 'Cancel registration to a specific class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        query: Joi.object({
          'unregister-all': Joi.boolean().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const {
          classesService,
          displayService,
          userService,
          chatService,
          calendarService,
        } = request.services();
        const { classId } = request.params;
        const { id, email } = request.auth.credentials;
        const [userId, userEmail] = [id, email];
        const classIds = [];
        const [errWhileFetching, classDetails] = await classesService.getClassById(classId);
        if (errWhileFetching) {
          // eslint-disable-next-line
          logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(errWhileFetching));
          return h.response(errWhileFetching).code(errWhileFetching.code);
        }
        let calendarDetails;
        if (request.query['unregister-all'] && classDetails.recurring_id) {
          const [
            errInFetchingRecurringClasses,
            allRecurringClasses,
          ] = await classesService.getClassesByRecurringId(classDetails.recurring_id);
          if (errInFetchingRecurringClasses) {
            /* eslint-disable */
            logger.error(
              `id- ${request.auth.credentials.id}: ` + JSON.stringify(errInFetchingRecurringClasses)
            );
            return h
              .response(errInFetchingRecurringClasses)
              .code(errInFetchingRecurringClasses.code);
          }
          const [
            errInFetchingOldRecurringclasses,
            OldRecurringclasses,
          ] = await classesService.getOldClassesByRecurringId(classDetails.recurring_id);
          if (errInFetchingOldRecurringclasses) {
            logger.error(`classId- ${classId} ` + JSON.stringify(errInFetchingOldRecurringclasses));
            return h
              .response(errInFetchingOldRecurringclasses)
              .code(errInFetchingOldRecurringclasses.code);
          }
          for (const i in OldRecurringclasses) {
            if (OldRecurringclasses[i].sub_title !== null) {
              let [err, revisionClasses] = await classesService.getClassBySubtitle(
                classId,
                OldRecurringclasses[i].sub_title,
                OldRecurringclasses[i].partner_id
              );
              if (err) {
                // eslint-disable-next-line
                logger.error(`classId- ${classId} ` + JSON.stringify(err));
                return h.response(err).code(err.code);
              }
              for (let i in revisionClasses) {
                const revision = await classesService.getFixedClasses(
                  revisionClasses[i],
                  request.auth.credentials
                );
                if (revisionClasses[i].is_enrolled) {
                  const [
                    errWhileFetchingRevisionClass,
                    FetchingRevisionClass,
                  ] = await classesService.getClassById(revision.id);
                  if (errWhileFetchingRevisionClass) {
                    logger.error(
                      `classId- ${classId} ` + JSON.stringify(errWhileFetchingRevisionClass)
                    );
                    return h
                      .response(errWhileFetchingRevisionClass)
                      .code(errWhileFetchingRevisionClass.code);
                  }
                  allRecurringClasses.push(FetchingRevisionClass);
                }
              }
            }
          }
          const data = await displayService.upcomingClassesWithEnrolledKey(
            allRecurringClasses,
            userId
          );
          const [error, user] = await userService.getUserByEmail(request.auth.credentials.email);
          if (error) {
            // eslint-disable-next-line
            logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(error));
          }
          if (user[0].email !== data[0].facilitator.email) {
            await chatService.removeUsersFromCohort(
              data[0].parent_class.cohort_room_id,
              `@${user[0].chat_id}:navgurukul.org`
            );
          }
          calendarDetails = data;
        } else {
          calendarDetails = [classDetails];
        }

        var { start_time, end_time, ..._c } = calendarDetails[0];
        var c = calendarDetails[0];

        /* eslint-disable */
        for (const c of calendarDetails) {
          classIds.push(c.id);
        }
        /* eslint-enable */
        const [
          errWhileUnregistering,
          removedRegistration,
        ] = await classesService.removeRegistrationById(classIds, userId);

        // call calendar patch API when google_registration_status will be true.
        if (removedRegistration.google_registration_status === true) {
          let emailList = [];
          let regUsers;
          try {
            regUsers = await calendarService.getCalendarEvent(
              c.recurring_id !== null ? c.parent_class.calendar_event_id : c.calendar_event_id,
              classDetails.facilitator_id,
              classDetails.facilitator_email
            );
            if (regUsers.data.attendees)
              emailList = regUsers.data.attendees.filter((e) => {
                return e.email !== userEmail;
              });
            await calendarService.patchCalendarEvent(c, emailList);
          } catch (err) {
            /* eslint-disable */
            logger.error(
              `id- ${request.auth.credentials.id}: Calendar event error- ` + JSON.stringify(err)
            );
          }
        }

        if (errWhileUnregistering) {
          logger.error(
            /* eslint-disable */
            `id- ${request.auth.credentials.id}: ` + JSON.stringify(errWhileUnregistering)
          );
          return h.response(errWhileUnregistering).code(errWhileUnregistering.code);
        }
        try {
          chatService.classDropoutMessage(userId);
        } catch {
          // eslint-disable-next-line
        }
        logger.info('Cancel registration to a specific class');
        return removedRegistration;
      },
    },
  },
  {
    method: 'GET',
    path: '/classes/studentEnrolment',
    options: {
      description: 'Get students data and class activities',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        query: Joi.object({
          pathway_id: Joi.number(),
        }),
      },
      handler: async (request) => {
        const { classesService, pathwayServiceV2, pathwayService } = request.services();
        const [errInPathwayIdDetails, getPathwayIdDetails] = await pathwayServiceV2.findById(
          request.query.pathway_id
        );
        if (errInPathwayIdDetails) {
          logger.error(JSON.stringify(errInPathwayIdDetails));
        }
        if (getPathwayIdDetails !== null && getPathwayIdDetails !== undefined) {
          const [errInOldPathway, getOldPathway] = await pathwayService.getOldPathwayIdByCode(
            getPathwayIdDetails.code
          );
          if (errInOldPathway) {
            logger.error(JSON.stringify(errInOldPathway));
          }
          if (getOldPathway !== null && getOldPathway !== undefined) {
            const oldData = await classesService.getIfStudentEnrolled(
              request.auth.credentials.id,
              getOldPathway[0].id
            );
            if (oldData.message === 'enrolled') {
              return { message: oldData.message, code: 200 };
            }
          }
        }
        const data = await classesService.getIfStudentEnrolled(
          request.auth.credentials.id,
          request.query.pathway_id
        );
        return { message: data.message, code: 200 };
      },
    },
  },
  {
    method: 'POST',
    path: '/classes/AddCourseAndExerciseIds',
    options: {
      description: 'Get students data and class activities',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request) => {
        const { classesService, pathwayServiceV2, pathwayService } = request.services();
        const pathway = await pathwayServiceV2.findByCode('PRGPYT');
        let result = false;
        const [err, data] = await classesService.getOldClassesRecurringId();
        if (err) {
          logger.error(JSON.stringify(err));
        }
        if (data !== null && data !== undefined && data.length > 0)
          for (const i in data) {
            const [
              errInVersionOneClasses,
              getVersionOneClasses,
            ] = await classesService.getClassesByRecurringIdForUpdatingDetails(data[i]);
            if (errInVersionOneClasses) {
              logger.error(JSON.stringify(errInVersionOneClasses));
            }
            let index = 28 - getVersionOneClasses.length;
            getVersionOneClasses.forEach((e) => {
              e.sub_title = classInformation[index].subTitle;
              e.exercise_id = classInformation[index].exerciseId;
              e.course_id = classInformation[index].courseId;
              e.pathway_id = pathway.id;
              index += 1;
            });
            result = true;
            await classesService.patchV2IdsInClassesToCourses(getVersionOneClasses);
          }
        return {
          success: result,
        };
      },
    },
  },
];
