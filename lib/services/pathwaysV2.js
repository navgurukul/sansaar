const Schmervice = require('schmervice');
const _ = require('lodash');
const Boom = require('@hapi/boom');
const { transaction } = require('objection');
const { UTCToISTConverter } = require('../helpers/index');
const { errorHandler } = require('../errorHandling');

module.exports = class PathwayServiceV2 extends Schmervice.Service {
  async create(pathwayInfo, txn) {
    const { PathwaysV2 } = this.server.models();
    let newPathway;
    try {
      newPathway = await PathwaysV2.query(txn).insert(pathwayInfo);
      return [null, newPathway];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async find(txn) {
    const { PathwaysV2 } = this.server.models();
    let pathway;
    try {
      pathway = await PathwaysV2.query(txn);
      return [null, pathway];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findById(id, txn) {
    const { PathwaysV2 } = this.server.models();
    let pathway;
    try {
      pathway = await PathwaysV2.query(txn).throwIfNotFound().findById(id);
      return [null, pathway];
    } catch (err) {
      const error = errorHandler(err);
      return [error, null];
    }
  }

  async findPathwayById(id, txn) {
    const { PathwaysV2 } = this.server.models();
    let pathway;
    try {
      pathway = await PathwaysV2.query(txn).findById(id);
      return pathway;
    } catch (err) {
      const error = errorHandler(err);
      error.message = 'Pathway Not Found';
      return [error, null];
    }
  }

  async deleteById(id) {
    const { PathwaysV2 } = this.server.models();
    let deleted;

    try {
      deleted = await PathwaysV2.query().delete().throwIfNotFound().where('id', id);
      let successfullyDeleted;
      if (deleted) {
        successfullyDeleted = { success: true };
      }
      return [null, successfullyDeleted];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findByCode(code, txn) {
    const { PathwaysV2 } = this.server.models();
    const pathway = await PathwaysV2.query(txn).findOne({ code });
    return pathway;
  }

  async update(id, info, txn) {
    const { PathwaysV2 } = this.server.models();
    try {
      await PathwaysV2.query(txn).patch(info).where({ id });
      return [null, id];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getDefaultPathway() {
    const { PathwaysV2 } = this.server.models();
    let defaultPathway;
    try {
      defaultPathway = await PathwaysV2.query().first();
      if (defaultPathway) {
        return [null, defaultPathway];
      }
      return [
        {
          error: true,
          message: 'DefaultPathwayNotDefined',
          type: 'FailedDependency',
          data: {},
          code: 424,
        },
        null,
      ];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findCoursesByPathwayId(pathwayId) {
    const { PathwaysV2 } = this.server.models();
    const pathwayCourses = await PathwaysV2.query().findById(pathwayId);
    if (pathwayCourses) {
      return pathwayCourses;
    }
    throw Boom.badRequest(`Pathway for Pathway Id : ${pathwayId} does not exist`);
  }

  async upsertPathwayCourses(pathwayId, courseIds, txn) {
    const { PathwayCoursesV2 } = this.server.models();
    const courseList = [];
    const uniqueCourseIds = _.uniq(courseIds);
    _.map(uniqueCourseIds, (courseId) => {
      return courseList.push({
        course_id: courseId,
        pathway_id: pathwayId,
      });
    });

    let insertedCourses;
    try {
      const updatedPathwayCourses = await transaction(
        PathwayCoursesV2,
        async (PathwayCoursesModel) => {
          try {
            await PathwayCoursesModel.query(txn).delete().where('pathway_id', pathwayId);
          } catch (err) {
            return errorHandler(err);
          }
          insertedCourses = await PathwayCoursesModel.query(txn).insert(courseList);
          return insertedCourses;
        }
      );
      return [null, updatedPathwayCourses];
    } catch (err) {
      return [errorHandler(err), null];
    }

    // await PathwayCourses.query(txn).delete().where('pathway_id', pathwayId);
    // let insertedCourses;
    // try {
    //   insertedCourses = await PathwayCourses.query(txn).insert(courseList);
    //   return [null, insertedCourses];
    // } catch (err) {
    //   return [errorHandler(err), null];
    // }
  }

  async markPathwayComplete(userId, pathwayId) {
    const { PathwayCompletionV2 } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    const completedPathway = { user_id: userId, pathway_id: pathwayId, complete_at: dateIST};

    try {
      await PathwayCompletionV2.query().insert(completedPathway);
      return [null, { success: true }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async removePathwayComplete(userId, pathwayId) {
    const { PathwayCompletionV2 } = this.server.models();

    try {
      await PathwayCompletionV2.query()
        .del()
        .throwIfNotFound()
        .where('user_id', userId)
        .andWhere('pathway_id', pathwayId);
      return [null, { success: true }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getPathwayComplete(userId,pathway_id) {
    const { PathwayCompletionV2 } = this.server.models();

    let completedPathways;
    try {
      if(pathway_id){
        completedPathways = await PathwayCompletionV2.query().where('user_id', userId).andWhere('pathway_id',pathway_id);
        return [null, completedPathways]
      }
      completedPathways = PathwayCompletionV2.query().where('user_id', userId);
      return [null, completedPathways];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findPathwaysOngoingTopic(userId, pathwayId) {
    const { PathwaysOngoingTopic } = this.server.models();
    try {
      const pathwaytopic = await PathwaysOngoingTopic.query()
        .where('user_id', userId)
        .andWhere('pathway_id', pathwayId);
      return [null, pathwaytopic];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async insertPathwayCourses(pathwayId, courseIds, txn) {
    const { PathwayCoursesV2 } = this.server.models();
    let insertedCourses;
    try {
      const uniqueCourseIds = _.uniq(courseIds);
      // eslint-disable-next-line
      for (let courseID in uniqueCourseIds) {
        // eslint-disable-next-line
        const courses = await PathwayCoursesV2.query()
          .where('course_id', uniqueCourseIds[courseID])
          .andWhere('pathway_id', pathwayId);
        if (courses.length <= 0 || courses === null || courses === undefined) {
          // eslint-disable-next-line
          insertedCourses = await PathwayCoursesV2.query(txn).insert({
            course_id: uniqueCourseIds[courseID],
            pathway_id: pathwayId,
          });
        }
      }
      return [null, insertedCourses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
