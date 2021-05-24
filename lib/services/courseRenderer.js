const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
var glob = require('glob');
const { errorHandler } = require('../errorHandling');
const allProperties = {};
// const propertiesDir = path.resolve('curriculum/properties');

glob('**/*.properties', (err, propertiesFiles) => {
  // allProperties = files;
  if (!err) {
    _.map(propertiesFiles, (fileName) => {
      allProperties[fileName] = fs.readFileSync(`${fileName}`).toString().split('\n');
    });
    console.log(
      propertiesFiles,
      'propertiesFilessss\n\n\n',
      allProperties,
      'allppppproperties\n\n'
    );
  }
});

console.log(allProperties, 'allProperties\n\n');

module.exports = class courseRenderer extends Schmervice.Service {
  async getCourseExercise(lang, txn) {
    const { Courses } = this.server.models();
    const { Exercises } = this.server.models();
    const exerciseData = await Exercises.query(txn).where({
      course_id: 32,
    });

    // const courseName = 'DataTypes';
    const courseName = 'android';
    _.map(exerciseData, (exercise) => {
      let keys = JSON.parse(exercise['content'])[0].value;
      // console.log(exercise.slug.split('/'), 'ex\n');
      let modifiedFile = exercise.slug.split('/');
      console.log(modifiedFile, 'modifiedFile\n\n\n');
      if (modifiedFile.length > 1) {
        modifiedFile = `${modifiedFile[0].split('__')[1]}/${courseName}_${modifiedFile[1]}_${lang}`;
      } else {
        modifiedFile = `${courseName}_${modifiedFile[0].split('__')[1]}_${lang}`;
      }
      console.log(modifiedFile, 'modifiedFile\n\n');
      let finalPropertiesFiles = _.filter(Object.keys(allProperties), (x) => {
        // console.log(x, modifiedFile, 'aaa\n\n\n');
        return x.includes(modifiedFile);
      });
      if (finalPropertiesFiles.length == 0) {
        modifiedFile = exercise.slug.split('/');
        if (modifiedFile.length > 1) {
          modifiedFile = `${modifiedFile[0].split('__')[1]}/${courseName}_${modifiedFile[1]}_en`;
        } else {
          modifiedFile = `${courseName}_${modifiedFile[0].split('__')[1]}_en`;
        }
        finalPropertiesFiles = _.filter(Object.keys(allProperties), (x) => {
          // console.log(x, modifiedFile, 'aaa\n\n\n');
          return x.includes(modifiedFile);
        });
      }
      console.log(finalPropertiesFiles, 'finalPropertiesFiles\n\n');
      _.map(allProperties[finalPropertiesFiles[0]], (keyAndValue) => {
        // console.log(keyAndValue, 'keyAndValue\n\n');
        const [key, value] = keyAndValue.split('=');
        if (key !== '') {
          keys = keys.replace(key, value);
        }
        // console.log(keys, 'keys\n\n\n');
      });
      exercise['finalkeys'] = keys;
      // return exercise;
    });

    return exerciseData;
  }
};
