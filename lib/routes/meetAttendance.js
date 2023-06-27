const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/attendance',
    options: {
      description: 'Add meet class attendance',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        payload: Joi.object({
          attendies_data: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { meetAttendanceService } = request.services();

        const record = request.payload;

        const [err, newRecord] = await meetAttendanceService.addRecord(record);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Added new meet class attendance record');
        return { status: 'success', recordID: newRecord.id };
      },
    },
  },

  {
    method: 'GET',
    path: '/attendance',
    options: {
      description: 'Get all meet class attendance record',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      handler: async (request, h) => {
        const { meetAttendanceService } = request.services();

        const [err, allRecord] = await meetAttendanceService.getRecord();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get all meet class attendance record');
        return allRecord;
      },
    },
  },

  {
    method: 'GET',
    path: '/attendance/{id}',
    options: {
      description: 'Get meet class attendance record by id',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      },
      handler: async (request, h) => {
        const { meetAttendanceService } = request.services();

        const [err, record] = await meetAttendanceService.getRecordById(request.params.id);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get meet class attendance record by id');
        if (!record) return { info: 'record not found' };
        return record;
      },
    },
  },

  {
    method: 'GET',
    path: '/attendance/date/{date}',
    options: {
      description: 'Get meet class attendance record by date',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      validate: {
        params: Joi.object({
          date: Joi.string(),
        }),
      },
      handler: async (request, h) => {
        const { meetAttendanceService } = request.services();

        const [err, record] = await meetAttendanceService.getRecordByDate(request.params.date);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Get meet class attendance record by date');
        if (!record || record.length <= 0) return { info: 'record not found' };
        return record;
      },
    },
  },

  {
    method: 'POST',
    path: '/attendance/createdTempCredentialsForUploadVideo',
    options: {
      description: 'Upload video file to S3',
      notes: 'File upload',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        mode: 'optional',
      },
      handler: async (request, h) => {
        const { meetAttendanceService } = request.services();
        const [err, data] = await meetAttendanceService.createTempCredentialsForUploadVideo();
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        return data;
      },
    },
  },
];