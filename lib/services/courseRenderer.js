const Schmervice = require('schmervice');
const _ = require('lodash');
const fs = require('fs-extra');
const glob = require('glob');

const allProperties = {};
glob('**/*.properties', (err, propertiesFiles) => {
  if (!err) {
    _.map(propertiesFiles, (fileName) => {
      allProperties[fileName] = fs.readFileSync(`${fileName}`).toString().split('\n');
    });
  }
});
module.exports = class courseRenderer extends Schmervice.Service {
  async getCourseExercise(lang, course_id, txn) {
    const { Courses } = this.server.models();
    const { Exercises } = this.server.models();

    const course = await Courses.query(txn).where({
      id: course_id,
    });

    const exerciseData = await Exercises.query(txn).where({
      // eslint-disable-next-line
      course_id: course_id,
    });

    const courseName = course[0].name;
    _.map(exerciseData, (exercise) => {
      // eslint-disable-next-line
      let keys = JSON.parse(exercise['content'])[0].value;
      let modifiedFile = exercise.slug.split('/');
      if (modifiedFile.length > 1) {
        modifiedFile = `${modifiedFile[0].split('__')[1]}/${courseName}_${modifiedFile[1]}_${lang}`;
      } else {
        modifiedFile = `${courseName}_${modifiedFile[0].split('__')[1]}_${lang}`;
      }
      let finalPropertiesFiles = _.filter(Object.keys(allProperties), (x) => {
        return x.includes(modifiedFile);
      });
      if (finalPropertiesFiles.length === 0) {
        modifiedFile = exercise.slug.split('/');
        if (modifiedFile.length > 1) {
          modifiedFile = `${modifiedFile[0].split('__')[1]}/${courseName}_${modifiedFile[1]}_en`;
        } else {
          modifiedFile = `${courseName}_${modifiedFile[0].split('__')[1]}_en`;
        }
        finalPropertiesFiles = _.filter(Object.keys(allProperties), (x) => {
          return x.includes(modifiedFile);
        });
      }
      // console.log(finalPropertiesFiles, 'finalPropertiesFiles\n\n');
      _.map(allProperties[finalPropertiesFiles[0]], (keyAndValue) => {
        const [key, value] = keyAndValue.split('=');
        if (key !== '') {
          keys = keys.replace(key, value);
        }
      });
      exercise.finalContent = keys;
    });

    return exerciseData;
  }
};
