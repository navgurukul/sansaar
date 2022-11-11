const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'POST',
    path: '/attendance',
    options: {
      description: 'store google meet attendance record',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          id: Joi.number().integer().greater(0),
          attendee_names: Joi.string().required(),
          attendedDurationInSec: Joi.string().required(),
          meet_code: Joi.string().required(),
          meeting_time: Joi.string().required(),
          meeting_title: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { attendanceTrackerService } = request.services();
        const data = request.payload;
        const [err, response] = await attendanceTrackerService.recordAttendance(data);
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('attendance data stored in database');
        return 'attendance recorded';
      },
    },
  },
];
