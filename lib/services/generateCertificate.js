const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
// const { configs } = require("./config.js");
const docx = require('@nativedocuments/docx-wasm');
// const fName = require('../helpers/assets/')

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const { errorHandler } = require('../errorHandling');
const CONSTANTS = require('../config/index');

configs = {
  ND_DEV_ID: '1EPOVRA793QAGEEHIORHGV2HSB', // goto https://developers.nativedocuments.com/ to get a dev-id/dev-secret
  ND_DEV_SECRET: '538GOHL5TRM2E2DJMN7NC5CCR1', // you can also set the credentials in the enviroment variables
};

docx
  .init({
    ND_DEV_ID: configs['ND_DEV_ID'], // goto https://developers.nativedocuments.com/ to get a dev-id/dev-secret
    ND_DEV_SECRET: configs['ND_DEV_SECRET'], // you can also set the credentials in the enviroment variables
    ENVIRONMENT: 'NODE', // required
    LAZY_INIT: true, // if set to false the WASM engine will be initialized right now, usefull pre-caching (like e.g. for AWS lambda)
  })
  .then(() => {
    console.log(docx, 'uper wala docs\n');
  })
  .catch(function (e) {
    console.error(e);
  });

async function convertHelper(document, exportFct) {
  const api = await docx.engine();

  await api.load(document);
  const arrayBuffer = await api[exportFct]();
  await api.close();
  return arrayBuffer;
}

module.exports = class GenerateCertificateService extends Schmervice.Service {
  async generateCertificate(data) {
    var rows = {
      Name: 'Priya',
      Course: 'Python Programming',
      weekDuration: '14 Weeks',
      Year: 2022,
    };

    var fName = '../../lib/helpers/assets/meraki certificate.docx';
    var content = fs.readFileSync(path.resolve(__dirname, fName), 'binary');
    // console.log(content, 'content...service\n\n');
    var zip = new PizZip(content);
    var doc = new Docxtemplater();
    doc.loadZip(zip);
    doc.setOptions({ linebreaks: true });
    doc.setData(rows);

    try {
      console.log(rows);
      // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
      await doc.render();
    } catch (error) {
      var e = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        properties: error.properties,
      };
      console.log(JSON.stringify({ error: e }));
      // The error thrown here contains additional information when logged with JSON.stringify (it contains a property object).
      return [err, null];
    }

    var buf = await doc.getZip().generate({ type: 'nodebuffer' });

    const arrayBuffer = await convertHelper(new Uint8Array(buf), 'exportPDF');

    const filePath = path.resolve(__dirname, 'pdf/' + rows.Name + ' ' + rows.Course + '.pdf');
    var fileData = new Uint8Array(arrayBuffer);
    fs.writeFileSync(filePath, fileData);

    fileData = fs.readFileSync(filePath);
    console.log(fileData, 'fileData');
    // upload certificate on S3
    const S3Bucket = new AWS.S3({
      accessKeyId: 'AKIAINRR62CA7FXNW7AQ',
      secretAccessKey: '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',
      Bucket: 'chanakya-dev',
    });
    const key = `${'MerakiCertificate'}/${uuidv4()}-${'.pdf'}`;
    try {
      await S3Bucket.putObject({
        Bucket: 'chanakya-dev',
        Key: key,
        Body: fileData,
        ContentType: 'application/pdf',
      }).promise();
    } catch (err) {
      return [err, null];
    }
    console.log(`${'S3Key'}/${key}`, 'hello url...\n\n');
    return [null, `${'S3Key'}/${key}`];
  }
};
