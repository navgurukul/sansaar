const Joi = require('@hapi/joi');
const { getCalendarEvent, patchCalendarEvent } = require('../bot/calendar');

const Classes = require('../models/classes');
const User = require('../models/user');
const { getRouteScope } = require('./helpers');

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
          return h.response(err).code(err.code);
        }
        const { scope } = request.auth.credentials;
        const data = await displayService.upcomingClassesWithEnrolledKey(classes, userId, scope);
        if (request.headers.platform === 'web' || request.headers['version-code'] >= 18) {
          return data;
        }
        return data.map((d) => {
          return { class: d };
        });
      },
    },
  },
  {
    method: 'GET',
    path: '/classes/user/{userId}',
    options: {
      description:
        'Gets a list of all classes a particular user registered to ( Meant for dashboard admin )',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('classAdmin'),
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
      },
      handler: async (request, h) => {
        const { classesService, displayService } = request.services();
        const { userId } = request.params;
        const [err, classes] = await classesService.getClassesByUserId(userId);
        if (err) {
          return h.response(err).code(err.code);
        }
        return { classes: await displayService.getClasses(classes) };
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
        payload: Joi.object({
          registerToAll: Joi.boolean().optional(),
        }),
      },
      handler: async (request, h) => {
        const { classesService, displayService, chatService } = request.services();
        const { classId } = request.params;
        const userId = parseInt(request.auth.credentials.id, 10);
        const payload = [];
        const [errWhileFetching, classDetails] = await classesService.getClassById(classId);
        if (errWhileFetching) {
          return h.response(errWhileFetching).code(errWhileFetching.code);
        }
        let calendarDetails;
        // If users want to register to all instance
        if (request.payload.registerAll && classDetails.recurring_id) {
          const [
            errInFetchingRecurringClasses,
            allRecurringClasses,
          ] = await classesService.getClassesByRecurringId(classDetails.recurring_id);
          if (errInFetchingRecurringClasses) {
            return h
              .response(errInFetchingRecurringClasses)
              .code(errInFetchingRecurringClasses.code);
          }
          const data = await displayService.upcomingClassesWithEnrolledKey(
            allRecurringClasses,
            userId
          );
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
              const regUsers = await getCalendarEvent(c.calendar_event_id);
              if (regUsers.data.attendees) emailList.push(...regUsers.data.attendees);
              emailList.push({ email: request.auth.credentials.email });
              await patchCalendarEvent(_c, emailList);
            } catch (err) {
              console.log(err);
              console.log('Calendar event error');
            }
          }
        }
        /* eslint-enable */
        const [errWhileRegistering, registered] = await classesService.registerToClassById(payload);
        if (errWhileRegistering) {
          return h.response(errWhileRegistering).code(errWhileRegistering.code);
        }
        try {
          chatService.sendClassJoinConfirmation(classDetails, userId);
        } catch {
          // eslint-disable-next-line
        }
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
        payload: Joi.object({
          unregisterAll: Joi.boolean().optional(),
        }),
      },
      handler: async (request, h) => {
        const { classesService, displayService, chatService } = request.services();
        const { classId } = request.params;
        const { id, email } = request.auth.credentials;
        const [userId, userEmail] = [id, email];
        const classIds = [];
        const [errWhileFetching, classDetails] = await classesService.getClassById(classId);
        if (errWhileFetching) return h.response(errWhileFetching).code(errWhileFetching.code);
        let calendarDetails;
        if (request.payload.unregisterAll && classDetails.recurring_id) {
          const [
            errInFetchingRecurringClasses,
            allRecurringClasses,
          ] = await classesService.getClassesByRecurringId(classDetails.recurring_id);
          if (errInFetchingRecurringClasses) {
            return h
              .response(errInFetchingRecurringClasses)
              .code(errInFetchingRecurringClasses.code);
          }
          const data = await displayService.upcomingClassesWithEnrolledKey(
            allRecurringClasses,
            userId
          );
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
            const regUsers = await getCalendarEvent(c.calendar_event_id);
            if (regUsers.data.attendees)
              emailList = regUsers.data.attendees.filter((e) => {
                return e.email !== userEmail;
              });
            await patchCalendarEvent(c, emailList);
          } catch (err) {
            // eslint-disable-next-line
            console.log('Calendar event error');
            console.log(err);
          }
        }
        /* eslint-enable */

        const [
          errWhileUnregistering,
          removedRegistration,
        ] = await classesService.removeRegistrationById(classIds, userId);
        if (errWhileUnregistering) {
          return h.response(errWhileUnregistering).code(errWhileUnregistering.code);
        }
        try {
          chatService.classDropoutMessage(userId);
        } catch {
          // eslint-disable-next-line
        }
        return removedRegistration;
      },
    },
  },
];
