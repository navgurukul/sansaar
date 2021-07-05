const Joi = require('@hapi/joi');
const _ = require('lodash');
const { createCalendarEvent, patchCalendarEvent, deleteCalendarEvent } = require('../bot/calendar');
const Classes = require('../models/classes');
const CONFIG = require('../config');

const buildSchema = (requestType) => {
  return Joi.object({
    title: requestType === 'POST' ? Joi.string().required() : Joi.string().optional(),
    description: requestType === 'POST' ? Joi.string().required() : Joi.string().optional(),
    facilitator_id: Joi.number().integer().greater(0).optional(),
    facilitator_name: Joi.string().optional(),
    facilitator_email: Joi.string()
      .optional()
      .pattern(
        // eslint-disable-next-line
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      ),
    start_time: requestType === 'POST' ? Joi.date().required().min('now') : Joi.date().optional(),
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
        ? Joi.string().valid('workshop', 'doubt_class').required()
        : Joi.string().valid('workshop', 'doubt_class').optional(),
    meet_link: Joi.string(),
    calendar_event_id: Joi.string(),
    material_link: Joi.string().uri().optional(),
    max_enrolment: Joi.number().integer().greater(0).optional(),
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
      },
      validate: {
        payload: buildSchema('POST'),
      },
      handler: async (request, h) => {
        const { classesService, userService, displayService } = request.services();
        let { payload } = request;
        let facilitator;

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

        // #TODO

        try {
          const calendarEvent = await createCalendarEvent(payload, facilitator);
          const meetLink = calendarEvent.data.hangoutLink.split('/').pop();
          payload = {
            ...payload,
            calendar_event_id: calendarEvent.data.id,
            meet_link: meetLink,
          };
        } catch {
          // eslint-disable-next-line
          console.log('Calendar event error');
        }

        const [err, createdClass] = await classesService.createClass(payload);
        if (err) {
          return h.response(err).code(err.code);
        }
        return createdClass;
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
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        payload: buildSchema('PUT'),
      },
      handler: async (request, h) => {
        const { classesService } = request.services();
        const { classId } = request.params;
        let flag = false;
        _.map(request.auth.credentials.scope, (role) => {
          if (CONFIG.permissions.updateClass.includes(role)) {
            flag = true;
          }
        });
        if (!flag) {
          return h.response({
            error: {
              status: 403,
              code: 'Forbidden',
              message: "You don't have access to update the class.",
              field: 'Forbidden',
            },
          });
        }
        // #TODO
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

        return { updatedClass: patchedClass };
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
            userWithRoles.rolesList.indexOf('dumbeldore') > -1 ||
            // eslint-disable-next-line
            userWithRoles.id == classToDelete.facilitator_id
          )
        ) {
          return { error: true, message: 'You do not have rights to delete this class' };
        }

        const calendarEventId = classToDelete.calendar_event_id;
        try {
          await deleteCalendarEvent(calendarEventId);
        } catch {
          // eslint-disable-next-line
          console.log('Calendar event error');
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
