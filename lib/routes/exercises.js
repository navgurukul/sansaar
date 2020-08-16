const Joi = require('@hapi/joi');
const Exercises = require('../models/exercises');

module.exports = [
  {
    method: 'GET',
    path: '/courses/{courseId}/exercises',
    options: {
      description: 'List exercises for a particular course.',
      tags: ['api'],
      validate: {
        params: Joi.object({
          courseId: Exercises.field('course_id'),
        }),
      },
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      handler: async (request) => {
        const authUser = request.auth.credentials;
        const { exercisesService } = request.services();
        const { courseId } = request.params;

        const exercise = await exercisesService.getExercisesById(courseId, authUser);
        return { exercise };
      },
    },
  },
];
