const Joi = require('@hapi/joi');
const User = require('../models/user');
const UserRole = require('../models/userRole');
const CONFIG = require('../config');

module.exports = [
  {
    method: 'POST',
    path: '/users/auth/google',
    options: {
      description: 'Generate JWT for sansaar using google idToken.',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          idToken: Joi.string().required(),
        }),
      },
      handler: async (request) => {
        const { userService, displayService } = request.services();
        const user = await userService.loginWithGoogle(request.payload.idToken);
        const token = await userService.createToken(user);

        return {
          user: await displayService.userProfile(user),
          token,
        };
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
      handler: async (request) => {
        const { userService, displayService } = request.services();
        const user = await userService.findById(request.params.userId);

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
        
        const updateAndFetch = async (txn) => {
          await userService.update(userId, request.payload);
          return await userService.findById(userId);
        }
        
        const user = await h.context.transaction(updateAndFetch);
        
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
        scope: ['team', 'facha', 'dumbeldore', 'trainingAndPlacement']
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
        
        const updateAndFetch = async (txn) => {
          await userService.addRoles(userId, request.payload.rolesList);
          return await userService.findById(userId);
        }
        
        const user = await h.context.transaction(updateAndFetch);
        
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
        scope: ['team', 'facha', 'dumbeldore', 'trainingAndPlacement']
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
        
        const updateAndFetch = async (txn) => {
          await userService.removeRoles(userId, request.payload.rolesList);
          return await userService.findById(userId);
        }
        
        const user = await h.context.transaction(updateAndFetch);
        
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
        return { users: await displayService.userProfile(results) }
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
      handler: async (request) => {
        const { userService, displayService } = request.services();

        const { artifacts: token } = request.auth;
        const user = await userService.findById(token.decoded.id);

        return { user: await displayService.userProfile(user) }
      },
    },
  },
];
