const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const { google } = require('googleapis');
const User = require('../models/user');
const UserRole = require('../models/userRole');
const { getEditableRoles, getRouteScope } = require('./helpers');
const CONFIG = require('../config/index');

const { OAuth2 } = google.auth;

module.exports = [
  {
    method: 'POST',
    path: '/users/create',
    options: {
      description: 'Create a user (Sign Up)',
      tags: ['api'],
      handler: async (request, h) => {
        const { userService, displayService } = request.services();
        // eslint-disable-next-line
        let [err, user] = await userService.createUser();
        if (err) {
          return h.response(err).code(err.code);
        }

        // creating JWT token
        const token = await userService.createToken(user);

        // creating an account in matrix chat
        const matrixCredentials = await displayService.createMatrixCredentials(user.name, user.id);
        const { room_id, ...chatCredentials } = matrixCredentials;
        user = { ...user, ...chatCredentials };
        return { user, room_id, token };
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
          mode: Joi.string().valid('web', 'android').default('web').required(),
          id: Joi.number().greater(0).optional(),
        }),
      },
      handler: async (request) => {
        const { userService, displayService } = request.services();
        const userObj = await userService.loginWithGoogle(request.payload);
        const token = await userService.createToken(userObj.user);
        let user = await displayService.userProfile(userObj.user);
        const is_first_time = userObj.first_time_login;

        // Create Matrix credentials if user is signing up
        if (request.payload.id === undefined && user.chat_id === null) {
          const matrixCredentials = await displayService.createMatrixCredentials(
            userObj.user.name,
            userObj.user.id
          );
          const { room_id, ...chatCredentials } = matrixCredentials;
          user = { ...user, ...chatCredentials };
          await displayService.updateMatrixProfile(user);
          return { user, room_id, token, is_first_time };
        }
        // if (request.payload.id !== undefined)
        await displayService.updateMatrixProfile(user);

        // Return user credentials and token only if user is linking account
        return { user, token, is_first_time };
      },
    },
  },
  {
    method: 'GET',
    path: '/users/generateAuthURL',
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
        console.log(authURL);
        return { url: authURL };
      },
    },
  },
  {
    method: 'PUT',
    path: '/users/tokens',
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
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { userService } = request.services();
        const user_id = request.auth.credentials.id;
        const user_email = request.auth.credentials.email;
        const { code } = request.headers;
        let tokens;
        const oAuth2Client = new OAuth2(
          CONFIG.auth.googleClientIDWeb,
          CONFIG.auth.googleClientSecretWeb
        );

        try {
          tokens = await oAuth2Client.getToken(code);
          // console.log(tokens);
        } catch (err) {
          // console.log(err);
          return { error: true, message: 'Something went wrong' };
        }

        const { access_token, refresh_token } = tokens.tokens;
        const payload = { user_id, user_email, access_token, refresh_token };
        const [err, res] = await userService.storeUserTokens(payload);
        if (err) {
          return h.response(err).code(err.code);
        }
        return res;
      },
    },
  },
  {
    method: 'GET',
    path: '/users/tokens',
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
          return h.response(err).code(err.code);
        }
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
          return h.response(err).code(err.code);
        }
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
            return h.response(errInUpdate).code(errInUpdate.code);
          }
          const [err, user] = await userService.findById(userId, txn);
          if (err) {
            return [err, null];
          }
          return [null, user];
        };

        const [err, user] = await h.context.transaction(updateAndFetch);
        if (err) {
          return h.response(err).code(err.code);
        }

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
          if (errInAddingRole) return [errInAddingRole, null];
          const [err, user] = await userService.findById(userId, txn);
          if (err) {
            return [err, null];
          }
          return [null, user];
        };

        const [err, user] = await h.context.transaction(updateAndFetch);
        if (err) {
          return h.response(err).code(err.code);
        }

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
          if (errInDeletingRole) return [errInDeletingRole, null];
          const [err, user] = await userService.findById(userId, txn);
          if (err) {
            return [err, null];
          }
          return [null, user];
        };

        const [err, user] = await h.context.transaction(updateAndFetch);
        if (err) {
          return h.response(err).code(err.code);
        }

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
        const { userService, displayService } = request.services();

        const { artifacts: token } = request.auth;
        const [err, user] = await userService.findById(token.decoded.id);
        if (err) {
          return h.response(err).code(err.code);
        }

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
          const utmContent = payload.referrer.split('&')[1].split('=')[1];
          const decodedURL = decodeURIComponent(utmContent);
          const partner_id = decodedURL.split(':')[1];
          // eslint-disable-next-line
          payload = { ...request.payload, partner_id: partner_id };
        }
        const [err, user] = await userService.updateById(token.decoded.id, payload);
        if (err) {
          return h.response(err).code(err.code);
        }
        await displayService.updateMatrixProfile(user);
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
        if (err) return h.response(err).code(err.code);
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
        if (err) return h.response(err).code(err.code);
        return user;
      },
    },
  },
];
