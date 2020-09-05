const Joi = require('@hapi/joi');
const Classes = require('../models/classes');
const { getRouteScope } = require('./helpers');

module.exports = [
  {
    method: 'POST',
    path: '/classes/upcoming',
    options: {
      description: 'Get a list of all classes by date range',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          startDate: Joi.date().optional(),
          endDate: Joi.date().min(Joi.ref('startDate')).optional(),
          lang: Classes.field('lang').optional(),
          classType: Classes.field('class_type').optional(),
        }),
      },
      handler: async (request) => {
        const { classesService } = request.services();
        const classes = await classesService.getClasses(request.payload);
        return { classes };
      },
    },
  },
  {
    method: 'POST',
    path: '/classes',
    options: {
      description: 'Creates a class and returns the created class',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          title: Classes.field('title'),
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
      description: 'Updates a class and returns it as response',
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
          title: Classes.field('title'),
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
      const { classId } = request.params;
      const updatedClass = await classesService.updateClass(classId, request.payload);
      return { updatedClass };
    },
  },
];
