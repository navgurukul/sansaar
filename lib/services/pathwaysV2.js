/* eslint-disable prettier/prettier */
/* eslint-disable spaced-comment */
/* eslint-disable array-callback-return */
/* eslint-disable prefer-const */
/* eslint-disable lines-between-class-members */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable eqeqeq */
/* eslint-disable class-methods-use-this */
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

  //getting all pathways from strapi
  async find(withCourse = false) {
    let pathway;
    try {
      const { data } = await strapi.find(
        'pathways',
        withCourse
          ? { populate: ['courses.logo', 'logo'], sort: 'createdAt:asc' }
          : { populate: ['logo'], sort: 'createdAt:asc' }
      );
      pathway = data.map((col) => {
        const i = { id: col.id };
        const d = col.attributes;
        const pData = {
          ...i,
          ...d,
        };
        if (withCourse) {
          pData.courses = col.attributes.courses.data.map((course) => ({
            id: course.id,
            name: course.attributes.name,
            logo: course.attributes.logo && course.attributes.logo.data ? course.attributes.logo.data.attributes.url : null,
            short_description: course.attributes.short_description,
            lang_available: course.attributes.lang_available,
          }));
        }
        pData.logo = col.attributes.logo.data ? col.attributes.logo.data.attributes.url : null;
        if (col.attributes.summary) {
          const formattedSummary = strapiToMerakiConverter(
            JSON.parse(col.attributes.summary).blocks
          );
          pData.summary = formattedSummary;
        } else {
          pData.summary = [];
        }
        return pData;
      });
      return [null, pathway];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  //getting pathway by its ID and with its courses
  async findById(id, withCourse = false) {
    let pathway;
    try {
      const { data } = await strapi.findOne(
        'pathways',
        id,
        withCourse ? { populate: ['courses.logo', 'logo'] } : { populate: ['logo'] }
      );
      pathway = {
        id: data.id,
        ...data.attributes,
      };

      if (withCourse) {
        //converting structure of courses as similar to existing strucutre
        pathway.courses = data.attributes.courses.data.map((course) => ({
          id: course.id,
          name: course.attributes.name,
          logo: course.attributes.logo && course.attributes.logo.data ? course.attributes.logo.data.attributes.url : null,
          short_description: course.attributes.short_description,
          lang_available: course.attributes.lang_available,
        }));
      }
      // fetching the pathway logo
      pathway.logo = data.attributes.logo && data.attributes.logo.data ? data.attributes.logo.data.attributes.url : null;

      // by this we are converting the summary field of pathway decsription into existing structure of content
      if (data.attributes.summary) {
        const formattedSummary = strapiToMerakiConverter(
          JSON.parse(data.attributes.summary).blocks
        );
        pathway.summary = formattedSummary;
      } else {
        pathway.summary = [];
      }

      if (data.attributes.outcomes) {
        const formattedOutcomes = strapiToMerakiConverter(
          JSON.parse(data.attributes.outcomes).blocks,
        );
        pathway.outcomes = formattedOutcomes;
      } else {
        pathway.outcomes = [];
      }

      return [null, pathway];
    } catch (err) {
      return [errorHandler(err), null];
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


  //Getting data from Strapi for pathway is existing or not with this code
  async findByCode(code, withCourse = false) {
    let pathway;
    try {
      const { data } = await strapi.find(
        'pathways',
        withCourse
          ? { populate: ['courses.logo', 'logo'], sort: 'createdAt:asc' }
          : { populate: ['logo'], sort: 'createdAt:asc' }
      );
      const pathwayData = data.find((obj) => obj.attributes.code === code);
      if (pathwayData) {
        pathway = {
          id: pathwayData.id,
          ...pathwayData.attributes,
        };
        if (pathwayData.attributes.summary) {
          const formattedSummary = strapiToMerakiConverter(
            JSON.parse(pathwayData.attributes.summary).blocks
          );
          pathway.summary = formattedSummary;
        } else {
          pathway.summary = [];
        }
        pathway.logo = pathwayData.attributes.logo.data ? pathwayData.attributes.logo.data.attributes.url : null;
        return [pathway];
      }
      return [false];
    } catch (err) {
      return [errorHandler(err), null];
    }
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
    const completedPathway = { user_id: userId, pathway_id: pathwayId, complete_at: dateIST };

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

  async getPathwayComplete(userId, pathway_id) {
    const { PathwayCompletionV2 } = this.server.models();

    let completedPathways;
    try {
      completedPathways = await PathwayCompletionV2.query()
        .where('user_id', userId)
        .andWhere('pathway_id', pathway_id);
      let pathwayCompleteDate = [];
      if (
        completedPathways.length > 0 &&
        completedPathways != null &&
        // eslint-disable-next-line eqeqeq
        completedPathways != undefined
      ) {
        pathwayCompleteDate = completedPathways[0].complete_at;
      }
      return [null, pathwayCompleteDate];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  /**
   * This function finds the ongoing topics for a given user and pathway, and returns the pathway topic
   * with its logo.
   * @param userId - The ID of the user for whom we want to find the ongoing topic in a pathway.
   * @param pathwayId - The ID of the pathway being queried.
   * @returns An array with two elements: the first element is either an error object or null, and the
   * second element is either the pathwaytopic object with the logo or null.
   */
  async findPathwaysOngoingTopic(userId, pathwayId) {
    const { PathwaysOngoingTopicOutcome } = this.server.models();
    try {
      const { data } = await strapi.findOne('pathways', pathwayId, { populate: ['logo'] });
      const pathwaytopic = await PathwaysOngoingTopicOutcome.query()
        .where('user_id', userId)
        .andWhere('pathway_id', pathwayId);
      pathwaytopic.name = data.attributes.name;
      pathwaytopic.logo = data.attributes.logo.data
        ? data.attributes.logo.data.attributes.url
        : null;
      return [null, pathwaytopic]; // Return pathwaytopic with the logo
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

  async upComingDoubtClasses(pathwayId, partnerID, userId) {
    const {
      Classes,
      ClassRegistrations,
      ClassesToCourses,
      PartnerSpecificBatches,
    } = this.server.models();
    try {
      const classIds = await PartnerSpecificBatches.query()
        .select('class_id')
        .where('partner_id', partnerID);
      const idsInArray = classIds.map((id) => id.class_id);
      if (idsInArray.length > 0 && idsInArray != null && idsInArray != undefined) {
        const idsOfClasses = await ClassesToCourses.query()
          .select('class_id')
          .where('pathway_v3', pathwayId)
          .whereIn('class_id', idsInArray);
        const ClassidsInArrayOfPathway = idsOfClasses.map((id) => id.class_id);
        const mainDoubtClass = [];
        if (
          ClassidsInArrayOfPathway.length > 0 &&
          ClassidsInArrayOfPathway != null &&
          ClassidsInArrayOfPathway != undefined
        ) {
          for (const classId of ClassidsInArrayOfPathway) {
            const classesDetails = await Classes.query().where('id', classId);
            if (classesDetails.length != 0) {
              const classes = await ClassRegistrations.query()
                .where('user_id', userId)
                .andWhere('class_id', classId);
              if (classes != undefined && classes != null && classes.length > 0) {
                classesDetails[0].enrolled = true;
              } else {
                classesDetails[0].enrolled = false;
              }
            }
            mainDoubtClass.push(...classesDetails);
          }

          return [null, mainDoubtClass];
        }
      }

      return [null, []];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
  async pathwaysNames() {
    try {
      let names = []
      const { data } = await strapi.find('pathways')
      data.map((pathway) =>
        names.push({ 'id': pathway.id, "name": pathway.attributes.name, "code": pathway.attributes.code })
      )
      return [null, names]
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async pathwayIDBycoursesExercisesAssessmentsIds(pathway_id) {
    try {
      const { data } = await strapi.findOne('pathways', pathway_id, {
        populate: ['courses.assessments.id'],
        pagination: {
          start: 0,
          limit: -1,
        },
      });

      const pathwayData = data.attributes.courses.data;
      const pathwayCourses = [];

      await Promise.all(pathwayData.map(async (courses) => {
        const assessmentIds = courses.attributes.assessments?.data.map((asm) => asm.id) || [];
        const course = { id: courses.id, name: courses.attributes.name, assessmentIds };
        pathwayCourses.push(course);
      }));

      return [null, pathwayCourses];
    } catch (err) {
      console.error("Error:", err);
      return [errorHandler(err), null];
    }
  }

  async resultScorePathwayCourses(user_id, pathwayCourses) {
    try {
      const { assessmentOutcome } = this.server.models();

      await Promise.all(pathwayCourses.map(async (course) => {
        const resultsData = await assessmentOutcome.query()
          .whereIn('assessment_id', course.assessmentIds)
          .andWhere('user_id', user_id);

        const assessment_result = {
          totalQuestions: course.assessmentIds.length,
          attemptedQuestions: resultsData.length,
          correctAnswers: 0,
          wrongAnswers: 0,
        };

        resultsData.forEach((assessment) => {
          const status = assessment.status.toLowerCase();
          if (status === 'pass') {
            assessment_result.correctAnswers += 1;
          } else if (status === 'fail') {
            assessment_result.wrongAnswers += 1;
          }
        });

        course.mcqs = assessment_result;
        delete course.assessmentIds;

      }));

      return [null, pathwayCourses];
    } catch (err) {
      console.error("Error:", err);
      return [errorHandler(err), null];
    }
  }
};
