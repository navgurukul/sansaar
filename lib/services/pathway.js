const Schmervice = require('schmervice');
const _ = require('lodash');
const Boom = require('@hapi/boom');
const { transaction } = require('objection');

const { errorHandler } = require('../errorHandling');

module.exports = class PathwayService extends Schmervice.Service {
  async create(pathwayInfo, txn) {
    const { Pathways } = this.server.models();
    let newPathway;
    try {
      newPathway = await Pathways.query(txn).insert(pathwayInfo);
      return [null, newPathway];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async find(txn) {
    const { Pathways } = this.server.models();
    let pathway;
    try {
      pathway = await Pathways.query(txn);
      return [null, pathway];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findById(id, txn) {
    const { Pathways } = this.server.models();
    let pathway;
    try {
      pathway = await Pathways.query(txn).throwIfNotFound().findById(id);
      return [null, pathway];
    } catch (err) {
      const error = errorHandler(err);
      error.message = 'Pathway Not Found';
      return [error, null];
    }
  }

  async deleteById(id) {
    const { Pathways } = this.server.models();
    let deleted;

    try {
      deleted = await Pathways.query().delete().throwIfNotFound().where('id', id);
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
    const { Pathways } = this.server.models();
    const pathway = await Pathways.query(txn).findOne({ code });
    return pathway;
  }

  async update(id, info, txn) {
    const { Pathways } = this.server.models();
    if (info.tracking_enabled === false) {
      info.tracking_frequency = null;
      info.tracking_day_of_week = null;
      info.tracking_days_lock_before_cycle = null;
    }
    try {
      await Pathways.query(txn).update(info).where({ id });
      return [null, id];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async upsertMilestone(pathwayId, milestoneInfo, txn) {
    const { PathwayMilestones } = this.server.models();

    const addMilestoneAndUpdatePositions = async (tranx) => {
      const allMilestones = await PathwayMilestones.query(tranx).where({ pathway_id: pathwayId });

      const maxPosition = _.isEmpty(allMilestones)
        ? 0
        : _.max(allMilestones, (m) => m.position).position;
      if (_.isEmpty(allMilestones) && maxPosition === 0 && milestoneInfo.position !== 0) {
        throw Boom.badRequest('First milestone being created. Position should be 0 (zero).');
      } else if (milestoneInfo.position > maxPosition + 1) {
        throw Boom.badRequest(
          `Position of the last milestone is ${maxPosition}. Max position can be ${
            maxPosition + 1
          }.`
        );
      }

      if (milestoneInfo.id) {
        const milestoneToEdit = _.findWhere(allMilestones, { id: milestoneInfo.id });
        if (milestoneToEdit.position === 0 && milestoneInfo.position !== 0) {
          throw Boom.badRequest('Position of 0th milestone cannot be changed.');
        }
      }

      _.forEach(allMilestones, (milestone, i) => {
        if (milestone.position >= milestoneInfo.position) {
          allMilestones[i].position += 1;
        }
        if (milestoneInfo.id && milestone.id === milestoneInfo.id) {
          _.forEach(milestoneInfo, (value, key) => {
            allMilestones[i][key] = value;
          });
        }
      });
      if (!milestoneInfo.id) {
        allMilestones.push({ ...milestoneInfo, pathway_id: pathwayId });
      }

      // await PathwayMilestones.query(tranx).upsertGraph(allMilestones);
      // const milestone = await PathwayMilestones.query(tranx).where({
      //   pathway_id: pathwayId,
      //   position: milestoneInfo.position,
      // });
      // return milestone;

      let milestone;
      try {
        milestone = await PathwayMilestones.query(tranx).where({
          pathway_id: pathwayId,
          position: milestoneInfo.position,
        });
        return [null, milestone];
      } catch (err) {
        return [errorHandler(err), null];
      }
    };

    let milestone;
    if (!txn) {
      const tranx = await PathwayMilestones.startTransaction();
      try {
        milestone = await addMilestoneAndUpdatePositions(txn);
        await tranx.commit();
        return [null, milestone];
      } catch (err) {
        return [errorHandler(err), null];
      }
    } else {
      try {
        milestone = await addMilestoneAndUpdatePositions(txn);
        return [null, milestone];
      } catch (err) {
        return [errorHandler(err), null];
      }
    }
  }

  async findMilestones(pathwayId, txn) {
    const { PathwayMilestones } = this.server.models();
    let milestones;
    try {
      milestones = await PathwayMilestones.query(txn)
        .where({ pathway_id: pathwayId })
        .orderBy('position');
      return [null, milestones];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findMilestoneById(id, txn) {
    const { PathwayMilestones } = this.server.models();
    let pathwayByMilestone;
    try {
      pathwayByMilestone = await PathwayMilestones.query(txn).throwIfNotFound().findById(id);
      return [null, pathwayByMilestone];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getDefaultPathway() {
    const { Pathways } = this.server.models();
    let defaultPathway;
    try {
      defaultPathway = await Pathways.query().first();
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
    const { Pathways } = this.server.models();
    const pathwayCourses = await Pathways.query().findById(pathwayId);
    if (pathwayCourses) {
      return pathwayCourses;
    }
    throw Boom.badRequest(`Pathway for Pathway Id : ${pathwayId} does not exist`);
  }

  async upsertPathwayCourses(pathwayId, courseIds, txn) {
    const { PathwayCourses } = this.server.models();
    const courseList = [];
    const uniqueCourseIds = _.uniq(courseIds);
    _.map(uniqueCourseIds, (courseId) => {
      return courseList.push({
        course_id: courseId,
        pathway_id: pathwayId,
        created_at: new Date(),
      });
    });

    let insertedCourses;
    try {
      const updatedPathwayCourses = await transaction(
        PathwayCourses,
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
    const { PathwayCompletion } = this.server.models();
    const completedPathway = { user_id: userId, pathway_id: pathwayId };

    try {
      await PathwayCompletion.query().insert(completedPathway);
      return [null, { success: true }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async removePathwayComplete(userId, pathwayId) {
    const { PathwayCompletion } = this.server.models();

    try {
      await PathwayCompletion.query()
        .del()
        .throwIfNotFound()
        .where('user_id', userId)
        .andWhere('pathway_id', pathwayId);
      return [null, { success: true }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getPathwayComplete(userId) {
    const { PathwayCompletion } = this.server.models();

    let completedPathways;
    try {
      completedPathways = PathwayCompletion.query().where('user_id', userId);
      return [null, completedPathways];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
