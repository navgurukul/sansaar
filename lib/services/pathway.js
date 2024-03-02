/* eslint-disable prettier/prettier */
const Schmervice = require('schmervice');
const _ = require('lodash');
const Boom = require('@hapi/boom');
const { transaction } = require('objection');
const Strapi = require('strapi-sdk-js');
const { UTCToISTConverter } = require('../helpers/index');
const { errorHandler } = require('../errorHandling');
const strapiToMerakiConverter = require('../helpers/strapiToMeraki');

const strapi = new Strapi({
  url: process.env.STRAPI_URL,
});

module.exports = class PathwayService extends Schmervice.Service {
  async addPathways(userId, pathwayIds, txn) {
    const { StudentPathways } = this.server.models();
    // const conflictingPathways = await StudentPathways.query(txn)
    //   .where({ user_id: userId })
    //   .whereIn('pathway_id', pathwayIds);
    // if (conflictingPathways.length > 0) {
    //   throw Boom.badRequest('Given user is already a part of one or more pathways given.');
    // }

    const pathways = pathwayIds.map((id) => ({ user_id: userId, pathway_id: id }));
    try {
      await StudentPathways.query(txn).insert(pathways);
      return [null, userId];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async removePathways(userId, pathwayIds, txn) {
    const { StudentPathways } = this.server.models();

    // if (pathwaysToDelete.length !== pathwayIds.length) {
    //   throw Boom.badRequest('User does not have membership of some pathways marked for removal.');
    // }

    try {
      const pathwaysToDelete = await StudentPathways.query(txn)
        .where({ user_id: userId })
        .whereIn('pathway_id', pathwayIds)
        .throwIfNotFound();
      await StudentPathways.query(txn)
        .whereIn(
          'id',
          pathwaysToDelete.map((p) => p.id)
        )
        .throwIfNotFound()
        .del();
      return [null, userId];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

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
      // error.message = 'Pathway Not Found';
      return [error, null];
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
      await Pathways.query(txn).patch(info).where({ id });
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

  async getResidentialPathway() {
    const { Pathways } = this.server.models();
    try {
      // temporarily hardcoding the ID for the residential pathway
      const residentialPathway = await Pathways.query().where('id', 46);
      return [null, ...residentialPathway];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getOldPathwayIdByCode(code) {
    const { Pathways } = this.server.models();
    try {
      const pathway = await Pathways.query().throwIfNotFound().where('code', code);
      return [null, pathway];
    } catch (err) {
      const error = errorHandler(err);
      return [error, null];
    }
  }

  async insertPathwayCourses(pathwayId, courseIds, txn) {
    const { PathwayCourses } = this.server.models();
    const dateIST = UTCToISTConverter(new Date());
    let insertedCourses;
    try {
      const uniqueCourseIds = _.uniq(courseIds);
      // eslint-disable-next-line
      for (let courseID in uniqueCourseIds) {
        // eslint-disable-next-line
        const courses = await PathwayCourses.query()
          .where('course_id', uniqueCourseIds[courseID])
          .andWhere('pathway_id', pathwayId);
        if (courses.length <= 0 || courses === null || courses === undefined) {
          // eslint-disable-next-line
          insertedCourses = await PathwayCourses.query(txn).insert({
            course_id: uniqueCourseIds[courseID],
            pathway_id: pathwayId,
            created_at: dateIST,
          });
        }
      }
      return [null, insertedCourses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
