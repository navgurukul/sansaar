const Joi = require('@hapi/joi');
const { Model } = require('objection');

const ModelBase = require('./helpers/ModelBase');

module.exports = class CourseCompletionV2 extends ModelBase {
  static get tableName() {
    return 'main.course_completion_v2';
  }

  static get joiSchema() {
    return Joi.object({
      id: Joi.number().integer().greater(0),
      user_id: Joi.number().integer().required().greater(0),
      course_id: Joi.number().integer().required().greater(0),
      complete_at: Joi.date()
    });
  }

  async $afterInsert(queryContext) {
    // eslint-disable-next-line
    const { checkPathwayCompletionEligibility, insertIntoPathway } = require('../dbTriggers');
    const { transaction, user_id, course_id } = queryContext;
    this.checkAll = await checkPathwayCompletionEligibility(transaction, user_id, course_id, 'V2');
    if (this.checkAll.status) {
      this.checkAll.pathwayId.forEach(async (pathwayId) => {
        await insertIntoPathway(transaction, user_id, pathwayId, 'V2');
      });
    }
  }

  async $afterDelete(queryContext) {
    // eslint-disable-next-line global-require
    const { checkPathwayCompletionEligibility, deleteFromPathway } = require('../dbTriggers');
    const { transaction, user_id, course_id } = queryContext;
    this.checkAll = await checkPathwayCompletionEligibility(transaction, user_id, course_id, 'V2');
    if (!this.checkAll.status) {
      this.checkAll.pathwayId.forEach(async (pathwayId) => {
        await deleteFromPathway(transaction, user_id, pathwayId, 'V2');
      });
    }
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const PathwayCoursesV2 = require('./pathwayCoursesV2');
    return {
      pathwayCoursesV2: {
        relation: Model.HasManyRelation,
        modelClass: PathwayCoursesV2,
        filter: (query) => query.select('course_id', 'id', 'pathway_id'),
        join: {
          from: 'main.course_completion_v2.course_id',
          to: 'main.pathway_courses_v2.course_id',
        },
      },
    };
  }
};
