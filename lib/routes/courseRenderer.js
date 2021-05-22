const Joi = require('@hapi/joi');
const Exercises = require('../models/exercise');
const ExerciseCompletion = require('../models/exerciseCompletion');

module.exports = [
  {
    method: 'GET',
    path: '/courseRenderer/{language}',
    options: {
      description: 'Get course renderer content',
      tags: ['api'],
      validate: {
        params: Joi.object({
          language: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { courseRenderer } = request.services();
        const { language } = request.params;
        console.log(language, 'language\n\n');
        const exercise = await courseRenderer.getCourseExercise(language);
        return { exercise };
      },
    },
  },
];
