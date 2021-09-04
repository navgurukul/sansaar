const Joi = require('@hapi/joi').extend(require('@joi/date'));
const _ = require('lodash');
const Boom = require('@hapi/boom');
const { getRouteScope } = require('./helpers');
const {
  createCalendarEvent,
  patchCalendarEvent,
  deleteCalendarEvent,
  getRecurringInstances,
} = require('../bot/calendar');

const Classes = require('../models/classes');
const { parseISOStringToDateObj } = require('../helpers/index');

const buildSchema = (requestType) => {
  return Joi.object({
    title: requestType === 'POST' ? Joi.string().required() : Joi.string().optional(),
    description: requestType === 'POST' ? Joi.string().required() : Joi.string().optional(),
    facilitator_id:
      requestType === 'POST' ? Joi.number().integer().greater(0).optional() : Joi.forbidden(),
    facilitator_name: requestType === 'POST' ? Joi.string().optional() : Joi.forbidden(),
    facilitator_email:
      requestType === 'POST'
        ? Joi.string()
            .optional()
            .pattern(
              // eslint-disable-next-line
              /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            )
        : Joi.forbidden(),
    start_time:
      requestType === 'POST'
        ? Joi.date().required().min('now')
        : Joi.date()
            .optional()
            .less(Joi.ref('end_time'))
            .when('end_time', { is: Joi.exist(), then: Joi.date().required() }),
    end_time:
      requestType === 'POST'
        ? Joi.date().required().greater(Joi.ref('start_time'))
        : Joi.date().optional(),
    exercise_id: Joi.number(),
    course_id: Joi.number(),
    category_id:
      requestType === 'POST'
        ? Joi.number().integer().required()
        : Joi.number().integer().optional(),
    video_id: Joi.string().optional(),
    lang:
      requestType === 'POST'
        ? Joi.string().valid('hi', 'en', 'te', 'ta').lowercase().required()
        : Joi.string().valid('hi', 'en', 'te', 'ta').lowercase().optional(),
    type:
      requestType === 'POST'
        ? Joi.string().valid('workshop', 'doubt_class', 'cohort').required()
        : Joi.string().valid('workshop', 'doubt_class', 'cohort').optional(),
    meet_link: Joi.string(),
    calendar_event_id: Joi.string(),
    material_link: Joi.string().uri().optional(),
    max_enrolment: Joi.number().integer().greater(0).optional(),
    frequency: Joi.string().valid('DAILY', 'WEEKLY').optional(),
    on_days: Joi.array()
      .when('frequency', {
        is: Joi.exist(),
        then: Joi.array().items(
          Joi.string().valid('SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'BYMONTH')
        ),
        otherwise: Joi.forbidden(),
      })
      .optional(),
    occurrence: Joi.number()
      .when('frequency', {
        is: Joi.exist(),
        then: Joi.number().integer().greater(0),
        otherwise: Joi.forbidden(),
      })
      .optional(),
    until: Joi.date()
      .when('occurrence', {
        not: Joi.exist(),
        then: Joi.date().format('YYYY-MM-DD').utc().greater(Joi.ref('end_time')),
        otherwise: Joi.forbidden(),
      })
      .optional(),
    updateAll: requestType === 'PUT' ? Joi.boolean() : Joi.forbidden(),
  });
};

module.exports = [
  {
    method: 'GET',
    path: '/classes/all',
    options: {
      description: 'Get a list of all classes',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        query: Joi.object({
          startDate: Joi.date().optional(),
        }),
      },
      handler: async (request, h) => {
        const { classesService, displayService } = request.services();
        let { startDate } = request.query;
        if (startDate === undefined) {
          startDate = new Date();
        }
        const [err, allClasses] = await classesService.getAllClasses(startDate);
        if (err) {
          return h.response(err).code(err.code);
        }
        return displayService.getUpcomingClassFacilitators(allClasses);
      },
    },
  },
  {
    method: 'GET',
    path: '/classes/upcoming',
    options: {
      description: 'Get a list of all classes user is yet to register to by filters',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'required',
      },
      validate: {
        query: Joi.object({
          startDate: Joi.date().optional(),
          endDate: Joi.date().min(Joi.ref('startDate')).optional(),
          lang: Classes.field('lang').optional(),
          classType: Classes.field('type').optional(),
        }),
      },
      handler: async (request, h) => {
        const { classesService, displayService } = request.services();
        let { query } = request;
        if (query.startDate === undefined) {
          const UTCTime = new Date();
          const ISTTime = new Date(UTCTime - new Date().getTimezoneOffset() * 60000);
          query = { ...query, endDate: ISTTime };
        }
        const [err, classes] = await classesService.getUpcomingClasses(
          query,
          request.auth.credentials.id
        );
        if (err) {
          return h.response(err).code(err.code);
        }
        return { classes: await displayService.getUpcomingClassFacilitators(classes) };
      },
    },
  },
  {
    method: 'POST',
    path: '/classes',
    options: {
      description: 'Creates a class and returns the created class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        // scope: getRouteScope(['volunteer', 'teacher', 'partner']),
      },
      validate: {
        payload: buildSchema('POST'),
      },
      handler: async (request, h) => {
        const { classesService, userService, displayService } = request.services();
        let { payload } = request;
        let facilitator;
        const recurringEvents = [];

        ///
        if (payload.facilitator_id !== undefined) {
          const [err, user] = await userService.findById(payload.facilitator_id);
          if (err) {
            return h.response(err).code(err.code);
          }
          facilitator = await displayService.userProfile(user);
        } else if (
          payload.facilitator_id === undefined &&
          payload.facilitator_email !== undefined
        ) {
          facilitator = { name: payload.facilitator_name, email: payload.facilitator_email };
        } else {
          payload = {
            ...payload,
            facilitator_id: request.auth.credentials.id,
          };
          const [err, user] = await userService.findById(payload.facilitator_id);
          if (err) {
            return h.response(err).code(err.code);
          }
          facilitator = await displayService.userProfile(user);
        }
        ///

        if (payload.on_days) payload.on_days = payload.on_days.join(',');

        // #TODO

        try {
          const calendarEvent = await createCalendarEvent(payload, facilitator);
          const meetLink = calendarEvent.data.hangoutLink.split('/').pop();
          // If the intent is to create a recurring event
          if (payload.frequency) {
            const allEvents = await getRecurringInstances(calendarEvent.data.id);
            // capture all instances of a recurring event
            recurringEvents.push(...allEvents.data.items);
          }
          payload = {
            ...payload,
            calendar_event_id: calendarEvent.data.id,
            meet_link: meetLink,
          };
        } catch (err) {
          /* eslint-disable */
          console.log(err);
          console.log('Calendar event error');
          /* eslint-enable */
        }

        const recurringPayload = [];
        if (recurringEvents.length > 0) {
          const recurringMetadata = (({
            frequency,
            on_days,
            occurrence,
            until,
            calendar_event_id,
          }) => ({
            frequency,
            on_days,
            occurrence,
            until,
            calendar_event_id,
          }))(payload);

          const [err, recurringClassEntry] = await classesService.createRecurringEvent(
            recurringMetadata
          );
          if (err) {
            return h.response(err).code(err.code);
          }
          recurringEvents.forEach((e) => {
            const { frequency, on_days, occurrence, until, ...instances } = payload;
            instances.start_time = parseISOStringToDateObj(e.start.dateTime);
            instances.end_time = parseISOStringToDateObj(e.end.dateTime);
            instances.calendar_event_id = e.id;
            instances.recurring_id = recurringClassEntry.id;
            recurringPayload.push(instances);
          });
          const [errInRecurring, createdClasses] = await classesService.createClass(
            recurringPayload
          );
          if (errInRecurring) {
            return h.response(errInRecurring).code(errInRecurring.code);
          }
          return createdClasses;
        }
        const { frequency, occurrence, until, on_days, ...payloadCopy } = payload;

        const [errInSingle, singleClass] = await classesService.createClass([payloadCopy]);
        if (errInSingle) {
          return h.response(errInSingle).code(errInSingle.code);
        }
        return singleClass;
      },
    },
  },
  {
    method: 'GET',
    path: '/classes/{classId}',
    options: {
      description: 'Get details of a class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
      },
      handler: async (request, h) => {
        const singleClass = [];
        const { classesService, displayService } = request.services();
        const { classId } = request.params;
        const userId = request.auth.credentials.id;
        const [err, classById] = await classesService.getClassById(classId);
        if (err) {
          return h.response(err).code(err.code);
        }
        singleClass.push(classById);
        const singleClassWithFacilitator = await displayService.getUpcomingClassFacilitators(
          singleClass
        );
        const classDetails = await displayService.getClassDetails(
          singleClassWithFacilitator,
          userId
        );
        return classDetails;
      },
    },
  },
  {
    method: 'GET',
    path: '/render/{classId}',
    options: {
      description: 'Get details of a class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
      },
      handler: async (request, h) => {
        const singleClass = [];
        const { classesService, displayService } = request.services();
        const { classId } = request.params;
        const userId = request.auth.credentials.id;
        const [err, classById] = await classesService.getClassById(classId);
        if (err) {
          return h.response(err).code(err.code);
        }
        singleClass.push(classById);
        const singleClassWithFacilitator = await displayService.getUpcomingClassFacilitators(
          singleClass
        );
        const classDetails = await displayService.getNewClassDetails(
          singleClassWithFacilitator,
          userId
        );
        return classDetails;
      },
    },
  },
  {
    method: 'PUT',
    path: '/classes/{classId}',
    options: {
      description: 'Updates a class and returns it as response',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope(['teacher', 'partner']),
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        payload: buildSchema('PUT'),
      },
      handler: async (request, h) => {
        const { classesService, displayService, userService } = request.services();
        const { classId } = request.params;
        const [errWhileFetchingSingle, singleClass] = await classesService.getClassById(classId);
        if (errWhileFetchingSingle) {
          return h.response(errWhileFetchingSingle).code(errWhileFetchingSingle.code);
        }

        // If a recurring event is to be updated as a whole
        if (request.payload.updateAll && singleClass.recurring_id !== null) {
          const [
            errWhileFetchingRecurring,
            recurringClasses,
          ] = await classesService.getClassesByRecurringId(singleClass.recurring_id);
          if (errWhileFetchingRecurring) {
            return h.response(errWhileFetchingRecurring).code(errWhileFetchingRecurring.code);
          }
          const createPayload = {};
          /**
           * Creating a new payload with values provided in request.payload for all valid classes model fields
           * If values are not provided in payload, values from older data is set
           */
          Classes.fields().forEach((f) => {
            if (request.payload[f] !== undefined) {
              createPayload[f] = request.payload[f];
            } else {
              createPayload[f] = singleClass[f];
            }
          });
          // Adding extra values of provided payload in actual payload (which are not a part of classes model)
          Object.keys(request.payload).forEach((k) => {
            if (createPayload[k] === undefined) {
              createPayload[k] = request.payload[k];
            }
          });

          let facilitator;
          // Setting facilitator for corresponding class, to create a calendar event
          if (createPayload.facilitator_id) {
            const [err, user] = await userService.findById(createPayload.facilitator_id);
            if (err) {
              return h.response(err).code(err.code);
            }
            const withFacilitorData = await displayService.userProfile(user);
            facilitator = { name: withFacilitorData.name, email: withFacilitorData.email };
          } else if (
            !createPayload.facilitator_id &&
            createPayload.facilitator_email !== undefined
          ) {
            facilitator = {
              name: createPayload.facilitator_name,
              email: createPayload.facilitator_email,
            };
          }

          if (createPayload.on_days) createPayload.on_days = createPayload.on_days.join(',');

          const recurringEvents = [];
          const allRegs = [];

          // Creating a list of original attendees / those who enrolled for the class
          recurringClasses.forEach((c) => {
            allRegs.push(...c.registrations);
          });
          const allRegIds = [];
          createPayload.attendees = [];
          if (allRegs.length > 0) {
            allRegs.forEach((rId) => {
              if (allRegIds.indexOf(rId.user_id) < 0) {
                allRegIds.push(rId.user_id);
              }
            });
            const [errInGettingEmail, originalAttendees] = await userService.findByListOfIds(
              allRegIds,
              'email'
            );
            if (errInGettingEmail) {
              return h.response(errInGettingEmail).code(errInGettingEmail.code);
            }
            createPayload.attendees.push(...originalAttendees);
          }

          if (_.findIndex(createPayload.attendees, { email: facilitator.email }) < 0) {
            createPayload.attendees.push({ email: facilitator.email });
          }

          try {
            // Deleting the present calendar event
            await deleteCalendarEvent(singleClass.parent_class.calendar_event_id);
            // Creating a new calendar event to replace the deleted one with updated data
            const calendarEvent = await createCalendarEvent(createPayload, facilitator);
            const meetLink = calendarEvent.data.hangoutLink.split('/').pop();
            // Getting all recurring instances of the calendar event
            const allEvents = await getRecurringInstances(calendarEvent.data.id);
            // Capturing all instances of a recurring event
            recurringEvents.push(...allEvents.data.items);
            // Updating the payload with new calendar event id and meet link
            createPayload.calendar_event_id = calendarEvent.data.id;
            createPayload.meet_link = meetLink;
          } catch (err) {
            /* eslint-disable */
            console.log(err);
            console.log('Calendar event error');
            /* eslint-enable */
          }
          // Deleting individual classes from the classes table
          const deleteClasses = async () => {
            const [errorInDeletingAll, deletedClasses] = await classesService.deleteMultipleClasses(
              singleClass.recurring_id
            );
            if (errorInDeletingAll) {
              return h.response(errorInDeletingAll).code(errorInDeletingAll.code);
            }
            return deletedClasses;
          };
          const checkIfClassesDeleted = await h.context.transaction(deleteClasses);
          if ('error' in checkIfClassesDeleted) {
            return checkIfClassesDeleted;
          }

          // Creating payload for `recurring_classes` table entry
          const recurringMetadata = (({
            frequency,
            on_days,
            occurrence,
            until,
            calendar_event_id,
          }) => ({
            frequency,
            on_days,
            occurrence,
            until,
            calendar_event_id,
          }))(createPayload);

          /**
           * Inserting data in `recurring_classes` row
           * Rows could be simply updated instead, but when we delete multiple classes,
           * corresponding linked row in `recurring_classes` table for them is also deleted
           */

          const [err, recurringClassEntry] = await classesService.createRecurringEvent(
            recurringMetadata
          );
          if (err) {
            return h.response(err).code(err.code);
          }
          const recurringPayload = [];
          const registrationPayload = [];

          // Creating multiple payloads for each recurring_class instance
          recurringEvents.forEach((e) => {
            const {
              id,
              frequency,
              on_days,
              occurrence,
              until,
              updateAll,
              attendees,
              ...instances
            } = createPayload;
            instances.start_time = e.start.dateTime;
            instances.end_time = e.end.dateTime;
            instances.calendar_event_id = e.id;
            instances.recurring_id = recurringClassEntry.id;
            const filteredInstance = _.omitBy(instances, _.isNull);
            recurringPayload.push(filteredInstance);
          });

          // Creating new classes in batch
          const [errInRecurring, createdClasses] = await classesService.createClass(
            recurringPayload
          );
          if (errInRecurring) {
            return h.response(errInRecurring).code(errInRecurring.code);
          }

          // Creating payload for all older registrations for recurring class
          if (allRegIds.length > 0) {
            _.forEach(createdClasses, (c) => {
              _.forEach(allRegIds, (id) => {
                registrationPayload.push({
                  user_id: id,
                  class_id: c.id,
                  registered_at: new Date(),
                });
              });
            });

            // Inserting older registrations for each new class
            // eslint-disable-next-line
            const [errWhileRegistering, registered] = await classesService.registerToClassById(
              registrationPayload
            );
            if (errWhileRegistering) {
              return h.response(errWhileRegistering).code(errWhileRegistering.code);
            }
          }
          return createdClasses;
        }

        // If a single class is updated
        const [err, patchedClass] = await classesService.updateClass(classId, request.payload);
        if (err) {
          return h.response(err).code(err.code);
        }
        try {
          await patchCalendarEvent(patchedClass);
        } catch {
          // eslint-disable-next-line
          console.log('Calendar Event error');
        }

        return [patchedClass];
      },
    },
  },
  {
    method: 'GET',
    path: '/classes/recommended',
    options: {
      description: 'Get recommended classes',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      handler: async (request, h) => {
        const { classesService, displayService } = request.services();
        const [err, recommended] = await classesService.recommendedClasses();
        if (err) {
          return h.response(err).code(err.code);
        }
        return displayService.getRecommendedClasses(recommended);
      },
    },
  },
  {
    method: 'DELETE',
    path: '/classes/{classId}',
    options: {
      description: 'Deletes a class (Dashboard Admin and class creators only)',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        payload: Joi.object({
          deleteAll: Joi.boolean().optional(),
        }),
      },
      handler: async (request, h) => {
        const { classesService, userService, displayService } = request.services();
        const [errInFetching, classToDelete] = await classesService.getClassById(
          request.params.classId
        );

        const { artifacts: token } = request.auth;
        const [errInUser, user] = await userService.findById(token.decoded.id);
        if (errInUser) {
          return h.response(errInUser).code(errInUser.code);
        }
        const userWithRoles = await displayService.userProfile(user);

        if (errInFetching) {
          return h.response(errInFetching).code(errInFetching.code);
        }

        if (
          !(
            userWithRoles.rolesList.indexOf('classAdmin') > -1 ||
            userWithRoles.rolesList.indexOf('admin') > -1 ||
            // eslint-disable-next-line
            userWithRoles.id == classToDelete.facilitator_id
          )
        ) {
          throw Boom.forbidden(
            `You do not have rights to delete this class.`
          );
        }
        let calendarEventId;
        if (request.payload.deleteAll && classToDelete.parent_class) {
          calendarEventId = classToDelete.parent_class.calendar_event_id;
        } else {
          calendarEventId = classToDelete.calendar_event_id;
        }
        try {
          await deleteCalendarEvent(calendarEventId);
        } catch {
          // eslint-disable-next-line
          console.log('Calendar event error');
        }

        if (request.payload.deleteAll && classToDelete.parent_class) {
          const deleteClasses = async () => {
            const [errorInDeletingAll, deletedClasses] = await classesService.deleteMultipleClasses(
              classToDelete.recurring_id
            );
            if (errorInDeletingAll) {
              return h.response(errorInDeletingAll).code(errorInDeletingAll.code);
            }
            return deletedClasses;
          };

          const checkIfClassesDeleted = await h.context.transaction(deleteClasses);

          if ('error' in checkIfClassesDeleted) {
            return checkIfClassesDeleted;
          }

          return checkIfClassesDeleted;
        }

        const deleteAClass = async () => {
          const [errInDeleting, deletedClass] = await classesService.deleteClass(
            request.params.classId
          );
          if (errInDeleting) {
            return h.response(errInDeleting).code(errInDeleting.code);
          }
          return deletedClass;
        };

        const checkIfClassDeleted = await h.context.transaction(deleteAClass);

        if ('error' in checkIfClassDeleted) {
          return checkIfClassDeleted;
        }

        return checkIfClassDeleted;
      },
    },
  },
];
