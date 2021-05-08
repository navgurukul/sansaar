const _ = require('lodash');
const Joi = require('@hapi/joi');
const ClassRegistrations = require('../models/classRegistrations');
const Classes = require('../models/classes');
const User = require('../models/user');
const { patchCalendarEvent } = require('../bot/calendar');
const { getRouteScope } = require('./helpers');

const nonAllowedDomains = ['fake.com'];

module.exports = [
  {
    method: 'GET',
    path: '/classes',
    options: {
      description: 'Gets a list of all classes user registered to',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        query: Joi.object({
          platform: Joi.string().valid('web', 'android'),
          versionCode: Joi.string().optional(),
        }),
      },
      handler: async (request) => {
        const { classesService, displayService } = request.services();
        const userId = request.auth.credentials.id;
        const [err, classes] = await classesService.getClasses(userId);
        if (err) {
          return err;
        }
        const data = await displayService.upcomingClassesWithEnrolledKey(classes, userId);
        if (request.query.platform === 'android' && request.query.versionCode < '18') {
          return data.map((d) => {
            return { class: d };
          });
        }
        return data;
      },
    },
  },
  {
    method: 'GET',
    path: '/classes/user/{userId}',
    options: {
      description:
        'Gets a list of all classes a particular user registered to ( Meant for dashboard admin )',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: getRouteScope('classAdmin'),
      },
      validate: {
        params: Joi.object({
          userId: User.field('id'),
        }),
      },
      handler: async (request) => {
        const { classesService, displayService } = request.services();
        const { userId } = request.params;
        const [err, classes] = await classesService.getClassesByUserId(userId);
        if (err) {
          return err;
        }
        return { classes: await displayService.getClasses(classes) };
      },
    },
  },
  {
    method: 'POST',
    path: '/classes/{classId}/register',
    options: {
      description: 'Registers to a specific class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        payload: Joi.object({
          feedback: ClassRegistrations.field('feedback').optional(),
          feedback_at: ClassRegistrations.field('feedback_at').optional(),
        }),
      },
      handler: async (request) => {
        const { classesService, displayService, userService, chatService } = request.services();
        const { classId } = request.params;
        const userId = parseInt(request.auth.credentials.id, 10);
        const payload = {
          ...request.payload,
          user_id: userId,
          class_id: classId,
          registered_at: new Date(),
        };
        const [errWhileRegistering, registered] = await classesService.registerToClassById(payload);
        if (errWhileRegistering) {
          return errWhileRegistering;
        }
        const [errWhileFetching, classDetails] = await classesService.getClassById(classId);
        if (errWhileFetching) {
          return errWhileFetching;
        }
        const regUsers = await displayService.getClassRegisteredUsers(classId);
        let facilitatorEmail;
        if (classDetails.facilitator_id !== null) {
          const [err, facilitatorDetails] = await userService.findById(classDetails.facilitator_id);
          if (err) {
            return err;
          }
          facilitatorEmail = facilitatorDetails.email;
        } else {
          facilitatorEmail = classDetails.facilitator_email;
        }
        const emailList = [];
        _.forEach(regUsers, (user) => {
          if (!nonAllowedDomains.includes(user.email.split('@').pop())) {
            emailList.push({ email: user.email });
          }
        });
        emailList.push({ email: facilitatorEmail });
        try {
          await patchCalendarEvent(classDetails, emailList);
        } catch {
          // eslint-disable-next-line
          console.log('Calendar event error');
        }
        chatService.sendClassJoinConfirmation(classDetails, userId);
        return registered;
      },
    },
  },
  {
    method: 'DELETE',
    path: '/classes/{classId}/unregister',
    options: {
      description: 'Cancel registration to a specific class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
      },
      handler: async (request) => {
        const { classesService, userService, displayService, chatService } = request.services();
        const { classId } = request.params;
        const userId = request.auth.credentials.id;
        const [
          errWhileUnregistering,
          removedRegistration,
        ] = await classesService.removeRegistrationById(classId, userId);

        if (errWhileUnregistering) {
          return errWhileUnregistering;
        }
        const [errWhileFetching, classDetails] = await classesService.getClassById(classId);

        if (errWhileFetching) {
          return errWhileFetching;
        }
        let facilitatorEmail;
        if (classDetails.facilitator_id !== null) {
          const [err, facilitatorDetails] = await userService.findById(classDetails.facilitator_id);
          if (err) {
            return err;
          }
          facilitatorEmail = facilitatorDetails.email;
        } else {
          facilitatorEmail = classDetails.facilitator_email;
        }
        const emailList = [];
        const regUsers = await displayService.getClassRegisteredUsers(classId);

        _.forEach(regUsers, (user) => {
          if (!nonAllowedDomains.includes(user.email.split('@').pop())) {
            emailList.push({ email: user.email });
          }
        });
        emailList.push({ email: facilitatorEmail });
        try {
          await patchCalendarEvent(classDetails, emailList);
        } catch {
          // eslint-disable-next-line
          console.log('Calendar event error');
        }
        chatService.classDropoutMessage(userId);
        return removedRegistration;
      },
    },
  },
];
