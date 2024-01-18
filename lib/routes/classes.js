/* eslint-disable prettier/prettier */
/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi').extend(require('@joi/date'));
const _ = require('lodash');
const Boom = require('@hapi/boom');
const logger = require('../../server/logger');
// const botFunctions = require('../bot/actions');
const classInformation = require('../helpers/classesInfo/pythonClassInfo.json');
const classSpoken = require('../helpers/classesInfo/englishClassInfo.json');
const Classes = require('../models/classes');
const {
  parseISOStringToDateObj,
  dateObjToYYYYMMDDFormat,
  convertToIST,
  UTCToISTConverter,
} = require('../helpers/index');
const Dotenv = require('dotenv');

const buildSchema = (requestType) => {
  return Joi.object({
    title: requestType === 'POST' ? Joi.string().required() : Joi.string().optional(),
    sub_title: Joi.string().optional(),
    description: requestType === 'POST' ? Joi.string().required() : Joi.string().optional(),
    facilitator_id:
      requestType === 'POST' ? Joi.number().integer().greater(0).optional() : Joi.forbidden(),
    facilitator_name: requestType === 'POST' ? Joi.string().optional() : Joi.forbidden(),
    facilitator_email:
      requestType === 'POST'
        ? Joi.string()
          .optional()
          .pattern(
            // eslint-disable-next-line
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          )
        : Joi.forbidden(),
    volunteer_id:
      requestType === 'POST'
        ? Joi.number().integer().required()
        : Joi.number().integer().optional(),

    start_time:
      requestType === 'POST'
        ? Joi.date().required().min('now')
        : Joi.date()
          .optional()
          .less(Joi.ref('end_time'))
          .when('end_time', { is: Joi.exist(), then: Joi.date().required() }),
    end_time:
      requestType === 'POST'
        ? Joi.date().required().greater(Joi.ref('start_time'))
        : Joi.date().optional(),
    exercise_id: Joi.number().optional(),
    course_id: Joi.number().optional(),
    pathway_id:
      requestType === 'POST'
        ? Joi.number().integer().required()
        : Joi.number().integer().optional(),
    category_id:
      requestType === 'POST'
        ? Joi.number().integer().required()
        : Joi.number().integer().optional(),
    video_id: Joi.string().optional(),
    lang:
      requestType === 'POST'
        ? Joi.string().valid('hi', 'en', 'te', 'ta').lowercase().required()
        : Joi.string().valid('hi', 'en', 'te', 'ta').lowercase().optional(),
    type:
      requestType === 'POST'
        ? Joi.string().valid('doubt_class', 'revision', 'batch').required()
        : Joi.string().valid('doubt_class', 'revision', 'batch').optional(),
    schedule: Joi.object().keys({
      SU: Joi.object().keys({
        startTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/),
        endTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
      }).optional(),
      MO: Joi.object().keys({
        startTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/),
        endTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
      }).optional(),
      TU: Joi.object().keys({
        startTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/),
        endTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
      }).optional(),
      WE: Joi.object().keys({
        startTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/),
        endTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
      }).optional(),
      TH: Joi.object().keys({
        startTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/),
        endTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
      }).optional(),
      FR: Joi.object().keys({
        startTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/),
        endTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
      }).optional(),
      SA: Joi.object().keys({
        startTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/),
        endTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
      }).optional(),
    }),
    meet_link: Joi.string(),
    calendar_event_id: Joi.string(),
    material_link: Joi.string().uri().optional(),
    max_enrolment: Joi.number().integer().greater(0).optional(),
    partner_id: Joi.array().items(Joi.number().integer().greater(0)).optional(),
    space_id: Joi.number().integer().greater(0).allow(null).optional(),
    group_id: Joi.number().integer().greater(0).allow(null).optional(),
    frequency: Joi.string().valid('DAILY', 'WEEKLY').optional(),
    on_days: Joi.array()
      .when('frequency', {
        is: Joi.exist(),
        then: Joi.array().items(
          Joi.string().valid('SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'BYMONTH')
        ),
        otherwise: Joi.forbidden(),
      })
      .optional(),
    occurrence: Joi.number()
      .when('frequency', {
        is: Joi.exist(),
        then: Joi.number().integer().greater(0),
        otherwise: Joi.forbidden(),
      })
      .max(48)
      .optional(),
    until: Joi.date()
      .when('occurrence', {
        not: Joi.exist(),
        then: Joi.date().format('YYYY-MM-DD').utc().greater(Joi.ref('end_time')),
        otherwise: Joi.forbidden(),
      })
      // users can create class for next 24 weeks only
      .max(dateObjToYYYYMMDDFormat(new Date(new Date().getTime() + 24 * 60 * 60 * 1000 * 24 * 7)))
      .optional(),
  });
};

