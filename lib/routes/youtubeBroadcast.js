/* eslint-disable eqeqeq */
const Joi = require('@hapi/joi');

module.exports = [
    {
      method: 'GET',
      path: '/youtubeBroadcast/{recurring_id}',
      options: {
        description: 'Update the youtube broadcast.',
        tags: ['api'],
        auth: {
          strategy: 'jwt',
        },
        validate: {
          params: Joi.object({
            recurring_id: Joi.number().integer().greater(0),
          }),
        },
        handler: async (request, h) => {
          const {  youtubeBroadCastService } = request.services();
          let [err,res]= await youtubeBroadCastService.gettingLiveBroadcast(request.params.recurring_id);
          if (err){
            return h.response(err).code(err.code);
          }
          return h.response(res).code(200);
        },
      },
    },
];
