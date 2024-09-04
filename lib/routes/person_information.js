const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'GET',
    path: '/person',
    options: {
      description: 'List of all persons in the system.',
      tags: ['api'],
      validate: {
        query: Joi.object({
          limit: Joi.number().integer().optional(),
          page: Joi.number().integer().optional(),
          name: Joi.string().optional(),
        }),
      },
      handler: async (request, h) => {
        console.log(request,h,"router file1")
        const { personService } = request.services();
        try {
          console.log(request.query,"routesfile2")
          const [err, data] = await personService.getAllPersons(request.query);
          if (err) {
            throw err;
          }
          logger.info('List of all persons in the system');
          return { count: data.count, persons: data.persons };
        } catch (err) {
          logger.error('Error retrieving persons:', err);
          return h.response({ message: err.message || 'Internal Server Error', code: err.code || 500 }).code(err.code || 500);
        }
      },
    },
  },
  {
    method: 'POST',
    path: '/person',
    options: {
      description: 'Add a new person to the system.',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          email: Joi.string().email().required(),
          state: Joi.string().required(),
          number: Joi.string().pattern(/^[0-9]{10}$/).required(),
        }),
      },
      handler: async (request, h) => {
        console.log(request,h,"router post")
        const { personService } = request.services();
        try {
          const newPerson = await personService.addPerson(request.payload);
          logger.info('New person added to the system');
          return h.response(newPerson).code(200);
        } catch (err) {
          logger.error('Error adding person:', err);
          return h.response({ message: err.message || 'Internal Server Error', code: err.code || 500 }).code(err.code || 500);
        }
      },
    },
  },
  {
    method: 'PUT',
    path: '/person/{id}',
    options: {
      description: 'Update an existing person in the system.',
      tags: ['api'],
      validate:{
        params: Joi.object({
          id: Joi.number().integer().optional(),
        }),
        payload: Joi.object({
          email: Joi.string().email().optional(),
          state: Joi.string().optional(),
          number: Joi.string().pattern(/^[0-9]{10}$/).optional(),

        }),
      },
      handler: async (request, h) => {
        const { personService } = request.services();
        try {
          const updatedPerson = await personService.updatePerson(request.params.id, request.payload);
          logger.info('Person updated in the system');
          return h.response(updatedPerson).code(201);
        } catch (err) {
          logger.error('Error updating person:', err);
          return h.response({ message: err.message || 'Internal Server Error', code: err.code || 500 }).code(err.code || 500);
        }
      },
    },
  },
  {
    method: 'DELETE',
    path: '/person/{id}',
    options: {
      description: 'Delete a person from the system.',
      tags: ['api'],
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { personService } = request.services();
        try {
          const deletedata = await personService.deletePerson(request.params.id);
          console.log(deletedata,"delete data")
          logger.info('Person deleted from the system');
          return h.response(deletedata).code(200);
        } catch (err) {
          logger.error('Error deleting person:', err);
          return h.response({ message: err.message || 'Internal Server Error', code: err.code || 500 }).code(err.code || 500);
        }
      },
    },
  },
];
