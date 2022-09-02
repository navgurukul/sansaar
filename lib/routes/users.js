const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const { google } = require('googleapis');
const User = require('../models/user');
const UserRole = require('../models/userRole');
const { getEditableRoles, getRouteScope } = require('./helpers');
const CONFIG = require('../config/index');
const logger = require('../../server/logger');

const { OAuth2 } = google.auth;

module.exports = [
  {
    method: 'POST',
    path: '/users/create',
    options: {
      description: 'Create a user (Sign Up)',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          mode: Joi.string().valid('web', 'android').optional(),
          lang: Joi.string().valid('hi', 'en', 'te', 'ta').lowercase().optional(),
        }).allow(null),
        headers: Joi.object({
          'version-code': Joi.string().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { userService, displayService, chatService } = request.services();
        let lang;
        let mode;
        if (request.payload) {
          lang = request.payload.lang;
          mode = request.payload.mode;
        }
        // eslint-disable-next-line
        let [err, user] = await userService.createUser(lang, mode);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }

        // creating JWT token
        const token = await userService.createToken(user);

        // Create matrix credentials
        const matrixCredentials = await displayService.createMatrixCredentials(user.name, user.id);
        user = { ...user, ...matrixCredentials };
        // Sending initial message to store user's language preference if version-code is sent in headers
        if (request.headers['version-code'] < 35) {
          const roomId = await chatService.createChatRoom(
            `@${matrixCredentials.chat_id}:navgurukul.org`
          );
          await chatService.sendInitialMessage(roomId.room_id);
          return { user, ...roomId, token };
        }
        chatService.createChatRoom(`@${matrixCredentials.chat_id}:navgurukul.org`);
        logger.info('Create a user (Sign Up)');
        return { user, token };
      },
    },
  },
  {
    method: 'POST',
    path: '/users/auth/google',
    options: {
      description:
        'Generate JWT for sansaar, matrix chat_id and chat_password using google idToken.',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          idToken: Joi.string().required(),
          mode: Joi.string().valid('web', 'android').optional(),
          id: Joi.number().greater(0).optional(),
          lang: Joi.string().valid('hi', 'en', 'te', 'ta').lowercase(),
        }),
        headers: Joi.object({
          'version-code': Joi.string().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { userService, displayService, chatService } = request.services();
        const userObj = await userService.loginWithGoogle(request.payload);

        // adding partnerGroupIds to the user object
        const [err, partnerGroupId] = await userService.getPartnerGroupIds(userObj.user);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        userObj.user.partner_group_id = partnerGroupId;

        const token = await userService.createToken(userObj.user);
        let user = await displayService.userProfile(userObj.user);
        const is_first_time = userObj.first_time_login;

        // Create Matrix credentials if user is signing up
        if (request.payload.id === undefined && user.chat_id === null) {
          const matrixCredentials = await displayService.createMatrixCredentials(
            userObj.user.name,
            userObj.user.id
          );
          user = { ...user, ...matrixCredentials };
          if (request.headers['version-code'] < 35) {
            const roomId = await chatService.createChatRoom(
              `@${matrixCredentials.chat_id}:navgurukul.org`
            );
            await chatService.sendInitialMessage(roomId.room_id);
            return { user, ...roomId, token, is_first_time };
          }
          chatService.createChatRoom(`@${matrixCredentials.chat_id}:navgurukul.org`);
          await displayService.updateMatrixProfile(user);
          return { user, token, is_first_time };
        }
        // if (request.payload.id !== undefined)
        await displayService.updateMatrixProfile(user);

        // Return user credentials and token only if user is linking account
        logger.info(
          'Generate JWT for sansaar, matrix chat_id and chat_password using google idToken'
        );
        return { user, token, is_first_time };
      },
    },
  },
  {
    method: 'GET',
    path: '/users/calendar/generateAuthURL',
    options: {
      description: 'Genereate auth URL for user to get consent for calendar permissions',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request) => {
        const { calendarService } = request.services();
        const userId = request.auth.credentials.id;
        const userEmail = request.auth.credentials.email;
        const authURL = await calendarService.generateAuthUrl(userId, userEmail);
        // eslint-disable-next-line
        logger.info('Genereate auth URL for user to get consent for calendar permissions');
        return { url: authURL };
      },
    },
  },
  {
    method: 'PUT',
    path: '/users/calendar/tokens',
    options: {
      description:
        'Save user access token and refresh token for calendar after successful user consent for calendar event permissions.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        headers: Joi.object({
          code: Joi.string(),
        }),
        payload: Joi.object({
          user_id: Joi.number().integer().required(),
          user_email: Joi.string().email().required(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { userService } = request.services();
        const { user_id, user_email } = request.payload;
        const { code } = request.headers;
        let tokens;
        // even if by mistake front-end calls the API more than once, just return the token res
        // eslint-disable-next-line
        const [errInFetchingToken, tokenRes] = await userService.getUserTokens(user_id);
        if (tokenRes.success === true) {
          return tokenRes;
        }
        const oAuth2Client = new OAuth2(
          CONFIG.auth.googleClientIDWeb,
          CONFIG.auth.googleClientSecretWeb,
          CONFIG.auth.googleConsentRedirectURI // Throws error if redirect URI doesn't match
        );

        try {
          tokens = await oAuth2Client.getToken(code);
          // eslint-disable-next-line
          console.log(tokens);
        } catch (err) {
          // eslint-disable-next-line
          logger.error(JSON.stringify(err));
          return h.response({ error: true, message: 'Something went wrong' }).code(400);
        }
        const { access_token, refresh_token } = tokens.tokens;
        const payload = { user_id, user_email, access_token, refresh_token };
        const [err, res] = await userService.storeUserTokens(payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(
          'Save user access token and refresh token for calendar after successful user consent for calendar event permissions'
        );
        return res;
      },
    },
  },
  {
    method: 'GET',
    path: '/users/calendar/tokens',
    options: {
      description: 'Get user access token and refresh token for calendar',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const { userService } = request.services();
        const user_id = request.auth.credentials.id;
        const [err, res] = await userService.getUserTokens(user_id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get user access token and refresh token for calendar');
        return res;
      },
    },
  },
  {
    method: 'GET',
    path: '/users/{userId}',
    options: {
      description: 'Get a single user.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        const [err, user] = await userService.findById(request.params.userId);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get a single user');
        return { user: await displayService.userProfile(user) };
      },
    },
  },
  {
    method: 'PUT',
    path: '/users/{userId}',
    options: {
      description: 'Edit a user (There is a different endpoint to edit the roles.)',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
        payload: Joi.object({
          name: User.field('name'),
          profile_picture: User.field('profile_picture'),
          rolesList: Joi.array().items(UserRole.field('role')),
        }),
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        const { userId } = request.params;

        // #TODO
        const updateAndFetch = async (txn) => {
          // eslint-disable-next-line
          const [errInUpdate, updatedUser] = await userService.update(userId, request.payload, txn);
          if (errInUpdate) {
            logger.error(JSON.stringify(errInUpdate));
            return h.response(errInUpdate).code(errInUpdate.code);
          }
          const [err, user] = await userService.findById(userId, txn);
          if (err) {
            logger.error(JSON.stringify(err));
            return [err, null];
          }
          return [null, user];
        };

        const [err, user] = await h.context.transaction(updateAndFetch);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(
          `id- ${request.auth.credentials.id} Edit a user- ${userId} (There is a different endpoint to edit the roles.)`
        );
        return { user: await displayService.userProfile(user) };
      },
    },
  },
  {
    method: 'POST',
    path: '/users/{userId}/roles',
    options: {
      description: 'Add a set of roles to the user.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['admin'],
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
        payload: Joi.object({
          rolesList: Joi.array().items(UserRole.field('role')),
        }),
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        const { userId } = request.params;

        // check if the current roles of the user gives them right to make the required changes
        const editableRolesForUser = getEditableRoles(request.auth.credentials.scope);
        const nonEditableRoles = _.difference(request.payload.rolesList, editableRolesForUser);
        if (nonEditableRoles.length > 0) {
          throw Boom.forbidden(
            `Logged in user doesn't have the right to edit ${nonEditableRoles.join(',')} role(s).`
          );
        }
        const updateAndFetch = async (txn) => {
          // eslint-disable-next-line
          const [errInAddingRole, roleAdded] = await userService.addRoles(
            userId,
            request.payload.rolesList,
            txn
          );
          if (errInAddingRole) {
            logger.error(JSON.stringify(errInAddingRole));
            return [errInAddingRole, null];
          }
          const [err, user] = await userService.findById(userId, txn);
          if (err) {
            logger.error(JSON.stringify(err));
            return [err, null];
          }
          return [null, user];
        };

        const [err, user] = await h.context.transaction(updateAndFetch);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id- ${request.auth.credentials.id} Add a set of roles to the ${userId} user`);
        return { user: await displayService.userProfile(user) };
      },
    },
  },
  {
    method: 'DELETE',
    path: '/users/{userId}/roles',
    options: {
      description: 'Remove roles from a user.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['admin'],
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
        payload: Joi.object({
          rolesList: Joi.array().items(UserRole.field('role')),
        }),
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        const { userId } = request.params;

        // check if the current roles of the user gives them right to make the required changes
        const editableRolesForUser = getEditableRoles(request.auth.credentials.scope);
        const nonEditableRoles = _.difference(request.payload.rolesList, editableRolesForUser);
        if (nonEditableRoles.length > 0) {
          throw Boom.forbidden(
            `Logged in user doesn't have the right to edit ${nonEditableRoles.join(',')} role(s).`
          );
        }

        const updateAndFetch = async (txn) => {
          // eslint-disable-next-line
          const [errInDeletingRole, deletedRole] = await userService.removeRoles(
            userId,
            request.payload.rolesList,
            txn
          );
          if (errInDeletingRole) {
            return [errInDeletingRole, null];
          }
          const [err, user] = await userService.findById(userId, txn);
          if (err) {
            logger.error(JSON.stringify(err));
            return [err, null];
          }
          return [null, user];
        };

        const [err, user] = await h.context.transaction(updateAndFetch);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`id ${request.auth.credentials.id} Remove roles from ${userId} user`);
        return { user: await displayService.userProfile(user) };
      },
    },
  },
  {
    method: 'GET',
    path: '/users',
    options: {
      description: 'List of all users.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request) => {
        const { userService, displayService } = request.services();

        const results = await userService.find();
        logger.info('List of all users');
        return { users: await displayService.userProfile(results) };
      },
    },
  },
  {
    method: 'GET',
    path: '/users/me',
    options: {
      description: 'Details of current user.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const { userService, displayService, userRoleService } = request.services();
        const { artifacts: token } = request.auth;
        const [err, user] = await userService.findById(token.decoded.id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const volunteerUserId = await userRoleService.volunteerUser(user.id);
        let check = true;
        // eslint-disable-next-line
        for (const user_id of volunteerUserId) {
          const pathways_id = user_id.pathway_id;
          if (user_id.user_id !== null && user_id.user_id !== undefined) {
            check = false;
            user.pathway_id = pathways_id;
          }
        }
        if (check) {
          user.pathway_id = null;
        }
        logger.info('details of current user');
        return { user: await displayService.userProfile(user) };
      },
    },
  },
  {
    method: 'PUT',
    path: '/users/me',
    options: {
      description: 'Update the details of current user',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        payload: Joi.object({
          name: User.field('name'),
          referrer: Joi.string().allow(null),
          lang_1: User.field('lang_1').default('en'),
          lang_2: User.field('lang_2').default('hi'),
        }),
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        const { artifacts: token } = request.auth;
        let payload;
        ({ payload } = request);
        if (request.payload.referrer) {
          const { referrer } = payload;
          const referrerSplit = referrer.split('&');
          // eslint-disable-next-line
          const utmContent = _.forEach(referrerSplit, (q) => {
            if (q.indexOf('utm_content') > -1) return q;
          });
          const decodedURL = decodeURIComponent(utmContent);
          const partner_id = decodedURL.split(':')[1];
          // eslint-disable-next-line
          payload = { ...request.payload, partner_id: partner_id };
        }
        const [err, user] = await userService.updateById(token.decoded.id, payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        if (payload.name) {
          await displayService.updateMatrixProfile(user);
        }
        logger.info('Update the details of current user');
        return { user: await displayService.userProfile(user) };
      },
    },
  },
  {
    method: 'GET',
    path: '/users/classes',
    options: {
      description: 'Get a user/volunteer record on classes conducted',
      tags: ['api'],
      validate: {
        query: Joi.object({
          id: Joi.number().integer(),
          email: Joi.string().email(),
        }),
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        const { id, email } = request.query;
        const [err, res] = await userService.getUserClassRecords(id, email);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get a user/volunteer record on classes conducted');
        return displayService.filterUserClassRecords(res);
      },
    },
  },
  {
    method: 'GET',
    path: '/users/github/{email}',
    options: {
      description: 'Get github study pack access url for navgurukul students',
      tags: ['api'],
      validate: {
        params: Joi.object({
          email: User.field('email'),
        }),
      },
      handler: async (request) => {
        const { userService } = request.services();
        const { email } = request.params;
        const url = await userService.getGitHubAccessUrl(email);
        logger.info('Get github study pack access url for navgurukul students');
        return { url };
      },
    },
  },
  {
    method: 'GET',
    path: '/users/byEmail',
    options: {
      description: 'Get users by email',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('classAdmin'),
      },
      validate: {
        query: Joi.object({
          email: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { userService } = request.services();
        const [err, user] = await userService.getUserByEmail(request.query.email);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get users by email');
        return user;
      },
    },
  },
  {
    method: 'GET',
    path: '/users/students/classes',
    options: {
      description: 'check whether a student is enrolled in the class or not',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['admin'],
      },
      validate: {
        query: Joi.object({
          limit: Joi.number().integer().optional(),
          page: Joi.number().integer().optional(),
          name: Joi.string().optional(),
        }),
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        const [err, data] = await userService.getAllStudent(request.query);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const students = await displayService.filterPartnersUsersData(data.students);
        logger.info(`id- ${request.auth.credentials} Get students data and class activities`);
        return { count: data.count, students };
      },
    },
  },
  {
    method: 'GET',
    path: '/users/EnrolledBatches',
    options: {
      description: 'Gets a list of all upcoming classes in a pathways',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const {
          classesService,
          displayService,
          pathwayServiceV2,
          pathwayService,
        } = request.services();
        const [err, data] = await pathwayServiceV2.find();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        const allClasses = [];
        // eslint-disable-next-line
        for (const i in data) {
          // eslint-disable-next-line
          const [errInPathwayIdDetails, getPathwayIdDetails] = await pathwayServiceV2.findById(
            data[i].id
          );
          if (errInPathwayIdDetails) {
            logger.error(JSON.stringify(errInPathwayIdDetails));
          }
          if (getPathwayIdDetails !== null && getPathwayIdDetails !== undefined) {
            // eslint-disable-next-line
            const [errInOldPathway, getOldPathway] = await pathwayService.getOldPathwayIdByCode(
              getPathwayIdDetails.code
            );
            if (errInOldPathway) {
              logger.error(JSON.stringify(errInOldPathway));
            }

            if (getOldPathway !== null && getOldPathway !== undefined) {
              // eslint-disable-next-line
              const oldData = await classesService.getIfStudentEnrolled(
                request.auth.credentials.id,
                getOldPathway[0].id
              );
              if (oldData.message === 'enrolled') {
                const [
                  errInFetchingOldRecurringClasses,
                  upcomingOldRecurringClasses,
                  // eslint-disable-next-line
                ] = await classesService.getEnrolledClasseByRecurringId(oldData.recurring_id);
                if (errInFetchingOldRecurringClasses) {
                  logger.error(JSON.stringify(errInFetchingOldRecurringClasses));
                }
                if (
                  upcomingOldRecurringClasses !== null &&
                  upcomingOldRecurringClasses.length > 0
                ) {
                  upcomingOldRecurringClasses[0].pathway_name = data[i].name;
                  upcomingOldRecurringClasses[0].is_enrolled = true;
                  allClasses.push(upcomingOldRecurringClasses[0]);
                }
              }
            }
          }
          // eslint-disable-next-line
          const studentEnrolled = await classesService.getIfStudentEnrolled(
            request.auth.credentials.id,
            data[i].id
          );
          if (studentEnrolled.message === 'enrolled') {
            const [
              errInFetchingRecurringClasses,
              upcomingRecurringClasses,
              // eslint-disable-next-line
            ] = await classesService.getEnrolledClasseByRecurringId(studentEnrolled.recurring_id);
            if (errInFetchingRecurringClasses) {
              logger.error(JSON.stringify(errInFetchingRecurringClasses));
            }
            if (upcomingRecurringClasses !== null && upcomingRecurringClasses.length > 0) {
              upcomingRecurringClasses[0].pathway_name = data[i].name;
              upcomingRecurringClasses[0].is_enrolled = true;
              allClasses.push(upcomingRecurringClasses[0]);
            }
          }
        }
        return displayService.getUpcomingClassFacilitators(allClasses);
      },
    },
  },
  {
    method: 'POST',
    path: '/users/volunteerRole',
    options: {
      description: 'Add volunteer role to the user.',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        const updateAndFetch = async (txn) => {
          // eslint-disable-next-line
          const [errInAddingRole, roleAdded] = await userService.addRoles(
            request.auth.credentials.id,
            ['volunteer'],
            txn
          );
          if (errInAddingRole) {
            logger.error(JSON.stringify(errInAddingRole));
            return [errInAddingRole, null];
          }
          const [err, user] = await userService.findById(request.auth.credentials.id, txn);
          if (err) {
            logger.error(JSON.stringify(err));
            return [err, null];
          }
          return [null, user];
        };

        const [err, user] = await h.context.transaction(updateAndFetch);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info(`Added volunteer role to the ${request.auth.credentials.id} user`);
        return { user: await displayService.userProfile(user) };
      },
    },
  },
];
