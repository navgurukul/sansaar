/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const logger = require('../../server/logger');

module.exports = [
  {
    method: 'GET',
    path: '/certificate',
    options: {
      description: 'Generate certificate of pathway',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        query: Joi.object({
          pathwayId: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { generateCertificateService } = request.services();
        const certificate_data = {
          Course: 'Python Programming',
          weekDuration: '14 Weeks',
          Year: '2022',
        };
        const [err, certificate] = await generateCertificateService.generateCertificate(
          // certificate_data.user_id,
          // certificate_data.Name,
          request.auth.credentials.id,
          request.auth.credentials.name,
          certificate_data.Course,
          certificate_data.weekDuration,
          certificate_data.Year
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Generate certificate of Python');

        return { url: certificate };
      },
    },
  },
  {
    method: 'GET',
    path: '/certificate/teachercertificate',
    options: {
      description: 'Generate certificate of teacher capacity building',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
      },
      validate: {
        query: Joi.object({
          pathwayId: Joi.number().integer(),
        }),
      },
      handler: async (request, h) => {
        const { generateCertificateService, teacherService } = request.services();
        const user_id = request.auth.credentials.id;

        const [errInteachers, teachers] = await teacherService.getTeacherDataByUserId(user_id);
        if (errInteachers) {
          logger.error(JSON.stringify(errInteachers));
          return h.response(errInteachers).code(errInteachers.code);
        }
        const [err, certificate] = await generateCertificateService.Certificate(
          user_id,
          teachers[0].teacher_name,
          teachers[0].school_name
        );
        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(err.code);
        }
        logger.info('Generate certificate of teacher capacity building');
        return { url: certificate };
      },
    },
  },
];
