const Joi = require('@hapi/joi');
const Classes = require('../models/classes');
const { getRouteScope } = require('./helpers');

const buildSchema = (requestType) => {
  return Joi.object({
    id: Joi.number().integer().greater(0),
    title: requestType === 'POST' ? Joi.string().required() : Joi.string().optional(),
    description: requestType === 'POST' ? Joi.string().required() : Joi.string().optional(),
    facilitator_id:
      requestType === 'POST'
        ? Joi.number().integer().greater(0).required()
        : Joi.number().integer().greater(0).optional(),
    start_time: requestType === 'POST' ? Joi.date().required() : Joi.date().optional(),
    end_time: requestType === 'POST' ? Joi.date().required() : Joi.date().optional(),
    exercise_id: Joi.number(),
    course_id: Joi.number(),
    category_id:
      requestType === 'POST'
        ? Joi.number().integer().required()
        : Joi.number().integer().optional(),
    video_id: requestType === 'POST' ? Joi.string().required() : Joi.string().optional(),
    lang:
      requestType === 'POST'
        ? Joi.string().valid('hi', 'en', 'te', 'ta').lowercase().required()
        : Joi.string().valid('hi', 'en', 'te', 'ta').lowercase().optional(),
    class_type:
      requestType === 'POST'
        ? Joi.string().valid('workshop', 'doubt_class').required()
        : Joi.string().valid('workshop', 'doubt_class').optional(),
  });
};

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
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('classAdmin'),
      },
      validate: {
        payload: buildSchema('POST'),
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
        payload: buildSchema('PUT'),
      },
      handler: async (request) => {
        const { classesService } = request.services();
        const { classId } = request.params;
        const updatedClass = await classesService.updateClass(classId, request.payload);
        return { updatedClass };
      },
    },
  },
];