module.exports = [
  {
    method: 'POST',
    path: '/classes',
    options: {
      description: 'Creates a class and returns the created class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        payload: buildSchema('POST'),
        headers: Joi.object({
          role: Joi.string().valid('volunteer').optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const {
          classesService,
          userService,
          // chatService,
          displayService,
          calendarService,
          userRoleService,
          pathwayServiceV2,
          partnerService,
          youtubeBroadCastService
        } = request.services();
        let {id, email} = request.auth.credentials;
        let { payload } = request;
        const { space_id, partner_id, group_id } = payload;
        function errorReturnFunction(error) {
          logger.error(JSON.stringify(error));
          return h.response(error).code(error.code);
        }
        if (partner_id) {
          await partnerService.PartnerStatusActiveChange(partner_id)
        }
        if (space_id !== undefined) {
          const [err1] = await partnerService.getPartnerSpaceBySpaceid(space_id)
          if (err1) {
            await errorReturnFunction(err1)
          }
        }
        if (group_id !== undefined) {
          const [err] = await partnerService.getGroupByGroupID(group_id)
          if (err) {
            await errorReturnFunction(err);
          }
        }
        if (space_id && partner_id && group_id) {
          const [err2] = await partnerService.relationChickerPartnerSpaceGroup(partner_id[0], space_id, group_id)
          if (err2) {
            await errorReturnFunction(err2);
          }
        }

        const { role } = request.headers;
        let pathway;
        const recurringEvents = [];
        if (payload.description.length > 555) {
          return h.response('Description needs to be less than 555 characters!!').code(400);
        }
        if (payload.frequency && payload.pathway_id !== null && payload.pathway_id !== undefined) {
          let res_data = await pathwayServiceV2.findPathwayById(payload.pathway_id);
          let error = res_data[0]
          if (error) {
            logger.error("error in the partner_specific_class table");
            return h.response(error).code(error.status);
          }
          pathway = res_data[1]
          if (pathway.code.toUpperCase() === 'PRGPYT') {
            payload.occurrence = 28;
          } else if (pathway.code.toUpperCase() === 'SPKENG') {
            payload.occurrence = 15;
          } else if (pathway.code.toUpperCase() === 'ACB') {
            payload.occurrence = 4;
          }else if (pathway.code.toUpperCase() === 'ZIB') {
            payload.occurrence = 30;
          } else {
            // eslint-disable-next-line
            if (payload.occurrence === undefined || payload.occurrence === null) {
              payload.occurrence = 48;
            }
          }
        } else if (
          payload.frequency &&
          (payload.pathway_id === null || payload.pathway_id === undefined)
        ) {
          if (payload.occurrence === undefined || payload.occurrence === null) {
            payload.occurrence = 48;
          }
        }

        // if (payload.facilitator_id !== undefined) {
        // const [err, user] = await userService.findById(payload.facilitator_id);
        // if (err) {
        // // eslint-disable-next-line
        // logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(err));
        // return h.response(err).code(err.code);
        // }
        // facilitator = await displayService.userProfile(user);
        // } else if (
        // payload.facilitator_id === undefined &&
        // payload.facilitator_email !== undefined
        // ) {
        // facilitator = { name: payload.facilitator_name, email: payload.facilitator_email };
        // } else {
        payload = {
          ...payload,
          facilitator_id: request.auth.credentials.id,
        };
        const [errUser, userDetailsfindById] = await userService.findById(payload.facilitator_id);
        if (errUser) {
          // eslint-disable-next-line
          logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(errUser));
          return h.response(errUser).code(errUser.code);
        }
        const facilitator = await displayService.userProfile(userDetailsfindById);
        // }
        if (payload.on_days) payload.on_days = payload.on_days.join(',');
        // #TODO

        try {
          const calendarEvent = await calendarService.createCalendarEvent(payload, facilitator, payload.schedule);
          const meetLink = calendarEvent.data.hangoutLink.split('/').pop();
          // If the intent is to create a recurring event
          if (payload.frequency) {
            const allEvents = await calendarService.getRecurringInstances(
              calendarEvent.data.id,
              payload.facilitator_id,
              facilitator.email
            );
            // capture all instances of a recurring event
            recurringEvents.push(...allEvents.data.items);
            if (payload.schedule) {
              delete payload.schedule
            }
          }
          payload = {
            ...payload,
            calendar_event_id: calendarEvent.data.id,
            meet_link: meetLink,
          };
        } catch (err) {
          /* eslint-disable */
          logger.info('Calendar event error' + err);
          return h
            .response({
              error: 'true',
              message: 'Unable to create class, please contact platform@navgurukul.org',
            })
            .code(400);
        }

        const recurringPayload = [];
        if (recurringEvents.length > 0) {
          const privateChat = {
            visibility: 'private',
            roomAliasName:
              payload.title.replace(/[^a-zA-Z]/g, '') +
              facilitator.name.replace(/[^a-zA-Z]/g, '') +
              Math.floor(Math.random() * 1000),
            name: payload.title,
            topic: `${payload.title} by ${facilitator.name}`,
          };
          // const createdRoom = await botFunctions.createARoom(privateChat);
          // const cohort_room = createdRoom.room_id;
          // const [error, user] = await userService.getUserByEmail(request.auth.credentials.email);
          // if (error) {
          // eslint-disable-next-line
          // logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(error));
          // }
          // await chatService.addUsersToMerakiClass(
          // cohort_room,
          // `@${user[0].chat_id}:navgurukul.org`
          // );
          // await chatService.sendInitialMessageToFacilitator(cohort_room, user[0].id);
          const recurringMetadata = (({
            frequency,
            on_days,
            occurrence,
            until,
            calendar_event_id,
            // cohort_room_id,
          }) => ({
            frequency,
            on_days,
            occurrence,
            until,
            calendar_event_id,
            // cohort_room_id,
          }))(payload);
          // recurringMetadata.cohort_room_id = cohort_room;
          const [err, recurringClassEntry] = await classesService.createRecurringEvent(
            recurringMetadata
          );
          if (err) {
            // eslint-disable-next-line
            logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          if (
            payload.partner_id !== undefined &&
            payload.partner_id !== null &&
            payload.partner_id.length > 0
          ) {
            // eslint-disable-next-line
            for (const partner_id of payload.partner_id) {
              // eslint-disable-next-line
              let { err } = await classesService.partnerSpecificClass(
                null,
                recurringClassEntry.id,
                partner_id,
                payload.space_id,
                payload.group_id,
                payload.pathway_id
              );
              if (err) {
                logger.error("error in the partner_specific_class table");
                return h.response(err).code(err.code);
              }
            }
          }

          delete payload.group_id;
          delete payload.space_id;
          delete payload.partner_id;

          recurringEvents.forEach((e) => {
            const { frequency, on_days, occurrence, until, ...instances } = payload;
            const startTimeParsed = parseISOStringToDateObj(e.start.dateTime);
            const endTimeParsed = parseISOStringToDateObj(e.end.dateTime);
            instances.start_time = UTCToISTConverter(startTimeParsed);
            instances.end_time = UTCToISTConverter(endTimeParsed);
            instances.calendar_event_id = e.id;
            instances.recurring_id = recurringClassEntry.id;
            delete e.partner_id
            recurringPayload.push(instances);
          });
          let pathwayDetails;
          if (
            payload.frequency &&
            payload.pathway_id !== null &&
            payload.pathway_id !== undefined
          ) {
            let res_data = await pathwayServiceV2.findPathwayById(payload.pathway_id);
            let error = res_data[0]
            if (error) {
              logger.error("error in the partner_specific_class table");
              return h.response(error).code(error.status);
            }
            pathwayDetails = res_data[1]
            if (payload.occurrence !== recurringPayload.length){
              const [err] = await calendarService.firstEventDeleteSchedule(recurringEvents[0].id, payload.facilitator_id, facilitator.email)
              if (err) {
                await errorReturnFunction(err)
                return h.response(err).code(err.code);
              }
              recurringPayload.shift()
            }
            if (pathwayDetails.code === 'PRGPYT') {
              recurringPayload.forEach((e, index) => {
                e.sub_title = classInformation[index].subTitle;
                e.description = classInformation[index].description;
                e.exercise_id = classInformation[index].exerciseId;
                e.course_id = classInformation[index].courseId;
              });
            } else if (pathwayDetails.code === 'SPKENG') {
              recurringPayload.forEach((e, index) => {
                e.sub_title = classSpoken[index].subTitle;
                e.description = classSpoken[index].description;
                e.exercise_id = classSpoken[index].exerciseId;
                e.course_id = classSpoken[index].courseId;
              });
            }
          }
          
          const [errInRecurring, createdClasses] = await classesService.createClass(
            recurringPayload,
            role
          );
          if (errInRecurring) {
            // eslint-disable-next-line
            logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(errInRecurring));
            return h.response(errInRecurring).code(errInRecurring.code);
          }

          // createdClasses i want to filter this array id, start_time, end_time, recurring_id, title, description
          let schedule_broadcasts = createdClasses.map((sc)=>{
            const { id, start_time, end_time, recurring_id, title, description } = sc;
            return { id, start_time, end_time, recurring_id, title, description };
          });
          if (pathwayDetails.code === 'ACB' || pathwayDetails.code === 'ZIB') {
            youtubeBroadCastService.syncCreateLiveBroadcast(schedule_broadcasts);
          }
          logger.info(`reccuring classes created by- ${request.auth.credentials.id}`);

          if (payload.volunteer_id !== undefined) {
            const [errVolunteerDetails, volunteerDetails] = await userRoleService.volunteerUserById(
              payload.volunteer_id
            );

            if (errVolunteerDetails) {
              // eslint-disable-next-line
              logger.error(`id- ${payload.volunteer_id}: ` + JSON.stringify(errVolunteerDetails));
              return h.response(errVolunteerDetails).code(errVolunteerDetails.code);
            }
            if (
              volunteerDetails !== null &&
              volunteerDetails !== undefined &&
              volunteerDetails.length > 0
            ) {
              const [errVolunteerUserDetail, volunteerUserDetail] = await userService.findById(
                volunteerDetails[0].user_id
              );
              if (errVolunteerUserDetail) {
                logger.error(
                  // eslint-disable-next-line
                  `id- ${errVolunteerUserDetail}: ` + JSON.stringify(errVolunteerUserDetail)
                );
                return h.response(errVolunteerUserDetail).code(errVolunteerUserDetail.code);
              }
              const volDetails = await displayService.userProfile(volunteerUserDetail);

              await classesService.registerClasses(createdClasses[0].id, true, volDetails, h);
            }
          }
          return createdClasses;
        }
        const { frequency, occurrence, until, on_days, ...payloadCopy } = payload;
        payloadCopy.start_time = convertToIST(payloadCopy.start_time);
        payloadCopy.end_time = convertToIST(payloadCopy.end_time);
        const partnerIds = payloadCopy.partner_id;
        const spaceId = payloadCopy.space_id;
        const groupId = payloadCopy.group_id;

        delete payloadCopy.partner_id;
        delete payloadCopy.space_id;
        const [errInSingle, singleClass] = await classesService.createClass([payloadCopy], role);
        if (errInSingle) {
          // eslint-disable-next-line
          logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(errInSingle));
          return h.response(errInSingle).code(errInSingle.code);
        }
        // createdClasses i want to filter this array id, start_time, end_time, recurring_id, title, description
        let schedule_broadcasts = singleClass.map((sc)=>{
          const { id, start_time, end_time, recurring_id, title, description } = sc;
          return { id, start_time, end_time, recurring_id, title, description };
        });
        if (partnerIds === 932) {
          youtubeBroadCastService.syncCreateLiveBroadcast(schedule_broadcasts);
        }
        logger.info(`single class created by- ${request.auth.credentials.id}`);
        if (partnerIds !== undefined && partnerIds !== null && partnerIds.length > 0) {
          // eslint-disable-next-line
          for (const partner_id of partnerIds) {
            // eslint-disable-next-line
            let { err } = await classesService.partnerSpecificClass(
              singleClass[0].id,
              null,
              partner_id,
              spaceId,
              groupId,
              payload.pathway_id
            );
            if (err) {
              logger.error("error in the partner_specific_class table");
              return h.response(err).code(err.code);
            }
          }
        }
        if (payload.volunteer_id !== undefined) {
          const [errVolunteerDetails, volunteerDetails] = await userRoleService.volunteerUserById(
            payload.volunteer_id
          );

          if (errVolunteerDetails) {
            // eslint-disable-next-line
            logger.error(`id- ${payload.volunteer_id}: ` + JSON.stringify(errVolunteerDetails));
            return h.response(errVolunteerDetails).code(errVolunteerDetails.code);
          }
          if (
            volunteerDetails !== null &&
            volunteerDetails !== undefined &&
            volunteerDetails.length > 0
          ) {
            const [errVolunteerUserDetail, volunteerUserDetail] = await userService.findById(
              volunteerDetails[0].user_id
            );
            if (errVolunteerUserDetail) {
              logger.error(
                // eslint-disable-next-line
                `id- ${errVolunteerUserDetail}: ` + JSON.stringify(errVolunteerUserDetail)
              );
              return h.response(errVolunteerUserDetail).code(errVolunteerUserDetail.code);
            }
            const volDetails = await displayService.userProfile(volunteerUserDetail);

            await classesService.registerClasses(singleClass[0].id, true, volDetails, h);
          }
        }
        return singleClass;
      },
    },
  },
  {
    method: 'GET',
    path: '/classes/{classId}',
    options: {
      description: 'Get details of a class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
      },
      handler: async (request, h) => {
        const singleClass = [];
        const { classesService, displayService } = request.services();
        const { classId } = request.params;
        const userId = request.auth.credentials.id;
        const [err, classById] = await classesService.getClassById(classId);
        if (err) {
          // eslint-disable-next-line
          logger.error(`classId- ${classId} ` + JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        singleClass.push(classById);
        const singleClassWithFacilitator = await displayService.getUpcomingClassFacilitators(
          singleClass
        );
        const classDetails = await displayService.getClassDetails(
          singleClassWithFacilitator,
          userId
        );
        logger.info(`Get details of a class by id- ${classId}`);
        return classDetails;
      },
    },
  },
  {
    method: 'PUT',
    path: '/classes/{classId}',
    options: {
      description: 'Updates a class and returns it as response',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        payload: buildSchema('PUT'),
        headers: Joi.object({
          'update-all': Joi.boolean().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const {
          classesService,
          displayService,
          userService,
          calendarService,
          pathwayServiceV2,
          userRoleService,
          youtubeBroadCastService
        } = request.services();
        const { classId } = request.params;
        let {id, email} = request.auth.credentials;
        const [errWhileFetchingSingle, singleClass] = await classesService.getClassById(classId);
        if (errWhileFetchingSingle) {
          /* eslint-disable */
          logger.error(
            `id- ${request.auth.credentials.id}: ` + JSON.stringify(errWhileFetchingSingle)
          );
          return h.response(errWhileFetchingSingle).code(errWhileFetchingSingle.code);
        }

        const [
          errInPartnerId,
          getPartnerSpecificClassId,
        ] = await classesService.getPartnerSpecificClass(singleClass.id, singleClass.recurring_id);

        if (errInPartnerId) {
          /* eslint-disable */
          logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(errInPartnerId));
          return h.response(errInPartnerId).code(errInPartnerId.code);
        }

        const [
          errInSpaceId,
          getPartnerSpecificSpaceId,
        ] = await classesService.getSpaceSpecificClass(singleClass.id, singleClass.recurring_id);
        if (errInSpaceId) {
          /* eslint-disable */
          logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(errInPartnerId));
          return h.response(errInPartnerId).code(errInPartnerId.code);
        }

        const partnerIds = request.payload.partner_id
          ? request.payload.partner_id
          : getPartnerSpecificClassId;

        delete request.payload.partner_id;

        let spaceIds = null;

        if (
          getPartnerSpecificSpaceId !== null &&
          getPartnerSpecificSpaceId !== undefined &&
          getPartnerSpecificSpaceId.length > 0
        ) {
          spaceIds = request.payload.space_id
            ? request.payload.space_id
            : getPartnerSpecificSpaceId[0];
        }
        delete request.payload.space_id;

        // If a recurring event is to be updated as a whole
        if (request.headers['update-all'] && singleClass.recurring_id !== null) {
          const [
            errWhileFetchingRecurring,
            recurringClasses,
          ] = await classesService.getClassesByRecurringId(singleClass.recurring_id);
          if (errWhileFetchingRecurring) {
            /* eslint-disable */
            logger.error(
              `id- ${request.auth.credentials.id}: ` + JSON.stringify(errWhileFetchingRecurring)
            );
          
            return h.response(errWhileFetchingRecurring).code(errWhileFetchingRecurring.code);
          }
          const createPayload = {};
          /**
           * Creating a new payload with values provided in request.payload for all valid classes model fields
           * If values are not provided in payload, values from older data is set
           */

          Classes.fields().forEach((f) => {
            if (request.payload[f] !== undefined) {
              createPayload[f] = request.payload[f];
            } else {
              createPayload[f] = singleClass[f];
            }
          });
          // Adding extra values of provided payload in actual payload (which are not a part of classes model)
          Object.keys(request.payload).forEach((k) => {
            if (createPayload[k] === undefined) {
              createPayload[k] = request.payload[k];
            }
          });

          let facilitator;
          // Setting facilitator for corresponding class, to create a calendar event
          if (createPayload.facilitator_id) {
            const [err, user] = await userService.findById(createPayload.facilitator_id);
            if (err) {
              /* eslint-disable */
              logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(err));
              return h.response(err).code(err.code);
            }
            const withFacilitorData = await displayService.userProfile(user);
            facilitator = { name: withFacilitorData.name, email: withFacilitorData.email };
          } else if (
            !createPayload.facilitator_id &&
            createPayload.facilitator_email !== undefined
          ) {
            facilitator = {
              name: createPayload.facilitator_name,
              email: createPayload.facilitator_email,
            };
          }

          if (createPayload.on_days) createPayload.on_days = createPayload.on_days.join(',');

          if (
            !createPayload.hasOwnProperty('frequency') &&
            singleClass.parent_class.frequency !== null
          ) {
            createPayload.frequency = singleClass.parent_class.frequency;
          }
          if (
            !createPayload.hasOwnProperty('occurrence') &&
            singleClass.parent_class.occurrence !== null
          ) {
            createPayload.occurrence = singleClass.parent_class.occurrence;
          }
          if (!createPayload.hasOwnProperty('until') && singleClass.parent_class.until !== null) {
            createPayload.until = singleClass.parent_class.until;
          }
          if (
            !createPayload.hasOwnProperty('on_days') &&
            singleClass.parent_class.on_days !== null
          ) {
            createPayload.on_days = singleClass.parent_class.on_days;
          }
          const recurringEvents = [];
          const allRegs = [];

          // Creating a list of original attendees / those who enrolled for the class
          recurringClasses.forEach((c) => {
            allRegs.push(...c.registrations);
          });
          const allRegIds = [];
          createPayload.attendees = [];
          if (allRegs.length > 0) {
            allRegs.forEach((rId) => {
              if (allRegIds.indexOf(rId.user_id) < 0) {
                allRegIds.push(rId.user_id);
              }
            });
            const [errInGettingEmail, originalAttendees] = await userService.findByListOfIds(
              allRegIds,
              'email'
            );
            if (errInGettingEmail) {
              /* eslint-disable */
              logger.error(
                `id- ${request.auth.credentials.id}: ` + JSON.stringify(errInGettingEmail)
              );

              return h.response(errInGettingEmail).code(errInGettingEmail.code);
            }
            createPayload.attendees.push(...originalAttendees);
          }

          if (_.findIndex(createPayload.attendees, { email: facilitator.email }) < 0) {
            createPayload.attendees.push({ email: facilitator.email });
          }
          // adding classes_to_courses data to createPayload
          createPayload.pathway_id = request.payload.pathway_id
            ? request.payload.pathway_id
            : singleClass.pathway_id;
          createPayload.course_id = request.payload.course_id
            ? request.payload.course_id
            : singleClass.course_id;
          createPayload.exercise_id = request.payload.exercise_id
            ? request.payload.exercise_id
            : singleClass.exercise_id;

          try {
            // Deleting the present calendar event
            await calendarService.deleteCalendarEvent(
              singleClass.parent_class.calendar_event_id,
              singleClass.facilitator_id,
              facilitator.email
            );
            // Creating a new calendar event to replace the deleted one with updated data
            const calendarEvent = await calendarService.createCalendarEvent(
              createPayload,
              facilitator,
              request.payload.schedule
            );
            const meetLink = calendarEvent.data.hangoutLink.split('/').pop();
            // Getting all recurring instances of the calendar event
            const allEvents = await calendarService.getRecurringInstances(
              calendarEvent.data.id,
              facilitator.id,
              facilitator.email
            );
            // Capturing all instances of a recurring event
            recurringEvents.push(...allEvents.data.items);
            // Updating the payload with new calendar event id and meet link
            createPayload.calendar_event_id = calendarEvent.data.id;
            createPayload.meet_link = meetLink;
            delete createPayload.schedule
            delete request.payload.schedule
          } catch (err) {
            /* eslint-disable */
            logger.error(`Calendar event error` + JSON.stringify(err));

            return h
              .response({
                error: 'true',
                message: 'Unable to edit class, please contact platform@navgurukul.org',
              })
              .code(400);
          }
          // Deleting individual classes from the classes table
          const deleteClasses = async () => {
            const [errorInDeletingAll, deletedClasses] = await classesService.deleteMultipleClasses(
              singleClass.recurring_id
            );
            if (errorInDeletingAll) {
              /* eslint-disable */
              logger.error(
                `id- ${request.auth.credentials.id}: ` + JSON.stringify(errorInDeletingAll)
              );
              return h.response(errorInDeletingAll).code(errorInDeletingAll.code);
            }
            return deletedClasses;
          };
          const checkIfClassesDeleted = await h.context.transaction(deleteClasses);
          if ('error' in checkIfClassesDeleted) {
            logger.error(
              `id- ${request.auth.credentials.id}: ` + JSON.stringify(checkIfClassesDeleted)
            );
            return checkIfClassesDeleted;
          }

          // Creating payload for `recurring_classes` table entry
          const recurringMetadata = (({
            frequency,
            on_days,
            occurrence,
            until,
            calendar_event_id,
          }) => ({
            frequency,
            on_days,
            occurrence,
            until,
            calendar_event_id,
          }))(createPayload);

          /**
           * Inserting data in `recurring_classes` row
           * Rows could be simply updated instead, but when we delete multiple classes,
           * corresponding linked row in `recurring_classes` table for them is also deleted
           */

          const [err, recurringClassEntry] = await classesService.createRecurringEvent(
            recurringMetadata
          );
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          const recurringPayload = [];
          const registrationPayload = [];
          let pathwayDetails;

          // Creating multiple payloads for each recurring_class instance
          recurringEvents.forEach((e) => {
            const {
              id,
              frequency,
              on_days,
              occurrence,
              until,
              attendees,
              ...instances
            } = createPayload;
            const startTimeParsed = parseISOStringToDateObj(e.start.dateTime);
            const endTimeParsed = parseISOStringToDateObj(e.end.dateTime);

            instances.start_time = UTCToISTConverter(startTimeParsed);
            instances.end_time = UTCToISTConverter(endTimeParsed);

            instances.calendar_event_id = e.id;
            instances.recurring_id = recurringClassEntry.id;
            const filteredInstance = _.omitBy(instances, _.isNull);
            recurringPayload.push(filteredInstance);
          });
          if (
            createPayload.frequency &&
            createPayload.pathway_id !== null &&
            createPayload.pathway_id !== undefined
          ) {
            let res_data = await pathwayServiceV2.findPathwayById(createPayload.pathway_id);
            let error = res_data[0]
            if (error) {
              logger.error("error in the partner_specific_class table");
              return h.response(error).code(error.status);
            }
            pathwayDetails = res_data[1]
            if (pathwayDetails.code === 'PRGPYT') {
              recurringPayload.forEach((e, index) => {
                e.sub_title = classInformation[index].subTitle;
                e.description = classInformation[index].description;
                e.exercise_id = classInformation[index].exerciseId;
                e.course_id = classInformation[index].courseId;
              });
            }
            if (pathwayDetails.code === 'SPKENG') {
              recurringPayload.forEach((e, index) => {
                e.sub_title = classSpoken[index].subTitle;
                e.description = classSpoken[index].description;
                e.exercise_id = classSpoken[index].exerciseId;
                e.course_id = classSpoken[index].courseId;
              });
            }
          }
          if (partnerIds !== undefined && partnerIds !== null && partnerIds.length > 0) {
            // eslint-disable-next-line
            for (const partner_id of partnerIds) {
              // eslint-disable-next-line
              await classesService.partnerSpecificClass(
                null,
                recurringClassEntry.id,
                partner_id,
                createPayload.space_id,
                createPayload.group_id,
                createPayload.pathway_id
              );
            }
          }

          // Creating new classes in batch
          const [errInRecurring, createdClasses] = await classesService.createClass(
            recurringPayload
          );
          if (errInRecurring) {
            logger.error(`id- ${request.auth.credentials.id}: ` + JSON.stringify(errInRecurring));
            return h.response(errInRecurring).code(errInRecurring.code);
          }
          // createdClasses i want to filter this array id, start_time, end_time, recurring_id, title, description
          let schedule_broadcasts = createdClasses.map((sc)=>{
            const { id, start_time, end_time,title, description, recurring_id,  } = sc;
            return { class_id:id, recurring_id, start_time, end_time,title, description };
          });
          if (pathwayDetails.code === 'ACB' || pathwayDetails.code === 'ZIB') {
            await youtubeBroadCastService.updateRecurringAndClassIDsYouTubeBroadcast(schedule_broadcasts, singleClass.recurring_id);
          }

          // Creating payload for all older registrations for recurring class
          if (allRegIds.length > 0) {
            _.forEach(createdClasses, (c) => {
              _.forEach(allRegIds, (id) => {
                registrationPayload.push({
                  user_id: id,
                  class_id: c.id,
                  registered_at: new Date(),
                });
              });
            });

            // Inserting older registrations for each new class
            // eslint-disable-next-line
            const [errWhileRegistering, registered] = await classesService.registerToClassById(
              registrationPayload
            );
            if (errWhileRegistering) {
              logger.error(
                `id- ${request.auth.credentials.id}: ` + JSON.stringify(errWhileRegistering)
              );
              return h.response(errWhileRegistering).code(errWhileRegistering.code);
            }
          }
          if (request.payload.volunteer_id !== undefined) {
            const [errVolunteerDetails, volunteerDetails] = await userRoleService.volunteerUserById(
              request.payload.volunteer_id
            );

            if (errVolunteerDetails) {
              // eslint-disable-next-line
              logger.error(
                `id- ${request.payload.volunteer_id}: ` + JSON.stringify(errVolunteerDetails)
              );
              return h.response(errVolunteerDetails).code(errVolunteerDetails.code);
            }
            if (
              volunteerDetails !== null &&
              volunteerDetails !== undefined &&
              volunteerDetails.length > 0
            ) {
              const [errVolunteerUserDetail, volunteerUserDetail] = await userService.findById(
                volunteerDetails[0].user_id
              );
              if (errVolunteerUserDetail) {
                // eslint-disable-next-line
                logger.error(
                  `id- ${errVolunteerUserDetail}: ` + JSON.stringify(errVolunteerUserDetail)
                );
                return h.response(errVolunteerUserDetail).code(errVolunteerUserDetail.code);
              }
              const volDetails = await displayService.userProfile(volunteerUserDetail);

              await classesService.registerClasses(createdClasses[0].id, true, volDetails, h);
            }
          }

          logger.info(`class updated by- ${request.auth.credentials.id}`);
          return createdClasses;
        }

        // If a single class is updated
        if (request.payload.start_time)
          request.payload.start_time = convertToIST(request.payload.start_time);
        if (request.payload.end_time)
          request.payload.end_time = convertToIST(request.payload.end_time);

        const [err, patchedClass] = await classesService.updateClass(classId, request.payload);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        let [errYoutube, did] = await youtubeBroadCastService.updateLiveBroadcast([{'start_time': request.payload.start_time,'end_time': request.payload.start_time, class_id: classId}]);
        if (errYoutube) {
          return h.response(errYoutube).code(errYoutube.code);
        }
        if (partnerIds !== undefined && partnerIds !== null && partnerIds.length > 0) {
          await classesService.deletePartnerSpecificClass(patchedClass.id);
          // eslint-disable-next-line
          for (const partner of partnerIds) {            
            // eslint-disable-next-line
            await classesService.partnerSpecificClass( 
              patchedClass.id,
              null, 
              partner);
          }
        }

        if (request.payload.volunteer_id !== undefined) {
          const [errVolunteerDetails, volunteerDetails] = await userRoleService.volunteerUserById(
            request.payload.volunteer_id
          );

          if (errVolunteerDetails) {
            // eslint-disable-next-line
            logger.error(
              `id- ${request.payload.volunteer_id}: ` + JSON.stringify(errVolunteerDetails)
            );
            return h.response(errVolunteerDetails).code(errVolunteerDetails.code);
          }
          if (
            volunteerDetails !== null &&
            volunteerDetails !== undefined &&
            volunteerDetails.length > 0
          ) {
            const [errVolunteerUserDetail, volunteerUserDetail] = await userService.findById(
              volunteerDetails[0].user_id
            );
            if (errVolunteerUserDetail) {
              // eslint-disable-next-line
              logger.error(
                `id- ${errVolunteerUserDetail}: ` + JSON.stringify(errVolunteerUserDetail)
              );
              return h.response(errVolunteerUserDetail).code(errVolunteerUserDetail.code);
            }
            const volDetails = await displayService.userProfile(volunteerUserDetail);

            await classesService.registerClasses(patchedClass.id, true, volDetails, h);
          }
        }

        try {
          await calendarService.patchCalendarEvent(patchedClass);
        } catch {
          // eslint-disable-next-line
          logger.error(`id- ${request.auth.credentials.id}: Calendar Event error`);
        }
        logger.info(`single class updated by- ${request.auth.credentials.id}`);
        return [patchedClass];
      },
    },
  },
  {
    method: 'DELETE',
    path: '/classes/{classId}',
    options: {
      description: 'Deletes a class (Dashboard Admin and class creators only)',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
        headers: Joi.object({
          'delete-all': Joi.boolean().optional(),
        }),
        options: { allowUnknown: true },
      },
      handler: async (request, h) => {
        const { classesService, userService, displayService, calendarService, youtubeBroadCastService } = request.services();
        const [errInFetching, classToDelete] = await classesService.getClassById(
          request.params.classId
        );
        let {id,email} = request.auth.credentials
        const { artifacts: token } = request.auth;
        const [errInUser, user] = await userService.findById(token.decoded.id);
        if (errInUser) {
          logger.error(`id- ${request.auth.credentials}` + JSON.stringify(errInUser));
          return h.response(errInUser).code(errInUser.code);
        }
        const userWithRoles = await displayService.userProfile(user);

        if (errInFetching) {
          logger.error(`id- ${request.auth.credentials}` + JSON.stringify(errInFetching));
          return h.response(errInFetching).code(errInFetching.code);
        }
        if (
          !(
            userWithRoles.rolesList.indexOf('classAdmin') > -1 ||
            userWithRoles.rolesList.indexOf('admin') > -1 ||
            // eslint-disable-next-line
            userWithRoles.id == classToDelete.facilitator_id
          )
        ) {
          throw Boom.forbidden(`You do not have rights to delete this class.`);
        }
        let calendarEventId;
        if (request.headers['delete-all'] && classToDelete.parent_class) {
          calendarEventId = classToDelete.parent_class.calendar_event_id;
        } else {
          calendarEventId = classToDelete.calendar_event_id;
        }
        try {
          await calendarService.deleteCalendarEvent(
            calendarEventId,
            classToDelete.facilitator_id,
            classToDelete.facilitator_email
          );
        } catch {
          // eslint-disable-next-line
          logger.error(`id- ${request.auth.credentials.id}: Calendar Event error`);
        }

        if (request.headers['delete-all'] && classToDelete.parent_class) {
          const deleteClasses = async () => {
            youtubeBroadCastService.syncDeleteBroadcast(classToDelete.recurring_id, null)
            const [errorInDeletingAll, deletedClasses] = await classesService.deleteMultipleClasses(
              classToDelete.recurring_id
            );
            if (errorInDeletingAll) {
              logger.error(
                `id- ${request.auth.credentials.id}` + JSON.stringify(errorInDeletingAll)
              );
              return h.response(errorInDeletingAll).code(errorInDeletingAll.code);
            }
            logger.info(
              `Classes with class id - ${request.params.classId} deleted by user - ${request.auth.credentials}`
            );
            return deletedClasses;
          };

          const checkIfClassesDeleted = await h.context.transaction(deleteClasses);

          if ('error' in checkIfClassesDeleted) {
            logger.error(JSON.stringify(checkIfClassesDeleted));
            return checkIfClassesDeleted;
          }
          logger.info('checkIfClassDeleted');
          return checkIfClassesDeleted;
        }

        const deleteAClass = async () => {
          if (pathwayDetails.code === 'ACB' || pathwayDetails.code === 'ZIB'){
            youtubeBroadCastService.syncDeleteBroadcast(null, request.params.classId)
          }
          const [errInDeleting, deletedClass] = await classesService.deleteClass(
            request.params.classId
          );
          if (errInDeleting) {
            logger.error(`id- ${request.auth.credentials}` + JSON.stringify(errInDeleting));
            return h.response(errInDeleting).code(errInDeleting.code);
          }
          logger.info(
            `Class with class id - ${request.params.classId} deleted by id- ${request.auth.credentials}`
          );
          return deletedClass;
        };

        const checkIfClassDeleted = await h.context.transaction(deleteAClass);

        if ('error' in checkIfClassDeleted) {
          logger.error(JSON.stringify(checkIfClassDeleted));
          return checkIfClassDeleted;
        }
        logger.info(
          `Class with class id - ${request.params.classId} deleted by id ${request.auth.credentials}`
        );
        return checkIfClassDeleted;
      },
    },
  },
  {
    method: 'GET',
    path: '/classes/update_classes_to_courses_table',
    options: {
      description: 'Updates classes to courses table',
      tags: ['api'],
      // auth: {
      //   strategy: 'jwt',
      // },
      handler: async (request, h) => {
        const { classesService } = request.services();
        const [err, classes] = await classesService.getClassesTemp();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        // insert into classes_to_courses
        const [error, data] = await classesService.insertIntoClassesToCourses(classes);
        return classes;
      },
    },
  },
  {
    method: 'GET',
    path: '/classes/{classId}/revision',
    options: {
      description: 'Get revision classes of a class',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        params: Joi.object({
          classId: Classes.field('id'),
        }),
      },
      handler: async (request, h) => {
        const { classesService, displayService } = request.services();
        const { classId } = request.params;
        const [err, classById] = await classesService.getClassByIdForRevision(classId);
        if (err) {
          // eslint-disable-next-line
          logger.error(`classId- ${classId} ` + JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        let data = [];
        if (classById.sub_title !== null) {
          let [err, revisionClasses] = await classesService.getClassBySubtitle(
            classId,
            classById.sub_title,
            classById.recurring_id
          );
          if (err) {
            // eslint-disable-next-line
            logger.error(`classId- ${classId} ` + JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          for (let i in revisionClasses) {
            revisionClasses[i] = await classesService.getFixedClasses(
              revisionClasses[i],
              request.auth.credentials
            );
            revisionClasses[i].type = 'revision';
            if (revisionClasses[i].is_enrolled) {
              data.push(revisionClasses[i]);
            }
          }
          if (data !== null && data !== undefined && data.length > 0) {
            return displayService.getUpcomingClassFacilitators(data);
          }

          if (revisionClasses.length > 3) {
            revisionClasses = revisionClasses.slice(0, 3);
          }
          return displayService.getUpcomingClassFacilitators(revisionClasses);
        } else {
          logger.info(`Get details of a class by id- ${classId}`);
          return data;
        }
      },
    },
  },
  {
    method: 'POST',
    path: '/classes/upload/s3-to-youtube',
    options: {
      description: 'Upload class video from AWS S3 to Youtube',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          video: Joi.string().required(),
          title: Joi.string(),
          description: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { youtubeService } = request.services();
        const { video, title, description } = request.payload;

        const [err, videoId] = await youtubeService.uploadFromS3({ video, title, description });
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err.message).code(err.code);
        }
        return { id: videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
      },
    },
  },

  {
    method: 'GET',
    path: '/classes/{recurringId}/students',
    options: {
      description: 'Get the students detail by recurringId',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          recurringId: Joi.number().integer().required(),
        }),
        query: Joi.object({
          pathway_id: Joi.number().integer(),
        })
      },
      handler: async (request, h) => {
        try {
          const { classesService, displayService, pathwayServiceV2 } = request.services();
          const { recurringId } = request.params;
          const { pathway_id } = request.query;
          let pathwayCourses, errpathwayIDBy
          if (pathway_id) {
            [
              errpathwayIDBy,
              pathwayCourses,
            ] = await pathwayServiceV2.pathwayIDBycoursesExercisesAssessmentsIds(
              pathway_id
            );

            if (errpathwayIDBy) {
              logger.error(JSON.stringify(errpathwayIDBy));
              return h.response(errpathwayIDBy).code(errpathwayIDBy.code);
            }

          }
          const [err2, studentsData, userIds] = await classesService.getStudentsDataByRecurringId(recurringId, pathway_id);
          if (err2) {
            // eslint-disable-next-line
            logger.error(JSON.stringify(err2));
            return h.response(err2).code(err2.code);
          }
          if (pathway_id) {
            const [err, coursePerformance] = await pathwayServiceV2.resultScorePathwayCoursesUsers(
              userIds,
              pathwayCourses, studentsData
            );
            if (err) {
              // eslint-disable-next-line
              logger.error(JSON.stringify(err));
              return h.response(err).code(err.code);
            }
            return h.response(coursePerformance).code(200);
          }

          return studentsData
        } catch (error) {
          return h.response({ error: error.message }).code(500);
        }
      },
    },
  },

  {
    method: 'GET',
    path: '/class/{group_id}/checkBatchTitle',
    options: {
      description: 'get the batched data by the recurring_id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        params: Joi.object({
          group_id: Joi.number().integer().required(),
        }),
        query: Joi.object({
          title: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        try {
          const { classesService } = request.services();
          const { group_id } = request.params;
          const { title } = request.query;
          const [err, checkBatch] = await classesService.checkBatchTitle(group_id, title);
          if (err) {
            logger.error(JSON.stringify(err));
            return h.response(err).code(err.code);
          }
          return checkBatch;
        } catch (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
      },
    },
  },
];