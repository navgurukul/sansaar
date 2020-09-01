const Joi = require('@hapi/joi');
const Exercise = require('../models/exercise');

module.exports = [
  {
    method: 'GET',
    path: '/courses/{courseId}/exercises',
    options: {
      description: 'List exercises for a particular course.',
      tags: ['api'],
      validate: {
        params: Joi.object({
          courseId: Exercise.field('course_id'),
        }),
      },
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      handler: async (request) => {
        const authUser = request.auth.credentials;
        const { exerciseService } = request.services();
        const { courseId } = request.params;

        const exercise = await exerciseService.getExercisesById(courseId, authUser);
        return { exercise };
      },
    },
  },

  {
    method: 'GET',
    path: '/exercise/{slug}',
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
        const { exerciseService } = request.services();
        const { slug } = request.params;
        const exercise = await exerciseService.getExerciseBySlug(slug, authUser);
        return { exercise };
      },
    },
  },

  {
    method: 'POST',
    path: '/exercise',
    options: {
      description: 'Add or update all exercise',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          exercise: Joi.object(),
          childExercise: Joi.array().items(Joi.object())
        })
      },
      handler: async (request) => {
        const { exerciseService } = request.services();
        const addUpdateExercise = await exerciseService.upsertExercise(request.payload);
        return {addUpdateExercise}
      }
    }
  }
];
