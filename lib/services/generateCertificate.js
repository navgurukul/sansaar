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
  async generateCertificate(user_id, Name, Course, weekDuration, Year, pathway_code, teacher_name, school_name) {
    try {
      const rows = {
        Name: Name,
        Course: Course,
        weekDuration: weekDuration,
        Year: Year,
        TeacherName: teacher_name,
        School: school_name,
      };
      // codes of pathways to generate certificate
      const python_code = "prgpyt"
      const tcb_code = "tcbpi"
      if (pathway_code.toLowerCase() == python_code) {
        var content = fs.readFileSync(
          path.resolve(__dirname, '../../lib/helpers/assets/meraki certificate.docx'),
          'binary'
        );
      }
      else if (pathway_code.toLowerCase() == tcb_code) {
        var content = fs.readFileSync(
          path.resolve(__dirname, '../../lib/helpers/assets/teacher capacity building certificate.docx'),
          'binary'
        );
      }
      else {
        return[ {
          status: 404,
          message: 'Certificate not allowed for this pathway'
        }]
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
        return [err, null];
      }

      var buf = await doc.getZip().generate({ type: 'nodebuffer' });

      const arrayBuffer = await convertHelper(new Uint8Array(buf), 'exportPDF');

      const filePath = path.resolve(
        __dirname,
        '../../lib/helpers/assets/pdf/' + rows.Name + ' ' + rows.Course + '.pdf'
      );


      const filePath1 = path.resolve(
        __dirname,
        '../../lib/helpers/assets/pdf/' + rows.TeacherName + ' ' + rows.School + '.pdf'
      );


      var fileData = new Uint8Array(arrayBuffer);
      // create certificate
      // upload certificate on S3
      const key = `${'MerakiCertificate'}/${uuidv4()}-${'.pdf'}`;
      const { Certificate } = this.server.models();
      const read = await Certificate.query().where({ user_id }).andWhere('pathway_code', pathway_code);
      if (read.length === 1) {
        return [null, read[0].url];
      }
      if (pathway_code.toLowerCase() == python_code) {
        fs.writeFileSync(filePath, fileData);
        // read certificate from /lib/helpers/assets/pdf
        fileData = fs.readFileSync(filePath);
      }
      else if (pathway_code.toLowerCase() == tcb_code) {
        fs.writeFileSync(filePath1, fileData);
        // read certificate from /lib/helpers/assets/pdf
        fileData = fs.readFileSync(filePath1);
      }

      try {
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
      // console.log(`${CONSTANTS.auth.merakiCertificate.s3BaseUrl}/${key}`, 'hello url...\n\n');
      const URL = `${CONSTANTS.auth.merakiCertificate.s3BaseUrl}/${key}`;
      try {
        await Certificate.query().insert({ user_id, url: URL, register_at: Date.now().toString(), pathway_code: pathway_code });
      } catch (error) {
        return [errorHandler(error), null];
      }
      // delete pdf from assests
      if (pathway_code.toLowerCase() == python_code) {
        fs.unlinkSync(filePath);
      }
      else if (pathway_code.toLowerCase() == tcb_code) {
        fs.unlinkSync(filePath1);
      }
      return [null, URL];

    } catch (error) {
      return error
    }
  }
};
