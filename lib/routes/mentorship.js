const Joi = require('@hapi/joi');
const User = require('../models/user');
const Pathways = require('../models/pathway');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/mentorship/users/{userId}/mentees',
    options: {
      description: 'Get the mentees for given user under the specified pathway.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['team', 'facha', 'admin', 'trainingAndPlacement'],
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
          pathwayId: Pathways.field('id'),
        }),
      },
      handler: async (request, h) => {
        const {
          displayService,
          mentorshipService,
          userService,
          pathwayService,
        } = request.services();

        const { pathwayId, userId } = request.params;
        /* eslint-disable */
        const [errInPathway, pathway] = await pathwayService.findById(pathwayId);
        const [errInUser, user] = await userService.findById(userId);
        if (errInPathway || errInUser) {
          logger.error('errInPathway || errInUser');
          return errInPathway
            ? h.response(errInPathway).code(errInPathway.code)
            : h.response(errInUser).code(errInUser.code);
        }
        /* eslint-enable */

        const [err, mentees] = await mentorshipService.getMentees(pathwayId, userId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get the mentees for given user under the specified pathway');
        return { mentees: await displayService.userProfile(mentees) };
      },
    },
  },
  {
    method: 'POST',
    path: '/pathways/{pathwayId}/mentorship/users/{userId}/mentees',
    options: {
      description: 'Add mentees of the user under a specified pathway.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['team', 'facha', 'admin', 'trainingAndPlacement'],
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
          pathwayId: Pathways.field('id'),
        }),
        payload: Joi.object({
          menteeIds: Joi.array().items(User.field('id')),
        }),
      },
      handler: async (request, h) => {
        const {
          displayService,
          mentorshipService,
          userService,
          pathwayService,
        } = request.services();

        const { pathwayId, userId } = request.params;
        const { menteeIds } = request.payload;

        /* eslint-disable */
        const [errInPathway, pathway] = await pathwayService.findById(pathwayId);
        const [errInUser, user] = await userService.findById(userId);
        if (errInPathway || errInUser) {
          logger.error('errInPathway || errInUser');
          return errInPathway
            ? h.response(errInPathway).code(errInPathway.code)
            : h.response(errInUser).code(errInUser.code);
        }
        /* eslint-enable */

        const addAndFetchMentees = async (txn) => {
          // eslint-disable-next-line
          const [errInAddingMentees, menteeAdded] = await mentorshipService.addMentees(
            pathwayId,
            userId,
            menteeIds,
            txn
          );
          if (errInAddingMentees) return [errInAddingMentees, null];
          const [errInFetching, mentees] = await mentorshipService.getMentees(
            pathwayId,
            userId,
            txn
          );
          if (errInFetching) return [errInFetching, null];
          return [null, mentees];
        };

        const [err, mentees] = await h.context.transaction(addAndFetchMentees);

        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Add mentees of the user under a specified pathway');
        return { mentees: await displayService.userProfile(mentees) };
      },
    },
  },
  {
    method: 'DELETE',
    path: '/pathways/{pathwayId}/mentorship/users/{userId}/mentees',
    options: {
      description: 'Delete mentees under the specified pathway.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['team', 'facha', 'admin', 'trainingAndPlacement'],
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
          pathwayId: Pathways.field('id'),
        }),
        payload: Joi.object({
          menteeIds: Joi.array().items(User.field('id')),
        }),
      },
      handler: async (request, h) => {
        const {
          displayService,
          mentorshipService,
          userService,
          pathwayService,
        } = request.services();

        const { pathwayId, userId } = request.params;
        const { menteeIds } = request.payload;
        /* eslint-disable */
        const [errInPathway, pathway] = await pathwayService.findById(pathwayId);
        const [errInUser, user] = await userService.findById(userId);
        if (errInPathway || errInUser) {
          logger.error('errInPathway || errInUser');
          return errInPathway
            ? h.response(errInPathway).code(errInPathway.code)
            : h.response(errInUser).code(errInUser.code);
        }
        /* eslint-enable */
        const deleteAndFetchMentees = async (txn) => {
          // eslint-disable-next-line
          const [errInDeleting, menteeDeleted] = await mentorshipService.deleteMentees(
            pathwayId,
            userId,
            menteeIds,
            txn
          );
          if (errInDeleting) return [errInDeleting, null];
          const [errInFetching, mentees] = await mentorshipService.getMentees(
            pathwayId,
            userId,
            txn
          );
          if (errInFetching) return [errInFetching, null];
          return [null, mentees];
        };

        const [err, mentees] = await h.context.transaction(deleteAndFetchMentees);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Delete mentees under the specified pathway');
        return { mentees: await displayService.userProfile(mentees) };
      },
    },
  },
  {
    method: 'GET',
    path: '/pathways/{pathwayId}/mentorship/tree',
    options: {
      description: 'Get the complete mentorship tree of the pathway.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['team', 'facha', 'admin', 'trainingAndPlacement'],
      },
      validate: {
        params: Joi.object({
          pathwayId: Pathways.field('id'),
        }),
      },
      handler: async (request) => {
        const { mentorshipService, pathwayService } = request.services();

        const { pathwayId } = request.params;
        await pathwayService.findById(pathwayId);
        const tree = await mentorshipService.getMentorTree(pathwayId);
        logger.info('Get the complete mentorship tree of the pathway');
        return { tree };
      },
    },
  },
];
