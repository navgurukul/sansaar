const Joi = require('@hapi/joi');
const Classes = require('../models/classes');
const { getRouteScope } = require('./helpers');

module.exports = [
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
    path: '/classes/{classId}', // /classes/{classId}
    options: {
      description: 'Updates a class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('classAdmin'),
      },
      validate: {
        params: Joi.object({
          liveClassId: Classes.field('id'),
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
        }),
      },
    },
    handler: async (request) => {
      const { classesService } = request.services();
      const { classId } = request.params();
      const authUser = request.auth.credentials;
      const updatedClass = await classesService.updateClass(classId, request.payload, authUser);
      return { updatedClass };
    },
  },
];
