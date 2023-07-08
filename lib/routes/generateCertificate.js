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
          pathway_code: Joi.string()
        }),
      },
      handler: async (request, h) => {
        const { generateCertificateService, teacherService } = request.services();
        const user_id = request.auth.credentials.id;
        // codes of pathways to generate certificate
        const python_code = "prgpyt"
        const tcb_code = "tcbpi"
        const [errInteachers, teachers] = await teacherService.getTeacherDataByUserId(user_id);
        if (errInteachers) {
          logger.error(JSON.stringify(errInteachers));
          return h.response(errInteachers).code(errInteachers.code);
        }

        // if(pathway_code= request.query.pathway_code){}
        const certificate_data = {
          Course: 'Python Programming',
          weekDuration: '14 Weeks',
          Year: '2022',
        };
        const [err, certificate] = await generateCertificateService.generateCertificate(
          request.auth.credentials.id,
          request.auth.credentials.name,
          certificate_data.Course,
          certificate_data.weekDuration,
          certificate_data.Year,
          request.query.pathway_code,
          teachers[0].teacher_name,
          teachers[0].school_name,
          request.auth.credentials.user_id,
        );

        if (err) {
          logger.error(JSON.stringify(err));
          return h.response("Certificate not allowed for this pathway").code(404)
        }
        if (request.query.pathway_code.toLowerCase() == python_code) {

          logger.info('Generate certificate of Python');
        }
        else if (request.query.pathway_code.toLowerCase() == tcb_code) {
          logger.info('Generate certificate of Teacher');

        }

        return { url: certificate };
      },
    },
  },
];
