const Joi = require('@hapi/joi');
const Exercise = require('../models/exercise');
const Courses = require('../models/courses');

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
        const addUpdateExercise = await exercisesService.upsertExercise(request.payload);
        return { addUpdateExercise };
      },
    },
  },
  {
    method: 'POST',
    path: '/exercises/{courseId}',
    options: {
      description: 'Mark and unmark course completion',
      tags: ['api'],
      validate: {
        params: Joi.object({
          courseId: Courses.field('id'),
        }),
        query: Joi.object({
          completed: Joi.boolean().required(),
        }),
      },
      auth: {
        strategy: 'jwt',
      },
      handler: async (request) => {
        const { coursesService } = request.services();
        const userId = request.auth.id;
        const payload = { ...request.params, userId };
        return coursesService.toggleCourseCompletion(payload, request.query.completed);
      },
    },
  },
];
