const Schmervice = require('schmervice');
const _ = require('lodash');
const fs = require('fs-extra');
const glob = require('glob');
const { errorHandler } = require('../errorHandling');

const allProperties = {};
glob('**/PROPERTIES_FILES/**/*.json', (err, propertiesFiles) => {
  if (!err) {
    _.map(propertiesFiles, (fileName) => {
      allProperties[fileName] = JSON.parse(fs.readFileSync(`${fileName}`));
    });
  }
});
module.exports = class courseRenderer extends Schmervice.Service {
  async getCourseExercise(course_id, txn) {
    const lang = 'hi';
    const { Courses } = this.server.models();

    let courseExercises;
    try {
      courseExercises = await Courses.query()
        .where('courses.id', course_id)
        .throwIfNotFound()
        .withGraphJoined('exercises')
        .modify((builder) => {
          builder.orderBy('exercises.sequence_num');
        });
      const { exercises, ...parsedData } = courseExercises;
      const newExercises = [];

      courseExercises[0].exercises.forEach((ele) => {
        const { content, ...newEle } = ele;
        try {
          newEle.content = JSON.parse(ele.content);
        } catch {
          newEle.content = ele.content;
        }
        newExercises.push(newEle);
      });
      parsedData.exercises = newExercises;

      const course = await Courses.query(txn).where({
        id: course_id,
      });

      const courseName = course[0].name;
      _.map(newExercises, (exercise) => {
        let keys = exercise.content[0].value;
        let modifiedFile = exercise.slug.split('/');
        if (modifiedFile.length > 1) {
          modifiedFile = `${modifiedFile[0].split('__')[1]}/${courseName}_${
            modifiedFile[1]
          }_${lang}`;
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
        // console.log(allProperties[finalPropertiesFiles[0]], 'finalPropertiesFiles\n\n');
        _.map(Object.keys(allProperties[finalPropertiesFiles[0]]), (keyAndValue) => {
          const [key, value] = [keyAndValue, allProperties[finalPropertiesFiles[0]][keyAndValue]];
          if (key !== '') {
            keys = keys.replace(key, value);
          }
        });
        exercise.content[0].value = keys;
      });

      return [null, parsedData];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
