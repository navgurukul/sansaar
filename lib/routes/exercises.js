/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const Exercises = require('../models/exercise');
const ExerciseCompletion = require('../models/exerciseCompletion');
const logger = require('../../server/logger');
const Exercise = require('../models/exercisesV2');

const androidVersions = {
  latest: 35,
};
module.exports = [
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
            request.params.exerciseId,
            request.auth.credentials.team_id
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }

          request.auth.credentials.team_id?
          logger.info(`team- ${request.auth.credentials.team_id} Mark pathway completion`):
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
    method: 'POST',
    path: '/exercises/{slug_id}/markcomplete',
    options: {
      description: 'Mark exercise completion',
      tags: ['api'],
      auth: { strategy: 'jwt' },
      validate: {
        params: Joi.object({
          slug_id: Joi.number().integer().required(),
        }),
        query: Joi.object({
          type: Joi.string().valid('exercise').default('exercise'),
          lang: Joi.string().required(),
        }),
        headers: Joi.object({
          'version-code': Joi.number().integer().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { exercisesServiceV2 } = request.services();
        const appVersion = request.headers['version-code'] ? request.headers['version-code'] : null;
        if (appVersion >= androidVersions.latest) {
          const [err, marked] = await exercisesServiceV2.exerciseComplete(
            request.auth.credentials.id,
            request.params.slug_id,
            request.query.type,
            request.query.lang,
            request.auth.credentials.team_id
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }

          // eslint-disable-next-line no-unused-expressions
          request.auth.credentials.team_id ?
            logger.info(`team- ${request.auth.credentials.team_id} Mark pathway completion`) :
            logger.info(`id- ${request.auth.credentials.id} Mark pathway completion`);
          return marked;
        }
        return null;

      }
    }
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
    method: 'GET',
    path: '/exercises/{exerciseId}/exercises',
    options: {
      description: 'Get complete list of exercises ⓜ',
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

        const [err, exercises] = await exercisesServiceV2.getExerciseByExerciseId(
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
        // eslint-disable-next-line no-unused-vars
        const [err, lear_data] = await exercisesServiceV2.insertLearningTrackData();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get all courses');
        return [null, 'Data successfully inserted'];
      },
    },
  },
];