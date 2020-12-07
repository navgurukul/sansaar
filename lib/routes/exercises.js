const Joi = require('@hapi/joi');
const Exercises = require('../models/exercise');
const ExerciseCompletion = require('../models/exerciseCompletion');

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
          slug: Exercises.field('slug'),
        }),
      },
      auth: {
        strategy: 'jwt',
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
        const { exercise, childExercise } = request.payload;
        const modPayload = { exercise: [], childExercise: [] };
        if (exercise) {
          const trimmedSlug = exercise.slug.slice(0, 99);
          const modExercise = { ...exercise, slug: trimmedSlug };
          modPayload.exercise = modExercise;
        }
        if (childExercise) {
          const modChildExerciseArr = [];
          childExercise.forEach((childEx) => {
            const trimmedSlug = childEx.slug.slice(0, 99);
            const modChildExercise = { ...childEx, slug: trimmedSlug };
            modChildExerciseArr.push(modChildExercise);
          });
          modPayload.childExercise = modChildExerciseArr;
        }
        const addUpdateExercise = await exercisesService.upsertExercises(modPayload);
        return { addUpdateExercise };
      },
    },
  },

  {
    method: 'POST',
    path: '/exercises/{exerciseId}/complete',
    options: {
      description: 'Mark exercise completion',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        params: Joi.object({
          exerciseId: ExerciseCompletion.field('exercise_id'),
        }),
      },
      handler: async (request) => {
        const { exercisesService } = request.services();
        return exercisesService.markExerciseComplete(
          request.auth.credentials.id,
          request.params.exerciseId
        );
      },
    },
  },
  {
    method: 'DELETE',
    path: '/exercises/{exerciseId}/complete',
    options: {
      description: 'Unmark exercise completion',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        params: Joi.object({
          exerciseId: ExerciseCompletion.field('exercise_id'),
        }),
      },
      handler: async (request, h) => {
        const { exercisesService } = request.services();
        const getId = await exercisesService.getIdForRemoval(
          request.auth.credentials.id,
          request.params.exerciseId
        );
        if (getId) {
          const deleted = async (txn) => {
            return exercisesService.removeExerciseComplete(
              getId[0].id,
              request.auth.credentials.id,
              request.params.exerciseId,
              txn
            );
          };
          return h.context.transaction(deleted);
        }
        return null;
      },
    },
  },
  {
    method: 'GET',
    path: '/exercises/complete',
    options: {
      description: 'Get all completed exercises',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      handler: async (request) => {
        const { exercisesService } = request.services();
        return exercisesService.getExerciseComplete(request.auth.credentials.id);
      },
    },
  },
];
