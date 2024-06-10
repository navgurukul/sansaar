/* eslint-disable prettier/prettier */
const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
// eslint-disable-next-line
const PizZip = require('pizzip');
// eslint-disable-next-line
const Docxtemplater = require('docxtemplater');
// eslint-disable-next-line
const libre = require('libreoffice-convert');

const AWS = require('aws-sdk');

// eslint-disable-next-line
const { v4: uuidv4 } = require('uuid');
const CONSTANTS = require('../config/index');
const { errorHandler } = require('../errorHandling');
libre.convertAsync = require('util').promisify(libre.convert);

async function convertHelper(document) {
  // eslint-disable-next-line
  return await libre.convertAsync(document, '.pdf', undefined);
}
const S3Bucket = new AWS.S3({
  accessKeyId: CONSTANTS.auth.merakiCertificate.s3SecretKeyId,
  secretAccessKey: CONSTANTS.auth.merakiCertificate.s3SecretAccessKey,
  Bucket: CONSTANTS.auth.merakiCertificate.s3Bucket,
});
module.exports = class GenerateCertificateService extends Schmervice.Service {
  /*eslint-disable*/
  async generateCertificate(certificate_value) {
    const { Certificate } = this.server.models();
    try {
      let {user_id, Name, Course, weekDuration, Year, pathway_code, teacher_name, school_name} = certificate_value
      let rows
      let content 
      // codes of pathways to generate certificate
      const python_code = "prgpyt"
      const tcb_code = "tcbpi"
      const scrach_code = "scrthb"
      if (pathway_code.toLowerCase() == python_code) {
        rows = {
          Name: Name,
          Course: Course,
          weekDuration: weekDuration,
          Year: Year
        };
        content = fs.readFileSync(
          path.resolve(__dirname, '../../lib/helpers/assets/Meraki certificate - Introduction to Python_world.docx'),
          'binary'
        );
      }
      else if (pathway_code.toLowerCase() == tcb_code) {
        if(!Name){
          return[ {
            status: 404,
            message: 'Name should not be empty. Update your name in profile section',
          },null]
        }
        rows = {
          Name: Name,
          Course: Course,
          weekDuration: weekDuration,
          Year: Year,
          TeacherName: teacher_name,
          School: school_name,
        };
        content = fs.readFileSync(
          path.resolve(__dirname, '../../lib/helpers/assets/teacher capacity building certificate.docx'),
          'binary'
        );
      }
      else if (pathway_code.toLowerCase() == scrach_code) {
        rows = {
        Name: Name,
        };
        content = fs.readFileSync(
        path.resolve(__dirname, '../../lib/helpers/assets/Meraki certificate - Introduction to Scratch_world.docx'),
        'binary'
        );
        }
      else {
        return[ {
          status: 404,
          message: 'Certificate not allowed for this pathway'
        },null]
      }
      
      var zip = new PizZip(content);
      var doc = new Docxtemplater();
      doc.loadZip(zip);
      doc.setOptions({ linebreaks: true });
      doc.setData(rows);
      try {
        // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
        await doc.render();
      } catch (error) {
        var e = {
          message: error.message,
          name: error.name,
          stack: error.stack,
          properties: error.properties,
        };
        // The error thrown here contains additional information when logged with JSON.stringify (it contains a property object).
        return [e, null];
      }
      
      var buf = await doc.getZip().generate({ type: 'nodebuffer' });
      
      const arrayBuffer = await convertHelper(new Uint8Array(buf), 'exportPDF');
      let filePath
      if (pathway_code.toLowerCase() == python_code) {
        filePath = path.resolve(
          __dirname,
          '../../lib/helpers/assets/pdf/' + rows.Name + ' ' + rows.Course + '.pdf'
        );
      }else if (pathway_code.toLowerCase() == tcb_code) {
        filePath = path.resolve(
          __dirname,
          '../../lib/helpers/assets/pdf/' + rows.TeacherName + ' ' + rows.School + '.pdf'
        );

      }else if(pathway_code.toLowerCase() == scrach_code){
        filePath = path.resolve(
        __dirname,
        '../../lib/helpers/assets/pdf/' + rows.Name + ' ' + rows + '.pdf'
        );
        }
      else {
        return[ {
          status: 404,
          message: 'Certificate not allowed for this pathway'
        },null]
      }
      var fileData = new Uint8Array(arrayBuffer);
      const key = `${'MerakiCertificate'}/${uuidv4()}-${'.pdf'}`;
      const read = await Certificate.query().where({ user_id }).andWhere('pathway_code', pathway_code);
      if (read.length === 1) {
        return [null, read[0].url];
      }
      // if (pathway_code.toLowerCase() == python_code) {
      fs.writeFileSync(filePath, fileData);
      // read certificate from /lib/helpers/assets/pdf
      fileData = fs.readFileSync(filePath);

      try {
        // create certificate
      // upload certificate on S3
        await S3Bucket.putObject({
          Bucket: CONSTANTS.auth.merakiCertificate.s3Bucket,
          Key: key,
          Body: fileData,
          ContentType: 'application/pdf',
        }).promise();
      } catch (err) {
        return [{
          error: true,
          message: err.message,
          data: {},
          code: 422,
        }, null];
      }
      const URL = `${CONSTANTS.auth.merakiCertificate.s3BaseUrl}/${key}`;
      try {
        await Certificate.query().insert({ user_id, url: URL, register_at: Date.now().toString(), pathway_code: pathway_code });
      } catch (error) {
        return [errorHandler(error), null];
      }
        fs.unlinkSync(filePath);
      return [null, URL];

    } catch (error) {
      return [errorHandler(error), null];
    }
  }
};
