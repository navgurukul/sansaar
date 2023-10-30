const Joi = require('@hapi/joi');
const glob = require('glob');
const _ = require('lodash');
const { Model } = require('objection');
const ModelBase = require('./helpers/ModelBase');

const courseLangMap = {};

// Reads all properties files and create an object mapping of course to langauges in which content is available
const propFiles = glob.sync('**/PROPERTIES_FILES/**/*.json');
if (propFiles.length > 0) {
  _.map(propFiles, (fileName) => {
    // Extract the name of the course
    const name = fileName.split('/').pop().split('_')[0];
    const courseType =
      _.intersectionWith(fileName.split('/').pop().split('_'), ['json'], _.isEqual).length > 0
        ? fileName.split('/').pop().split('_')[1]
        : null;
    // Extract the language
    const lang = fileName.split('/').pop().split('_').pop().split('.')[0];
    // Create a key of course
    if (!courseLangMap[`${name}_${courseType}`]) {
      courseLangMap[`${name}_${courseType}`] = [];
      courseLangMap[`${name}_${courseType}`].push(lang);
    }
    // Push languages for each course
    if (courseLangMap[`${name}_${courseType}`].indexOf(lang) < 0) {
      courseLangMap[`${name}_${courseType}`].push(lang);
    }
  });
}

module.exports = class Courses extends ModelBase {
  static get tableName() {
    return 'main.courses';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      type: Joi.string().required(),
      name: Joi.string().required(),
      logo: Joi.string().required(),
      short_description: Joi.string().required(),
      course_type: Joi.string().allow(null),
    });
  }

  static afterFind({ result }) {
    _.map(result, (c) => {
      _.map(Object.keys(courseLangMap), (courseLang) => {
        if (
          courseLang.split('_')[0] === c.name &&
          courseLang.split('_')[1] === String(c.course_type)
        ) {
          c.lang_available = courseLangMap[courseLang];
        }
      });
      if (!c.lang_available) {
        c.lang_available = ['en'];
      }
    });
    return result;
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const Exercises = require('./exercise');
    return {
      exercises: {
        relation: Model.HasManyRelation,
        modelClass: Exercises,
        // filter: (query) => query.select('id', 'name', 'slug'),
        join: {
          from: 'main.courses.id',
          to: 'main.exercises.course_id',
        },
      },
    };
  }
};
