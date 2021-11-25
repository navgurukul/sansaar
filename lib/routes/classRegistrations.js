const Joi = require('@hapi/joi');
const Classes = require('../models/classes');
const logger = require('../../server/logger');

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
        const { classesService, displayService } = request.services();
        const userId = request.auth.credentials.id;
        const [err, classes] = await classesService.getClasses(userId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const { scope } = request.auth.credentials;
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
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        headers: Joi.object({
          'register-to-all': Joi.boolean().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const {
          classesService,
          displayService,
          chatService,
          userService,
          calendarService,
        } = request.services();
        const { classId } = request.params;
        const userId = parseInt(request.auth.credentials.id, 10);
        const payload = [];
        const [errWhileFetching, classDetails] = await classesService.getClassById(classId);
        if (errWhileFetching) {
          logger.error(JSON.stringify(errWhileFetching));
          return h.response(errWhileFetching).code(errWhileFetching.code);
        }
        let calendarDetails;
        // If users want to register to all instance
        if (request.headers['register-to-all'] && classDetails.recurring_id) {
          const [
            errInFetchingRecurringClasses,
            allRecurringClasses,
          ] = await classesService.getClassesByRecurringId(classDetails.recurring_id);
          if (errInFetchingRecurringClasses) {
            logger.error(JSON.stringify(errInFetchingRecurringClasses));
            return h
              .response(errInFetchingRecurringClasses)
              .code(errInFetchingRecurringClasses.code);
          }
          const data = await displayService.upcomingClassesWithEnrolledKey(
            allRecurringClasses,
            userId
          );
          const [err, user] = await userService.getUserByEmail(request.auth.credentials.email);
          if (err) {
            // eslint-disable-next-line
            logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(err));
          }
          if (user[0].email !== data[0].facilitator.email && user[0].chat_id) {
            await chatService.addUsersToMerakiClass(
              data[0].parent_class.cohort_room_id,
              `@${user[0].chat_id}:navgurukul.org`
            );
            await chatService.sendInitialMessageToStudent(data[0].title, user[0].id);
          }
          calendarDetails = data;
        } else {
          calendarDetails = [classDetails];
        }
        // patch attendees in the calendar event
        /* eslint-disable */
        for (const c of calendarDetails) {
          // removing start_time & end_time because it is stored in UTC in DB and will update the calendar event time
          const { start_time, end_time, ..._c } = c;
          if (!c.enrolled) {
            payload.push({ user_id: userId, class_id: c.id, registered_at: new Date() });
            const emailList = [];
            // letting google calendar deciding the previous attendees
            try {
              const regUsers = await calendarService.getCalendarEvent(
                c.calendar_event_id,
                classDetails.facilitator_id,
                classDetails.facilitator_email
              );
              if (regUsers.data.attendees) emailList.push(...regUsers.data.attendees);
              if (!request.auth.credentials.email.includes('@fake.com')) {
                emailList.push({ email: request.auth.credentials.email });
              }
              await calendarService.patchCalendarEvent(_c, emailList);
            } catch (err) {
              logger.error(
                `id- ${request.auth.credentials.id}: Calendar event error- ` + JSON.stringify(err)
              );
              console.log('Calendar event error');
            }
          }
        }
        const [errWhileRegistering, registered] = await classesService.registerToClassById(payload);
        if (errWhileRegistering) {
          logger.error(
            `id- ${request.auth.credentials.id}: ` + JSON.stringify(errWhileRegistering)
          );
          /* eslint-enable */
          return h.response(errWhileRegistering).code(errWhileRegistering.code);
        }
        try {
          chatService.sendClassJoinConfirmation(classDetails, userId);
        } catch {
          // eslint-disable-next-line
        }
        logger.info(`id- ${request.auth.credentials.id}: Registers to a specific class`);
        return registered;
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
        headers: Joi.object({
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
        if (request.headers['unregister-all'] && classDetails.recurring_id) {
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
        /* eslint-disable */
        for (const c of calendarDetails) {
          classIds.push(c.id);
          let emailList = [];
          // letting google calendar deciding the previous attendees
          try {
            const regUsers = await calendarService.getCalendarEvent(
              c.calendar_event_id,
              classDetails.facilitator_id,
              classDetails.facilitator_email
            );
            if (regUsers.data.attendees)
              emailList = regUsers.data.attendees.filter((e) => {
                return e.email !== userEmail;
              });
            await calendarService.patchCalendarEvent(c, emailList);
          } catch (err) {
            // eslint-disable-next-line
            logger.error(
              `id- ${request.auth.credentials.id}: Calendar event error- ` + JSON.stringify(err)
            );
          }
        }
        /* eslint-enable */

        const [
          errWhileUnregistering,
          removedRegistration,
        ] = await classesService.removeRegistrationById(classIds, userId);
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
];
