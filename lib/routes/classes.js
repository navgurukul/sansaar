const Joi = require('@hapi/joi');
const Classes = require('../models/classes');
const { getRouteScope } = require('./helpers');

module.exports = [
  {
    method: 'POST',
    path: '/classes/byDate',
    options: {
      description: 'Get a list of all classes by date range',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          startDate: Joi.date(),
          endDate: Joi.date().greater(Joi.ref('startDate')),
        }),
      },
      handler: async (request) => {
        const { classesService, displayService } = request.services();
        const { startDate, endDate } = request.payload;
        const classes = classesService.getClasses();
        return displayService.classesByDate(classes, startDate, endDate);
      },
    },
  },
  {
    method: 'GET',
    path: '/classes/byLang/{lang}',
    options: {
      description: 'Get a list of all classes by language',
      tags: ['api'],
      validate: {
        params: Joi.object({
          lang: Classes.field('lang'),
        }),
      },
      handler: async (request) => {
        const { classesService, displayService } = request.services();
        const classes = classesService.getClasses();
        return displayService.classesByLanguage(classes, request.params.lang);
      },
    },
  },
  {
    method: 'POST',
    path: '/classes',
    options: {
      description: 'Creates a class',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          name: Classes.field('name'),
          description: Classes.field('description'),
          facilitator_id: Classes.field('facilitator_id'),
          start_time: Classes.field('start_time'),
          end_time: Classes.field('end_time'),
          exercise_id: Classes.field('exercise_id'),
          course_id: Classes.field('course_id'),
          category_id: Classes.field('category_id'),
          video_id: Classes.field('video_id'),
          lang: Classes.field('lang'),
        }),
      },
      handler: async (request) => {
        const { classesService } = request.services();
        return classesService.createClass(request.payload);
      },
    },
  },
  {
    method: 'PUT',
    path: '/classes/{classId}',
    options: {
      description: 'Updates a class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('classAdmin'),
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        payload: Joi.object({
          name: Classes.field('name'),
          description: Classes.field('description'),
          facilitator_id: Classes.field('facilitator_id'),
          start_time: Classes.field('start_time'),
          end_time: Classes.field('end_time'),
          exercise_id: Classes.field('exercise_id'),
          course_id: Classes.field('course_id'),
          category_id: Classes.field('category_id'),
          video_id: Classes.field('video_id'),
          lang: Classes.field('lang'),
        }),
      },
    },
    handler: async (request) => {
      const { classesService } = request.services();
      const { classId } = request.params();
      const updatedClass = await classesService.updateClass(classId, request.payload);
      return { updatedClass };
    },
  },
];
