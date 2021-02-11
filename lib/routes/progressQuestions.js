const Joi = require('@hapi/joi');
const { getRouteScope } = require('./helpers');
const ProgressQuestions = require('../models/progressQuestion');

module.exports = [
  {
    method: 'POST',
    path: '/progressTracking/questions',
    options: {
      description: 'Create a question which can be used for progress tracking.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        payload: Joi.object({
          name: ProgressQuestions.field('name'),
          description: ProgressQuestions.field('description'),
          type: ProgressQuestions.field('type'),
        }),
      },
      handler: async (request) => {
        const { progressTrackingService, displayService } = request.services();

        const [err, question] = await progressTrackingService.createQuestion(request.payload);
        if (err) {
          return err;
        }
        return { question: await displayService.progressQuestion(question) };
      },
    },
  },
  {
    method: 'GET',
    path: '/progressTracking/questions',
    options: {
      description: 'List of all progress questions.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      handler: async (request) => {
        const { progressTrackingService, displayService } = request.services();

        const [err, questions] = await progressTrackingService.findQuestions();
        if (err) {
          return err;
        }
        return { questions: await displayService.progressQuestion(questions) };
      },
    },
  },
  {
    method: 'GET',
    path: '/progressTracking/questions/{questionId}',
    options: {
      description: 'List of all progress parameters.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          questionId: ProgressQuestions.field('id'),
        }),
      },
      handler: async (request) => {
        const { progressTrackingService, displayService } = request.services();

        const { questionId } = request.params;

        const [err, question] = await progressTrackingService.findQuestionById(questionId);
        if (err) {
          return err;
        }
        return { question: await displayService.progressQuestion(question) };
      },
    },
  },
  {
    method: 'PUT',
    path: '/progressTracking/questions/{questionId}',
    options: {
      description: 'Update a question.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          questionId: ProgressQuestions.field('id'),
        }),
        payload: Joi.object({
          name: ProgressQuestions.field('name'),
          description: ProgressQuestions.field('description'),
          type: ProgressQuestions.field('type'),
        }),
      },
      handler: async (request, h) => {
        const { progressTrackingService, displayService } = request.services();

        const { questionId } = request.params;

        // const updateAndFetch = async (txn) => {
        //   await progressTrackingService.updateQuestion(questionId, request.payload, txn);
        //   return progressTrackingService.findQuestionById(questionId, txn);
        // };
        // const question = await h.context.transaction(updateAndFetch);

        const [err, question] = await progressTrackingService.updateQuestionAndFetch(
          questionId,
          request.payload
        );
        if (err) {
          return err;
        }

        return { question: await displayService.progressQuestion(question) };
      },
    },
  },
];
