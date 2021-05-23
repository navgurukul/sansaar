const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
var glob = require('glob');
const { errorHandler } = require('../errorHandling');
const allProperties = {};
// const propertiesDir = path.resolve('curriculum/properties');

glob('**/*.properties', function (er, propertiesFiles) {
  // allProperties = files;
  _.map(propertiesFiles, (fileName) => {
    allProperties[fileName] = fs.readFileSync(`${fileName}`).toString().split('\n');
  });
  console.log(propertiesFiles, 'propertiesFilessss\n\n\n', allProperties, 'allppppproperties\n\n');
});

// const propertiesFiles = fs.readdirSync(propertiesDir);

// _.map(propertiesFiles, (fileName) => {
//   allProperties[fileName] = fs.readFileSync(`${propertiesDir}/${fileName}`).toString().split('\n');
// });

console.log(allProperties, 'allProperties\n\n');

module.exports = class courseRenderer extends Schmervice.Service {
  async getCourseExercise(lang, txn) {
    const { Courses } = this.server.models();
    const { Exercises } = this.server.models();
    // const propertiesDir = path.resolve('curriculum/properties');
    // const propertiesFiles = await fs.readdirSync(propertiesDir);

    const exerciseData = await Exercises.query(txn).where({
      course_id: 110,
    });
    // console.log(exerciseData, 'exerciseData\n\n');

    // const exerciseData = await Exercises.query(txn).where({
    //   github_link:
    //     'https://github.com/navgurukul/newton/tree/master/multi-demo/modified/advanced-python_function-introduction.md',
    // });

    // const keys = JSON.parse(exerciseData[0]['content'])[0].value;
    const clientreq = lang === 'hi' ? 'hi.properties' : 'en.properties';
    // const keys = JSON.parse(exerciseData[0]['content']);

    // const langFilter = propertiesFiles.filter((x) => x.includes(clientreq));
    // const parseProperties = allProperties[langFilter[0]];
    // console.log(parseProperties, 'parseProperties\n\n');

    // const parsePropertiesTitle = exerciseData[0]['name'];
    // const ngMetaStr = '```ngMeta\n' + parsePropertiesTitle + '\n```\n';
    // var finalKeys;
    // _.map(keys, (key, index) => {
    //   // console.log(key, 'key\n\n\n');
    //   if (index === 0) {
    //     finalKeys = ngMetaStr + key.value;
    //   } else if (key.type === 'python') {
    //     finalKeys = finalKeys + '\n```Python\n' + key.value.code + '\n```\n';
    //   } else {
    //     finalKeys = finalKeys + key.value;
    //   }
    // });

    _.map(exerciseData, (exercise) => {
      // console.log(exercise.slug.split('/'), 'ex\n');
      // console.log(exercise.github_link, 'ex\n');
      const modifiedFile = exercise.github_link.slice(49);
      console.log(modifiedFile, 'slicemodifiedFile\n\n');
      _.map(Object.keys(allProperties), (file) => {
        // console.log(file.includes(modifiedFile), 'file\n\n');
      });
      const any = _.filter(Object.keys(allProperties), (x) => x.includes(modifiedFile));
      console.log(any, 'any\n\n');
    });
    // console.log(finalKeys, 'finalKeys\n\n');
    _.map(parseProperties, (keyAndValue) => {
      // console.log(keyAndValue, 'keyAndValue\n\n');
      const [key, value] = keyAndValue.split('=');
      finalKeys = finalKeys.replace(key, value);
    });
    // console.log(finalKeys, 'finalKeys\n\n');

    return finalKeys;
  }
};
