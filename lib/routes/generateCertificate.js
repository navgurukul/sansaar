/* eslint-disable prettier/prettier */
const Joi = require('@hapi/joi');
const XLSX = require('xlsx');
const fs = require('fs');
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
          pathway_code: Joi.string().required(),
        }),
      },
      handler: async (request, h) => {
        const { generateCertificateService, teacherService } = request.services();
        const user_id = request.auth.credentials.id;
        // codes of pathways to generate certificate
        const python_code = "prgpyt"
        const tcb_code = "tcbpi"
        const scrach_code = "scrthb"
        // if(pathway_code= request.query.pathway_code){}
        const certificate_data = {
          Course: 'Python Programming',
          weekDuration: '14 Weeks',
          Year: '2022',
        };
        let certificate_value ;
        if (request.query.pathway_code !== undefined && tcb_code == request.query.pathway_code.toLowerCase()){
          const [errInteachers, teachers] = await teacherService.getTeacherDataByUserId(user_id);
          if (errInteachers) {
            logger.error(JSON.stringify(errInteachers));
            return h.response(errInteachers).code(errInteachers.code);
          }
          certificate_value = {
            'id': request.auth.credentials.id,
            'Name': request.auth.credentials.name,
            'Course': certificate_data.Course,
            'weekDuration': certificate_data.weekDuration,
            'Year': certificate_data.Year,
            'pathway_code': request.query.pathway_code,
            'teacher_name': teachers[0].teacher_name,
            'school_name': teachers[0].school_name,
            'user_id': user_id,
          }
        }else if (request.query.pathway_code !== undefined && python_code == request.query.pathway_code.toLowerCase()){
          certificate_value = {
            'id': request.auth.credentials.id,
            'Name': request.auth.credentials.name,
            'Course': certificate_data.Course,
            'weekDuration': certificate_data.weekDuration,
            'Year': certificate_data.Year,
            'pathway_code': request.query.pathway_code,
            'teacher_name': null,
            'school_name': null,
            'user_id': user_id,
          }
        }else if (request.query.pathway_code !== undefined && scrach_code == request.query.pathway_code.toLowerCase()){
          certificate_value = {
            'id': request.auth.credentials.id,
            'Name': request.auth.credentials.name,
            'Course': certificate_data.Course,
            'weekDuration': certificate_data.weekDuration,
            'Year': certificate_data.Year,
            'pathway_code': request.query.pathway_code,
            'teacher_name': null,
            'school_name': null,
            'user_id': user_id,
          }
        }else if (scrach_code == request.query.pathway_code.toLowerCase()){
          certificate_value = {
            'id': request.auth.credentials.id,
            'Name': request.auth.credentials.name,
            'Course': certificate_data.Course,
            'weekDuration': certificate_data.weekDuration,
            'Year': certificate_data.Year,
            'pathway_code': request.query.pathway_code,
            'teacher_name': null,
            'school_name': null,
            'user_id': user_id,
          }
        }
        else{
          return h.response("Certificate not allowed for this pathway").code(404)
        }
        const [err, certificate] = await generateCertificateService.generateCertificate(
          certificate_value
        );

        if (err) {
          logger.error(JSON.stringify(err));
          return h.response(err).code(404)
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


  {
    method: 'POST',
    path: '/certificate/bulk',
    options: {
      payload: {
        output: 'file',
        multipart: true,
      },
      description:
        'generate certificate in bulk by uploading the spreadsheet of students data with pathway_code',
      notes: 'file-upload',
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        // scope: getRouteScope(['admin']),
      },
      plugins: {
        'hapi-swagger': {
          payloadType: 'form',
        },
      },
      validate: {
        payload: Joi.object({
          file: Joi.any().meta({ swaggerType: 'file' }).description('file'),
          pathway_code: Joi.string().required(),
        }),
      },
    },
    handler: async (request, h) => {
      const { generateCertificateService, teacherService, userService } = request.services();
      const { PathwayCompletionV2 } = request.models();
      const scrach_code = "scrthb"
      const certificate_data = {
        Course: 'Python Programming',
        weekDuration: '14 Weeks',
        Year: '2022',

      };
      const {file} = request.payload;
      const pathway_code = 'scrthb';
      const filePath = file.path;
      const typeOfFile = file.filename.split('.');

      if (typeOfFile[1] !== 'xlsx') {
        return h.response({
          message: 'You are trying to upload the wrong format file. Only .xlsx files are allowed.',
        }).code(403);
      }
      if (request.payload.pathway_code.toLowerCase() !== scrach_code) {
        return h.response({
          message: 'Only scratch pathway is allowed to generate certificate in bulk',
        }).code(403);
      }
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const All_Data = [];
      for (let i = 1; i < data.length; i++) {
        const resp = {
          email: data[i][0],
          name: data[i][1],
          user_id: null,
          error: false,
          message: null,
        }
        if(data[i][0] === undefined || data[i][0] === null || data[i][0] === ''){
          continue;
        }
        const [err, user_data] = await userService.getUserByEmail(data[i][0]);
        if (user_data != undefined && user_data != null && user_data.length > 0) {
          resp.user_id = parseInt(user_data[0].id);
          const user_id = user_data[0].id;
          const pathway_id_scratch = 6;
          const pathway_complations = await PathwayCompletionV2.query().where({ user_id }).andWhere('pathway_id', pathway_id_scratch);
          let percentage = 0;
          if (pathway_complations.length > 0) {
            if (pathway_complations[0].percentage === 100) {
              percentage = 100;
            }
          }
          const scrach_code = 'scrthb';
          if (pathway_code.toLowerCase() == scrach_code) {
            const certificate_value = {
              'id': user_id,
              'Name': data[i][1],
              'Course': certificate_data.Course,
              'weekDuration': certificate_data.weekDuration,
              'Year': certificate_data.Year,
              'pathway_code': pathway_code,
              'teacher_name': null,
              'school_name': null,
              'user_id': user_id,
            }
            if (percentage === 100) {
              const [err, certificate] = await generateCertificateService.generateCertificate(certificate_value);
              if (err) {
                resp.error = true;
                resp.message = err.message;
                All_Data.push(resp);
              }
              resp.url = certificate;

              All_Data.push(resp);
            } else {
              resp.error = true;
              resp.message = 'this student has not completed the pathway';
              All_Data.push(resp);
            }
          }
        } else {
          resp.email = data[i][0];
          resp.name = null;
          resp.error = true;
          resp.message = 'this email is not registered';
          All_Data.push(resp)
        }
      }
      // Extract column names from the first object in the JSON data
      const columns = Object.keys(All_Data[0]);

      // Convert JSON data to CSV format
      const csvContent = [columns.join(',')].concat(All_Data.map(item => columns.map(col => item[col]).join(','))).join('\n');

      // Set response headers for direct download
      const response = h.response(csvContent);
      response.type('text/csv');
      response.header('Content-Disposition', 'attachment; filename=Certificates.csv');

      return response;
    },
  },
];