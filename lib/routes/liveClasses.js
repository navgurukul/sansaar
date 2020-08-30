const Joi = require('@hapi/joi');
const LiveClasses = require('../models/liveClasses');
const { getRouteScope } = require('./helpers');

module.exports = [
  {
    method: 'POST',
    path: '/liveClasses/liveClass/create',
    options: {
      description: 'Creates a live class',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          name: LiveClasses.field('name'),
          description: LiveClasses.field('description'),
          facilitatorId: LiveClasses.field('facilitator_id'),
          startTime: LiveClasses.field('start_time'),
          endTime: LiveClasses.field('end_time'),
          exerciseId: LiveClasses.field('exercise_id'),
          courseId: LiveClasses.field('course_id'),
          categoryId: LiveClasses.field('category_id'),
          videoId: LiveClasses.field('video_id'),
        }),
      },
      handler: async (request) => {
        const { liveClassesService } = request.services();
        return liveClassesService.createLiveClass(request.payload);
      },
    },
  },
  {
    method: 'PUT',
    path: '/liveClasses/liveClass/{liveClassId}',
    options: {
      description: 'Updates a live class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('classAdmin'),
      },
      validate: {
        params: Joi.object({
          liveClassId: LiveClasses.field('id'),
        }),
        payload: Joi.object({
          name: LiveClasses.field('name'),
          description: LiveClasses.field('description'),
          facilitatorId: LiveClasses.field('facilitator_id'),
          startTime: LiveClasses.field('start_time'),
          endTime: LiveClasses.field('end_time'),
          exerciseId: LiveClasses.field('exercise_id'),
          courseId: LiveClasses.field('course_id'),
          categoryId: LiveClasses.field('category_id'),
          videoId: LiveClasses.field('video_id'),
        }),
      },
    },
    handler: async (request) => {
      const { liveClassesService } = request.services();
      const { liveClassId } = request.params();
      const authUser = request.auth.credentials;
      const updatedClass = await liveClassesService.updateLiveClass(
        liveClassId,
        request.payload,
        authUser
      );
      return { updatedClass };
    },
  },
];
