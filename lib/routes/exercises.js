const Joi = require('@hapi/joi');
const Exercises = require('../models/exercise');
const ExerciseCompletion = require('../models/exerciseCompletion');
const logger = require('../../server/logger');
const Exercise = require('../models/exercisesV2');

const androidVersions = {
  latest: 35,
};
module.exports = [
  // Only for version 1
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
      handler: async (request, h) => {
        const authUser = request.auth.credentials;
        const { exercisesService } = request.services();
        const { slug } = request.params;
        const [err, exercise] = await exercisesService.getExerciseBySlug(slug, authUser);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get complete details of the exercise with the given slug');
        return { exercise };
      },
    },
  },

  // Version 2 yet to be done
  {
    method: 'POST',
    path: '/exercises',
    options: {
      description: 'Add or update all exercise',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          exercise: Joi.object(),
          slugArr: Joi.array(),
          childExercise: Joi.array().items(Joi.object()),
        }),
      },
      handler: async (request) => {
        const { exercisesService } = request.services();
        const { slugArr, exercise, childExercise } = request.payload;
        const modPayload = { slugArr: [], exercise: [], childExercise: [] };
        if (slugArr) {
          modPayload.slugArr = slugArr;
        }
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
        logger.info('Add or update all exercise');
        return { addUpdateExercise };
      },
    },
  },

  {
    method: 'PUT',
    path: '/exercises/{exerciseId}',
    options: {
      description: 'Update exercises of the course',
      tags: ['api'],
      validate: {
        params: Joi.object({
          exerciseId: Joi.number().integer(),
        }),
        payload: Joi.object({
          name: Joi.string().max(100).optional(),
          description: Joi.string().optional(),
          content: Joi.string().optional(),
          type: Joi.string().optional(),
          sequence_num: Joi.number().integer().optional(),
        }),
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { exercisesService, exercisesServiceV2 } = request.services();
        const { exerciseId } = request.params;
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, exercises] = await exercisesServiceV2.updateSingleExercises(
            exerciseId,
            request.payload
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return exercises;
        }
        const [err, exercises] = await exercisesService.updateSingleExercises(
          exerciseId,
          request.payload
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return exercises;
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
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { exercisesService, exercisesServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, marked] = await exercisesServiceV2.markExerciseComplete(
            request.auth.credentials.id,
            request.params.exerciseId
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info(`id- ${request.auth.credentials.id} Mark pathway completion`);
          return marked;
        }
        const [err, marked] = await exercisesService.markExerciseComplete(
          request.auth.credentials.id,
          request.params.exerciseId
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Mark exercise completion');
        return marked;
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
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { exercisesService, exercisesServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          /**
           * Getting id to check whether the exercise exists is an unnecessary extra step
           * The service should throw 404 error if the exercise that needs to be marked incomplete does not exist
           */
          const getId = await exercisesServiceV2.getIdForRemoval(
            request.auth.credentials.id,
            request.params.exerciseId
          );
          if (getId) {
            const deleted = async (txn) => {
              return exercisesServiceV2.removeExerciseComplete(
                getId[0].id,
                request.auth.credentials.id,
                request.params.exerciseId,
                txn
              );
            };
            logger.info('Unmark exercise completion');
            return h.context.transaction(deleted);
          }
          return null;
        }
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
          logger.info('Unmark exercise completion');
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
      validate: {
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { exercisesService, exercisesServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, fetchMarked] = await exercisesServiceV2.getExerciseComplete(
            request.auth.credentials.id
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          logger.info('Get all completed exercises');
          return fetchMarked;
        }

        const [err, fetchMarked] = await exercisesService.getExerciseComplete(
          request.auth.credentials.id
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get all completed exercises');
        return fetchMarked;
      },
    },
  },
  {
    method: 'DELETE',
    path: '/exercises/{exerciseId}',
    options: {
      description: 'Delete exercise of the course',
      tags: ['api'],
      validate: {
        params: Joi.object({
          exerciseId: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { exercisesServiceV2 } = request.services();
        const { exerciseId } = request.params;
        const [err, deleted] = await exercisesServiceV2.deleteExerciseById(exerciseId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Delete the exercise by id');
        return deleted;
      },
    },
  },

  {
    method: 'GET',
    path: '/exercises/{exerciseId}/exercises',
    options: {
      description: 'Get complete list of exercises',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        params: Joi.object({
          exerciseId: Exercise.field('id'),
        }),
        query: Joi.object({
          lang: Joi.string(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { exerciseId } = request.params;
        const { exercisesServiceV2 } = request.services();
        const language =
          ['hi', 'en', 'te', 'mr', 'ta'].indexOf(request.query.lang) > -1
            ? request.query.lang
            : 'en';

        const [err, exercises] = await exercisesServiceV2.getExerciseByCourseId(
          exerciseId,
          language
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get complete list of exercises in the course');
        return { exercises };
      },
    },
  },

  {
    method: 'POST',
    path: '/exercises/learning_track_status_TO_exercise_comp_v2/exercises',
    options: {
      description: 'migrate courses v1 to v2',
      tags: ['api'],
      handler: async (request, h) => {
        const { exercisesServiceV2 } = request.services();
        const [err, lear_data] = await exercisesServiceV2.insertLearningTrackData();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get all courses');
        return [null,true];
      },
    },
  },
];
