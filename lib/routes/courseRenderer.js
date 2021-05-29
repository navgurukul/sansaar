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
      handler: async (request, h) => {
        const { courseRenderer } = request.services();
        const { language, course_id } = request.params;
        const [err, exercise] = await courseRenderer.getCourseExercise(course_id);
        if (err) {
          return h.response(err).code(err.code);
        }
        return { exercise };
      },
    },
  },
];
