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
      //   auth: {
      //     strategy: 'jwt',
      //   },
      handler: async (request, h) => {
        const authUser = request.auth.credentials;
        const { courseRenderer } = request.services();
        const { language } = request.params;
        console.log(language, 'language\n\n');
        // const [err, exercise] = await courseRenderer.getCourseExercise();
        const exercise = await courseRenderer.getCourseExercise(language);
        // console.log(exercise, 'routeeeeee');
        // if (err) {
        //   return h.response(err).code(err.code);
        // }
        return { exercise };
      },
    },
  },
];
