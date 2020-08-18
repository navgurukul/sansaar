const Joi = require('@hapi/joi');
const Exercises = require('../models/exercise');

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

  {
    method: 'GET',
    path: '/courses/exercise/getBySlug',
    options: {
      description:
        'Get complete details of the exercise with the given slug. Does not return child exercises',
      tags: ['api'],
      validate: {
        query: Joi.object({
          slug: Exercises.field('slug'),
        }),
      },
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      handler: async (request) => {
        const authUser = request.auth.credentials;
        const { exercisesService } = request.services();
        const { slug } = request.query;

        const getExerciseBySlug = await exercisesService.getExerciseBySlug(slug, authUser);
        return {
          exercise: getExerciseBySlug,
        };
      },
    },
  },

  {
    method: 'GET',
    path: '/courses/{exerciseId}/solution',
    options: {
      description: 'gets the solution by exercies Id.',
      tags: ['api'],
      validate: {
        params: Joi.object({
          exerciseId: Exercises.field('id'),
        }),
      },
      handler: async (request) => {
        const { exercisesService } = request.services();
        const { exerciseId } = request.params;
        const [getExercisesSolution] = await exercisesService.getSolutionByExerciseId(exerciseId);
        if (getExercisesSolution.solution) {
          return {
            isSolution: getExercisesSolution,
          };
        }
        return {
          isSolution: false,
        };
      },
    },
  },
];
