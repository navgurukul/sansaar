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
          course_id: Joi.number().integer(),
        }),
        query: Joi.object({
          language: Joi.string().valid('hi', 'en', 'te', 'ta').lowercase(),
        }),
      },
      handler: async (request, h) => {
        const { courseRenderer } = request.services();
        // eslint-disable-next-line
        const { language } = request.query;
        const { course_id } = request.params;
        const [err, exercise] = await courseRenderer.getCourseExercise(course_id);
        if (err) {
          return h.response(err).code(err.code);
        }
        return { exercise };
      },
    },
  },
];
