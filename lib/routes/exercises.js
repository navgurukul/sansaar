const Joi = require('@hapi/joi');
const Exercise = require('../models/exercise');

module.exports = [
  {
    method: 'GET',
    path: '/exercises/{slug}',
    options: {
      description:
        'Get complete details of the exercise with the given slug. Does not return child exercises',
      tags: ['api'],
      validate: {
        params: Joi.object({
          slug: Exercise.field('slug'),
        }),
      },
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      handler: async (request) => {
        const authUser = request.auth.credentials;
        const { exercisesService } = request.services();
        const { slug } = request.params;
        const exercise = await exercisesService.getExerciseBySlug(slug, authUser);
        return { exercise };
      },
    },
  },

  {
    method: 'POST',
    path: '/exercises',
    options: {
      description: 'Add or update all exercise',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          exercise: Joi.object(),
          childExercise: Joi.array().items(Joi.object()),
        }),
      },
      handler: async (request) => {
        const { exercisesService } = request.services();
        const addUpdateExercise = await exercisesService.upsertExercises(request.payload);
        return { addUpdateExercise };
      },
    },
  },
];
