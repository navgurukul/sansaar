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
  async getCourseExercise(course_id, userLang, txn) {
    // const lang = 'hi';
    const lang = userLang;

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
      const { exercises, ...parsedData } = courseExercises[0];
      // console.log(exercises, 'exercises\n\n');
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
        let modifiedFile = exercise.slug.split('/');
        // console.log(modifiedFile, 'modifiedFile\n\n');
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
        let keys = exercise.content;
        let keysArr = [];
        _.map(keys, (obj, index) => {
          const parsedObj1 = JSON.parse(obj);
          keysArr.push(parsedObj1);
        });
        // console.log(Object.keys(allProperties[finalPropertiesFiles[0]]), 'hello\n\n');
        _.map(Object.keys(allProperties[finalPropertiesFiles[0]]), (exerKey) => {
          console.log(exerKey, 'exerKey\n\n');
          const [key, value] = [exerKey, allProperties[finalPropertiesFiles[0]][exerKey]];
          _.map(keysArr, (contentValue, index) => {
            if (contentValue.type === 'markdown') {
              if (key !== '') {
                contentValue.value = contentValue.value.replace(key, value);
              }
            }
          });
        });
        exercise.content = keysArr;
      });
      return [null, parsedData];
    } catch (err) {
      console.log(err, 'err\n\n');
      return [errorHandler(err), null];
    }
  }
};
