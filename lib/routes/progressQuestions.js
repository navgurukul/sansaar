const Joi = require('@hapi/joi');
const { getRouteScope } = require('./helpers');
const ProgressQuestion = require('../models/progressQuestion');
const CONFIG = require('../config');

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
          name: ProgressQuestion.field('name'),
          description: ProgressQuestion.field('description'),
          type: ProgressQuestion.field('type'),
        }),
      },
      handler: async (request) => {
        const { progressTrackingService, displayService } = request.services();

        const question = await progressTrackingService.createQuestion(request.payload);
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

        const questions = await progressTrackingService.findQuestions();
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
          questionId: ProgressQuestion.field('id'),
        }),
      },
      handler: async (request) => {
        const { progressTrackingService, displayService } = request.services();

        const { questionId } = request.params;

        const question = await progressTrackingService.findQuestionById(questionId);
        return { question: await displayService.progressQuestion(question) };
      },
    },
  },
  {
    method: 'PUT',
    path: '/progressTracking/questions/{questionId}',
    options: {
      description: 'Update a parameter.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('team'),
      },
      validate: {
        params: Joi.object({
          questionId: ProgressQuestion.field('id'),
        }),
        payload: Joi.object({
          name: ProgressQuestion.field('name'),
          description: ProgressQuestion.field('description'),
          type: ProgressQuestion.field('type'),
        }),
      },
      handler: async (request, h) => {
        const { progressTrackingService, displayService } = request.services();

        const { questionId } = request.params;

        const updateAndFetch = async (txn) => {
          await progressTrackingService.updateQuestion(questionId, request.payload, txn);
          return progressTrackingService.findQuestionById(questionId, txn);
        };

        const question = await h.context.transaction(updateAndFetch);
        return { question: await displayService.progressQuestion(question) };
      },
    },
  },
];
