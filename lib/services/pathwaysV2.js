/* eslint-disable no-prototype-builtins */
/* eslint-disable radix */
/* eslint-disable no-undef */
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

        if (col.attributes.outcomes) {
          const formattedOutcomes = strapiToMerakiConverter(
            JSON.parse(col.attributes.outcomes).blocks,
          );
          pData.outcomes = formattedOutcomes;
        } else {
          pData.outcomes = [];
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

        if (pathwayData.attributes.outcomes) {
          const formattedOutcomes = strapiToMerakiConverter(
            JSON.parse(pathwayData.attributes.outcomes).blocks,
          );
          pathway.outcomes = formattedOutcomes;
        } else {
          pathway.outcomes = [];
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


  async getCourseComplete(userId, pathway_id, courseIds) {
    const { CourseCompletionV3, PathwayCompletionV2 } = this.server.models();
    const pathwaysPercentageDetails = {}
    let allCourses = []

    try {
      for (const course of courseIds) {
        const course_details = {}
        const existsCourse = await CourseCompletionV3.query().where({
          user_id: userId,
          course_id: course.id
        });
        if (existsCourse !== null && existsCourse !== undefined && existsCourse.length > 0) {
          course_details.course_id = course.id;
          course_details.completed_portion = existsCourse[0].percentage;
          allCourses.push(course_details);
        } else {
          course_details.course_id = course.id;
          course_details.completed_portion = 0;
          allCourses.push(course_details);
        }
      }
      pathwaysPercentageDetails.pathway = allCourses

      const existspathway = await PathwayCompletionV2.query().where({
        user_id: userId,
        pathway_id: pathway_id
      });

      if (existspathway !== null && existspathway !== undefined && existspathway.length > 0) {
        pathwaysPercentageDetails.total_completed_portion = existspathway[0].percentage
        pathwaysPercentageDetails.complete_at = null

        if (existspathway[0].percentage == 100) {
          pathwaysPercentageDetails.complete_at = existspathway[0].complete_at
        }
      } else {
        pathwaysPercentageDetails.total_completed_portion = 0
        pathwaysPercentageDetails.complete_at = null
      }
      return [null, pathwaysPercentageDetails];
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
        populate: ['courses.assessments', 'courses.exercises'],
        pagination: {
          start: 0,
          limit: -1,
        },
      });

      const pathwayData = data.attributes.courses.data;

      const pathwayCourses = [];
      await Promise.all(pathwayData.map(async (courses) => {
        const { exercises, assessments } = courses.attributes

        const assessmentIds = (assessments && assessments.data) ? assessments.data.map((asm) => asm.id) : [];
        const exercisesIds = (exercises && exercises.data) ? exercises.data.map((asm) => asm.id) : [];

        const course = { id: courses.id, name: courses.attributes.name, assessmentIds, exercisesIds };

        pathwayCourses.push(course);
      }));

      return [null, pathwayCourses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async resultScorePathwayCourses(user_id, pathwayCourses) {
    try {
      const { assessmentOutcome, ExerciseCompletionV2 } = this.server.models();

      const getResultsData = async (assessmentIds) => {
        return assessmentOutcome.query()
          .whereIn('assessment_id', assessmentIds)
          .andWhere('user_id', user_id);
      };

      const getExercisesData = async (exerciseIds) => {
        return ExerciseCompletionV2.query()
          .whereIn('exercise_id', exerciseIds)
          .andWhere('user_id', user_id);
      };

      const calculateProgressBar = (completed, total) => {
        return (completed / total) * 100;
      };

      for (const course of pathwayCourses) {
        const { assessmentIds, exercisesIds } = course;

        const [resultsData, exercisesData] = await Promise.all([
          getResultsData(assessmentIds),
          getExercisesData(exercisesIds)
        ]);

        const attemptedProgress = resultsData.length + exercisesData.length;
        const totalCourse = assessmentIds.length + exercisesIds.length;
        const courseProgressBar = calculateProgressBar(attemptedProgress, totalCourse);

        const assessment_result = {
          totalQuestions: assessmentIds.length,
          attemptedQuestions: resultsData.length,
          correctAnswers: resultsData.filter(assessment => assessment.status.toLowerCase() === 'pass').length,
          wrongAnswers: resultsData.filter(assessment => assessment.status.toLowerCase() === 'fail').length,
        };

        course.courseProgressBar = courseProgressBar;
        course.mcqs = assessment_result;
        delete course.assessmentIds;
        delete course.exercisesIds;
      }

      const totalProgressBar = pathwayCourses.reduce((acc, { courseProgressBar }) => acc + courseProgressBar, 0);
      const overallProgress = calculateProgressBar(totalProgressBar, pathwayCourses.length * 100);

      return [null, { Courses: pathwayCourses, overallProgress: Math.min(Math.max(overallProgress, 0), 100) }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async resultScorePathwayCoursesUsers(user_ids, pathwayCourses, studentsData) {
    try {
      const { assessmentOutcome, ExerciseCompletionV2 } = this.server.models();
      const assessmentIds = pathwayCourses.flatMap(course => course.assessmentIds);
      const exerciseIds = pathwayCourses.flatMap(course => course.exercisesIds);

      const [resultsData, exerciseCompletionData] = await Promise.all([
        assessmentOutcome.query().whereIn('user_id', user_ids).whereIn('assessment_id', assessmentIds),
        ExerciseCompletionV2.query().whereIn('user_id', user_ids).whereIn('exercise_id', exerciseIds)
      ]);

      const userResultsMap = {};

      resultsData.forEach(({ user_id, status }) => {
        const strUserId = user_id;
        const statusLowC = status.toLowerCase();
        if (!userResultsMap.hasOwnProperty(strUserId)) {
          userResultsMap[strUserId] = { pass: 0 };
        }

        if (statusLowC === 'pass') {
          userResultsMap[strUserId].pass += 1;
        }
      });

      const allUsersProgress = studentsData.map(user => {
        const progressData = userResultsMap[user.id];
        const assessmentProgress = progressData ? (progressData.pass / assessmentIds.length) * 100 : 0;
        const exerciseProgress = (exerciseCompletionData.length / exerciseIds.length) * 100;
        const totalTasks = assessmentIds.length + exerciseIds.length;
        const progress = ((assessmentProgress + exerciseProgress) / totalTasks) * 100;

        // Ensure progress is between 0 and 100
        user.completed_percent = Math.min(Math.max(progress, 0), 100);
        return user;
      });

      return [null, allUsersProgress];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async resultScorePathwayCoursesForUsers(user_ids, pathwayCourses) {
    try {
      const { assessmentOutcome, ExerciseCompletionV2 } = this.server.models();

      const getResultsData = async (assessmentIds, user_id) => {
        const filteredIds = Array.from(new Set(assessmentIds)).filter(id => id !== null && id !== undefined);
        return assessmentOutcome.query()
          .whereIn('assessment_id', filteredIds)
          .andWhere('user_id', user_id).skipUndefined();
      };

      const getExercisesData = async (exerciseIds, user_id) => {
        const filteredIds = Array.from(new Set(exerciseIds)).filter(id => id !== null && id !== undefined);
        return ExerciseCompletionV2.query()
          .whereIn('exercise_id', filteredIds)
          .andWhere('user_id', user_id).skipUndefined();
      };

      const calculateProgressBar = (completed, total) => {
        return (completed / total) * 100;
      };

      const results = [];

      for (const user_id of user_ids) {
        const userResults = [];

        for (const course of pathwayCourses) {
          const { assessmentIds, exercisesIds } = course;

          const [resultsData, exercisesData] = await Promise.all([
            getResultsData(assessmentIds, user_id),
            getExercisesData(exercisesIds, user_id)
          ]);

          const attemptedProgress = resultsData.length + exercisesData.length;
          const totalCourse = assessmentIds.length + exercisesIds.length;
          const courseProgressBar = calculateProgressBar(attemptedProgress, totalCourse);

          const assessment_result = {
            totalQuestions: assessmentIds.length,
            attemptedQuestions: resultsData.length,
            correctAnswers: resultsData.filter(assessment => assessment.status.toLowerCase() === 'pass').length,
            wrongAnswers: resultsData.filter(assessment => assessment.status.toLowerCase() === 'fail').length,
          };

          userResults.push({
            ...course,
            courseProgressBar,
            mcqs: assessment_result
          });
        }

        const totalProgressBar = userResults.reduce((acc, { courseProgressBar }) => acc + courseProgressBar, 0);
        const overallProgress = calculateProgressBar(totalProgressBar, userResults.length * 100);
        results.push({ user_id, Courses: userResults, overallProgress: Math.min(Math.max(overallProgress, 0), 100) });
      }

      return [null, results];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  transform = async (input, team_id, user_id) => {
    const {PathwayCompletionV2, ModuleCompletionV2, CourseCompletionV3 } = this.server.models();
    const user_team = team_id ?
      { 'team_id': team_id } : { 'user_id': user_id }

      const pathwayPercen = await PathwayCompletionV2.query()
        .select('percentage')
        .where('pathway_id', input.id)
        .andWhere(user_team);

      let pathwayPercentage = 0;
      if (pathwayPercen.length > 0) {
        pathwayPercentage = pathwayPercen[0].percentage;
      }

    try {
      let output = {
        id: input.id,
        code: input.attributes.code,
        name: input.attributes.name,
        description: input.attributes.description,
        createdAt: input.attributes.createdAt,
        updatedAt: input.attributes.updatedAt,
        locale: input.attributes.locale,
        logo: input.attributes.logo.data ? input.attributes.logo.data.attributes.url : null,
        total_completed_portion: pathwayPercentage,
        modules: [],
      };

      await Promise.all(
        input.attributes.modules.data.map(async (module) => {
          let module_percentage;
          const percentage = await ModuleCompletionV2.query()
            .select('percentage')
            .where('module_id', module.id)
            .andWhere(user_team);
          module_percentage = percentage.length > 0 ? percentage[0].percentage : 0;

          const moduleObj = {
            id: module.id,
            ...module.attributes,
            completed_portion: module_percentage,
            courses: [],
          };

          await Promise.all(
            module.attributes.courses.data.map(async (course) => {
              let course_percentage;
              const c_percentage = await CourseCompletionV3.query()
                .select('percentage')
                .where('course_id', course.id)
                .andWhere(user_team);
              course_percentage = c_percentage.length > 0 ? c_percentage[0].percentage : 0;

              const courseObj = {
                id: course.id,
                name: course.attributes.name,
                short_description: course.attributes.short_description,
                lang_available: course.attributes.lang_available,
                createdAt: course.attributes.createdAt,
                updatedAt: course.attributes.updatedAt,
                publishedAt: course.attributes.publishedAt,
                locale: course.attributes.locale,
                logo: course.attributes.logo.data
                  ? course.attributes.logo.data.attributes.url
                  : null,
                completed_portion: course_percentage,
              };
              moduleObj.courses.push(courseObj);
            })
          );
          output.modules.push(moduleObj);
        })
      );

      return output;
    } catch (error) {
      return [errorHandler(error), null];
    }
  };

  async getC4CAPathway(team_id, user_id) {
    let pathway;
    try {
      const { data } = await strapi.findOne('pathways', 18, {
        // from populating we can get modules of courses and pathway
        populate: ['modules.courses', 'logo', 'modules.courses.logo'],
      });
      pathway = this.transform(data, team_id, user_id);

      // // by this we are converting the summary field of pathway decsription into existing structure of content
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
  };

  async getModuleC4CA(team_id, user_id) {
    const { ModuleCompletionV2, PathwayCompletionV2 } = this.server.models();
    try {
      const { data } = await strapi.findOne('pathways', 18, {
        // from populating we can get modules of courses and pathway
        populate: ['modules', 'logo'],
      });

      const user_team = team_id ?
        { 'team_id': team_id } : { 'user_id': user_id }

      const pathwayPercen = await PathwayCompletionV2.query()
        .select('percentage')
        .where('pathway_id', data.id)
        .andWhere(user_team);

      let pathwayPercentage = 0;
      if (pathwayPercen.length > 0) {
        pathwayPercentage = pathwayPercen[0].percentage;
      }

      let AllModulesData = {
        id: data.id,
        code: data.attributes.code,
        name: data.attributes.name,
        description: data.attributes.description,
        createdAt: data.attributes.createdAt,
        updatedAt: data.attributes.updatedAt,
        locale: data.attributes.locale,
        publishedAt: data.attributes.publishedAt,
        type: data.attributes.type,
        video_link: data.attributes.video_link,
        logo: data.attributes.logo.data ? data.attributes.logo.data.attributes.url : null,
        total_completed_portion: pathwayPercentage,
        modules: [],
      };
      for (let i = 0; i < data.attributes.modules.data.length; i++) {
        let percentage;
        percentage = await ModuleCompletionV2.query()
          .select('percentage')
          .where('module_id', data.attributes.modules.data[i].id)
          .andWhere(user_team);

        let module_percentage = 0;
        if (percentage.length > 0) {
          module_percentage = percentage[0].percentage;
        }
        let moduleObj = {
          id: data.attributes.modules.data[i].id,
          name: data.attributes.modules.data[i].attributes.name,
          createdAt: data.attributes.modules.data[i].attributes.createdAt,
          updatedAt: data.attributes.modules.data[i].attributes.updatedAt,
          publishedAt: data.attributes.modules.data[i].attributes.publishedAt,
          logo: null,
          completed_portion: module_percentage,
        };
        AllModulesData.modules.push(moduleObj);
      }
      return [null, AllModulesData];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

};
