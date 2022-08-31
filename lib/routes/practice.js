const Joi = require('@hapi/joi');
// const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/practice',
    options: {
      description: 'creating new demo.',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          user_id: Joi.string().required(),
          // user_id: Joi.number().integer(),
        }),
      },
      handler: async (request,h) => {
        console.log(request.payload,"hii")
        const { practiceService } = request.services();
        const [err,practice]=await practiceService.addPractice(request.payload.user_id)
      
        console.log(practice)
        if (err) {
          return h.response(err)
        }
        return practice;
      },
    },
  },
  {
    method: 'GET',
    path: '/practice',
    options: {
      description: 'Get all the data.',
      tags: ['api'],
      },
      handler: async (request, h) => {
        const { practiceService } = request.services();
        const [err, practice] = await practiceService.findall();
        // console.log(practice,"done")
        if (err) {
          return h.response(err)
        }
        return h.response(practice);
      },
  },

  {
      method: 'PUT',
      path: '/practice/{id}',
      options: {
        description: 'Update data by id',
        tags: ['api'],
        validate:{
          params: Joi.object({
            id:Joi.number().integer().greater(0),
          }),
          payload:Joi.object({
            user_id: Joi.string().required(),
            // user_id:Joi.string()
          })
        },
        handler: async (request, h) => {
          console.log(request.payload,"data")
          const { practiceService } = request.services();
          const [err, practice] = await practiceService.updateDataById(request.params.id,request.payload.user_id);
          console.log(practice , "hello")
          if (err) {
            return h.response(err)
          }
          // return (practice);
        },
      },
    },

    {
    method: 'DELETE',
    path: '/practice/{id}',
    options: {
      description: 'Delete Data by ID',
      tags: ['api'],
      validate: {
        params: Joi.object({
          id: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { practiceService } = request.services();
        const { id } = request.params;
        const [err, deleted] = await practiceService.deleteDataById(id);
        if (err) {
          return h.response(err)
        }
        return (deleted);
      },
    },
  },
]