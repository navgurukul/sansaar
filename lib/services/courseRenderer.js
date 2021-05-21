const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const { errorHandler } = require('../errorHandling');

const propertiesDir = path.resolve('curriculum/properties');

const propertiesFiles = fs.readdirSync(propertiesDir);

const allProperties = {};

_.map(propertiesFiles, (fileName) => {
  allProperties[fileName] = fs.readFileSync(`${propertiesDir}/${fileName}`).toString().split('\n');
});

console.log(allProperties, 'allProperties\n\n');

module.exports = class courseRenderer extends Schmervice.Service {
  async getCourseExercise(lang, txn) {
    const { Exercises } = this.server.models();
    // const propertiesDir = path.resolve('curriculum/properties');
    // const propertiesFiles = await fs.readdirSync(propertiesDir);

    const exerciseData = await Exercises.query(txn).where({
      slug: 'multi-demo__modified/variables_variables-naming-conventions',
    });

    const mdKeys = JSON.parse(exerciseData[0]['content'])[0].value;
    const clientreq = lang === 'hi' ? 'hi.properties' : 'en.properties';

    const langFilter = propertiesFiles.filter((x) => x.includes(clientreq));
    const parseProperties = allProperties[langFilter[0]];

    const parsePropertiesTitle = exerciseData[0]['name'];
    const ngMetaStr = '```ngMeta\n' + parsePropertiesTitle + '\n```\n';
    var finalKeys = ngMetaStr + mdKeys;
    // console.log(finalKeys, 'hey data\n\n');
    _.map(parseProperties, (keyAndValue) => {
      const [key, value] = keyAndValue.split('=');
      finalKeys = finalKeys.replace(key, value);
    });
    console.log(finalKeys, 'finalKeys\n\n');

    return finalKeys;
  }
};
