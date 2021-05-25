const Joi = require('@hapi/joi');

module.exports = [
  {
    method: 'GET',
    path: '/courseRenderer/{course_id}/{language}',
    options: {
      description: 'Get course renderer content',
      tags: ['api'],
      validate: {
        params: Joi.object({
          language: Joi.string(),
          course_id: Joi.number().integer(),
        }),
      },
      handler: async (request) => {
        const { courseRenderer } = request.services();
        const { language, course_id } = request.params;
        const exercise = await courseRenderer.getCourseExercise(language, course_id);
        return { exercise };
      },
    },
  },
];
