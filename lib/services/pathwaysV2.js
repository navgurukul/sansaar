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

const { C4CA_PATHWAY_ID } = process.env;

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
      pathway = data.filter(item => item.attributes.code !== 'C4CA');
      pathway = pathway.map((col) => {
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


  async userProgressMigration(pathway_id) {
    const { ExerciseCompletionV2, assessmentOutcome } = this.server.models();
    const { exercisesServiceV2 } = this.server.services();

    try {

      const { data } = await strapi.findOne('pathways', pathway_id, {
        populate: ['courses.assessments', 'courses.exercises'],
      })

      const pathwayData = data.attributes.courses.data;

      const coursePromises = pathwayData.map(async (course) => {
        const { exercises, assessments } = course.attributes;

        const course_id = course.id
        const assessmentIds = (assessments && assessments.data) ? assessments.data.map((asm) => asm.id) : [];
        const exercisesIds = (exercises && exercises.data) ? exercises.data.map((asm) => asm.id) : [];
        const exercisesUser = await ExerciseCompletionV2.query().select("user_id").whereIn('exercise_id', exercisesIds)
        const assessmentUser = await assessmentOutcome.query().select("user_id").whereIn('assessment_id', assessmentIds)
        const mergedUsers = exercisesUser.concat(assessmentUser);
        const userIds = Array.from(new Set(mergedUsers.map(item => item.user_id)))
        for (let userId of userIds) {
          await exercisesServiceV2.calculateCourseModulePathwayPercent(userId, course_id, null)
        }
        return { userIds };
      });
      await Promise.all(coursePromises);
      return [null, "success"];
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


  async getCourseComplete(userId, pathway_id, courseIds) {
    const {
      CourseCompletionV3,
      PathwayCompletionV2,
      assessmentOutcome,
      ExerciseCompletionV2,
    } = this.server.models();
    const pathwaysPercentageDetails = {};
    let allCourses = [];

    try {
      for (const course of courseIds) {
        const totalData = [];
        const attemptedData = [];
        const course_details = {};
        const { data } = await strapi.findOne('courses', course.id, {
          populate: ['assessments', 'exercises'],
        });
        const exercises = data.attributes.exercises.data;
        const assessment = data.attributes.assessments.data;
        for (const assessmentData of assessment) {
          // eslint-disable-next-line
          const assessmentlearningTrackStatus = await assessmentOutcome
            .query()
            .where('assessment_id', assessmentData.id)
            .andWhere('user_id', userId);

          attemptedData.push(...assessmentlearningTrackStatus);
        }

        for (const exercisesData of exercises) {
          // eslint-disable-next-line
          const exercisesDatalearningTrackStatus = await ExerciseCompletionV2.query()
            .where('exercise_id', exercisesData.id)
            .andWhere('user_id', userId);

          attemptedData.push(...exercisesDatalearningTrackStatus);
        }
        totalData.push(...exercises);

        totalData.push(...assessment);
        // eslint-disable-next-line
        let percentage = parseInt((attemptedData.length / totalData.length) * 100);
        if (percentage > 100) {
          percentage = 100;
        }
        course_details.course_id = course.id;

        course_details.completed_portion = isNaN(percentage) ? 0 : percentage;
        allCourses.push(course_details);
      }
      pathwaysPercentageDetails.pathway = allCourses;

      const existspathway = await PathwayCompletionV2.query().where({
        user_id: userId,
        pathway_id,
      });
      console.log(existspathway)

      if (existspathway !== null && existspathway !== undefined && existspathway.length > 0) {
        pathwaysPercentageDetails.total_completed_portion = existspathway[0].percentage;
        pathwaysPercentageDetails.complete_at = null;

        if (existspathway[0].percentage == 100) {
          pathwaysPercentageDetails.complete_at = existspathway[0].complete_at;
        }
      } else {
        pathwaysPercentageDetails.total_completed_portion = 0;
        pathwaysPercentageDetails.complete_at = null;
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
  async findPathwaysOngoingTopic(user_Id, team_id) {
    const { PathwaysOngoingTopicOutcome, C4caTeamProjectTopic } = this.server.models();
    try {


      const user_team = team_id ?
        { 'team_id': team_id } : { 'user_id': user_Id }
      const { data } = await strapi.find('pathways', { populate: ['logo'] });
      const pathwaysOngoingTopic = [];

      for (const pathway of data) {

        const pathwaytopic = await PathwaysOngoingTopicOutcome.query()
          .where(user_team)
          .andWhere('pathway_id', pathway.id);

        if (pathwaytopic !== null && pathwaytopic !== undefined && pathwaytopic.length > 0) {

          let course_name = ""
          let module_name = ""
          let exercise_name = "";
          let assessment_name = ""
          let project_topic_name = "";



          if (pathwaytopic[0].module_id !== null && pathwaytopic[0].module_id !== undefined) {
            const moduleDetails = await strapi.findOne('modules', pathwaytopic[0].module_id);
            module_name = moduleDetails && moduleDetails.data && moduleDetails.data.attributes && moduleDetails.data.attributes.name
          }

          if (pathwaytopic[0].course_id !== null && pathwaytopic[0].course_id !== undefined) {
            const moduleCourseDetails = await strapi.findOne('courses', pathwaytopic[0].course_id, {
              populate: ['modules']
            });
            course_name = moduleCourseDetails && moduleCourseDetails.data && moduleCourseDetails.data.attributes && moduleCourseDetails.data.attributes.name
          }

          if (pathwaytopic[0].exercise_id !== null && pathwaytopic[0].exercise_id !== undefined) {
            const exerciseDetails = await strapi.findOne('exercises', pathwaytopic[0].exercise_id);
            exercise_name = exerciseDetails && exerciseDetails.data && exerciseDetails.data.attributes && exerciseDetails.data.attributes.name
          }

          if (pathwaytopic[0].assessment_id !== null && pathwaytopic[0].assessment_id !== undefined) {
            const assessmentDetails = await strapi.findOne('assessments', pathwaytopic[0].assessment_id);

            assessment_name = assessmentDetails && assessmentDetails.data && assessmentDetails.data.attributes && assessmentDetails.data.attributes.name
          }

          if (pathwaytopic[0].project_topic_id !== null && pathwaytopic[0].project_topic_id !== undefined) {

            const existingRecord = await C4caTeamProjectTopic.query().where('team_id', team_id).andWhere("id", pathwaytopic[0].project_topic_id);
            project_topic_name = existingRecord.project_title ? existingRecord.project_title : ""
          }

          const topic = {};
          topic.exercise_id = pathwaytopic[0].exercise_id;
          topic.assessment_id = pathwaytopic[0].assessment_id;
          topic.course_id = pathwaytopic[0].course_id;
          topic.pathway_id = pathwaytopic[0].pathway_id;
          topic.module_id = pathwaytopic[0].module_id;
          topic.project_topic_id = pathwaytopic[0].project_topic_id;
          topic.project_solution_id = pathwaytopic[0].project_solution_id;
          topic.exercise_name = exercise_name;
          topic.assessment_name = assessment_name;
          topic.course_name = course_name;
          topic.module_name = module_name;
          topic.project_topic_name = project_topic_name;
          topic.pathway_name = pathway.attributes.name;
          topic.logo = pathway.attributes.logo.data
            ? pathway.attributes.logo.data.attributes.url
            : null;;
          pathwaysOngoingTopic.push(topic);
        }
      }

      return [null, pathwaysOngoingTopic];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }


  async findPathwaysOngoingTopicByPathwayId(user_Id, team_id, partner_id) {
    const { PathwaysOngoingTopicOutcome, C4caTeamProjectTopic } = this.server.models();
    try {
      const user_team = team_id ?
        { 'team_id': team_id } : { 'user_id': user_Id }

      const pathwayDetails = await strapi.findOne('pathways', partner_id, { populate: ['logo'] });

      const pathway = pathwayDetails.data
      const pathwaysOngoingTopic = [];
      const pathwaytopic = await PathwaysOngoingTopicOutcome.query()
        .where(user_team)
        .andWhere('pathway_id', pathway.id);

      if (pathwaytopic !== null && pathwaytopic !== undefined && pathwaytopic.length > 0) {

        let course_name = ""
        let module_name = ""
        let exercise_name = "";
        let assessment_name = ""
        let project_topic_name = "";


        if (pathwaytopic[0].module_id !== null && pathwaytopic[0].module_id !== undefined) {
          const moduleDetails = await strapi.findOne('modules', pathwaytopic[0].module_id);
          module_name = moduleDetails && moduleDetails.data && moduleDetails.data.attributes && moduleDetails.data.attributes.name
        }

        if (pathwaytopic[0].course_id !== null && pathwaytopic[0].course_id !== undefined) {
          const moduleCourseDetails = await strapi.findOne('courses', pathwaytopic[0].course_id, {
            populate: ['modules']
          });
          course_name = moduleCourseDetails && moduleCourseDetails.data && moduleCourseDetails.data.attributes && moduleCourseDetails.data.attributes.name
        }

        if (pathwaytopic[0].exercise_id !== null && pathwaytopic[0].exercise_id !== undefined) {
          const exerciseDetails = await strapi.findOne('exercises', pathwaytopic[0].exercise_id);
          exercise_name = exerciseDetails && exerciseDetails.data && exerciseDetails.data.attributes && exerciseDetails.data.attributes.name
        }

        if (pathwaytopic[0].assessment_id !== null && pathwaytopic[0].assessment_id !== undefined) {
          const assessmentDetails = await strapi.findOne('assessments', pathwaytopic[0].assessment_id);

          assessment_name = assessmentDetails && assessmentDetails.data && assessmentDetails.data.attributes && assessmentDetails.data.attributes.name
        }


        if (pathwaytopic[0].project_topic_id !== null && pathwaytopic[0].project_topic_id !== undefined) {

          const existingRecord = await C4caTeamProjectTopic.query().where('team_id', team_id).andWhere("id", pathwaytopic[0].project_topic_id);
          project_topic_name = existingRecord.project_title ? existingRecord.project_title : ""
        }

        const topic = {};
        topic.exercise_id = pathwaytopic[0].exercise_id;
        topic.assessment_id = pathwaytopic[0].assessment_id;
        topic.course_id = pathwaytopic[0].course_id;
        topic.pathway_id = pathwaytopic[0].pathway_id;
        topic.module_id = pathwaytopic[0].module_id;
        topic.exercise_name = exercise_name;
        topic.assessment_name = assessment_name;
        topic.course_name = course_name;
        topic.module_name = module_name;
        topic.project_topic_name = project_topic_name;
        topic.project_topic_id = pathwaytopic[0].project_topic_id;
        topic.project_solution_id = pathwaytopic[0].project_solution_id;
        topic.pathway_name = pathway.attributes.name;
        topic.logo = pathway.attributes.logo.data
          ? pathway.attributes.logo.data.attributes.url
          : null;;
        pathwaysOngoingTopic.push(topic);
      }
      return [null, pathwaysOngoingTopic];
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

      let assessmentIdsInArray = [];
      const pathwayCourses = [];
      await Promise.all(pathwayData.map(async (courses) => {
        const { exercises, assessments } = courses.attributes

        const assessmentIds = (assessments && assessments.data) ? assessments.data.map((asm) => asm.id) : [];
        let ids = assessmentIds.length;
        assessmentIdsInArray.push(ids);
        const exercisesIds = (exercises && exercises.data) ? exercises.data.map((asm) => asm.id) : [];

        const course = { id: courses.id, name: courses.attributes.name, assessmentIds, exercisesIds };

        pathwayCourses.push(course);
      }));

      return [null, pathwayCourses, assessmentIdsInArray];
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
      // eslint-disable-next-line no-inner-declarations
      function removingDuplicates(array) {
        let filter = [];

        // eslint-disable-next-line no-plusplus
        for (let i = array.length - 1; i >= 0; i--) {
          const item = array[i];
          if (filter.includes(item.exercise_id)) {
            array.splice(i, 1); // Remove duplicate entries
          } else {
            filter.push(item.exercise_id);
          }
        }
        return array;
      }

      const calculateProgressBar = (completed, total) => {
        return (completed / total) * 100;
      };

      for (const course of pathwayCourses) {
        const { assessmentIds, exercisesIds } = course;

        const [resultsData2, exercisesData2] = await Promise.all([
          getResultsData(assessmentIds),
          getExercisesData(exercisesIds)
        ]);


        let exercisesData = removingDuplicates(exercisesData2)
        let resultsData = removingDuplicates(resultsData2)

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


  async transform(input, team_id, user_id) {
    const { PathwayCompletionV2, ModuleCompletionV2, CourseCompletionV3 } = this.server.models();
    const user_team = team_id ? { 'team_id': team_id } : { 'user_id': user_id };
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
        outcomes: input.attributes.outcomes
        ? strapiToMerakiConverter(JSON.parse(input.attributes.outcomes).blocks)
        : [],
        summary: input.attributes.summary
          ? strapiToMerakiConverter(JSON.parse(input.attributes.summary).blocks)
          : [],
        total_completed_portion: pathwayPercentage,
        modules: [],
      };
      // input.attributes.modules.data.sort((a, b) => a.id - b.id);
      let index = 0;
      for (const module of input.attributes.modules.data) {
        let module_percentage;
        const percentage = await ModuleCompletionV2.query()
          .select('percentage')
          .where('module_id', module.id)
          .andWhere(user_team);
        module_percentage = percentage.length > 0 ? percentage[0].percentage : 0;
        const logo = module.attributes.logo.data ? module.attributes.logo.data.attributes.url : null;
        delete module.attributes.logo;
        const moduleObj = {
          id: module.id,
          ...module.attributes,
          logo,
          completed_portion: module_percentage,
          courses: [],
        };
        let module_lock = true;
        if (index > 0) {
          if (output.modules[index - 1].completed_portion >= 100) {
            module_lock = false;
          } else {
            module_lock = true;
          }
        } else {
          module_lock = false;
        }
        moduleObj.module_lock = module_lock;
        output.modules.push(moduleObj);
        // module.attributes.courses.data.sort((a, b) => a.id - b.id);
        let course_index = 0;
        for (const course of module.attributes.courses.data) {
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

          let course_lock = true;
          if (index === 0 && course_index === 0) {
            course_lock = false;
          } else if (course_index > 0) {
            if (output.modules[index].courses[course_index - 1].completed_portion >= 100) {
              course_lock = false;
            } else {
              course_lock = true;
            }
          } else if (moduleObj.module_lock === false) {
            course_lock = false;
          }
          courseObj.course_lock = course_lock;
          output.modules[index].courses.push(courseObj);
          course_index += 1;

        }
        index += 1;

      }
      return output;
    } catch (error) {
      return [errorHandler(error), null];
    }
  };


  async getC4CAPathway(team_id, user_id) {
    let pathway;
    try {
      const { data } = await strapi.findOne('pathways', C4CA_PATHWAY_ID, {
        // from populating we can get modules of courses and pathway
        populate: ['modules.courses', 'modules.logo', 'logo', 'modules.courses.logo'],
      });
      pathway = this.transform(data, team_id, user_id);
      return [null, pathway];
    } catch (err) {
      return [errorHandler(err), null];
    }
  };

  async getModuleC4CA(team_id, user_id) {
    const { ModuleCompletionV2, PathwayCompletionV2 } = this.server.models();
    try {
      const { data } = await strapi.findOne('pathways', C4CA_PATHWAY_ID, {
        // from populating we can get modules of courses and pathway
        populate: ['modules.logo', 'logo'],
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

      let output = {
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

      // data.attributes.modules.data.sort((a, b) => a.id - b.id);
      let index = 0;
      for (const module of data.attributes.modules.data) {
        let module_percentage;
        const percentage = await ModuleCompletionV2.query()
          .select('percentage')
          .where('module_id', module.id)
          .andWhere(user_team);
        module_percentage = percentage.length > 0 ? percentage[0].percentage : 0;
        const logo = module.attributes.logo.data ? module.attributes.logo.data.attributes.url : null;
        delete module.attributes.logo;
        const moduleObj = {
          id: module.id,
          ...module.attributes,
          logo,
          completed_portion: module_percentage,
        };
        let module_lock = true;
        if (index > 0) {
          if (output.modules[index - 1].completed_portion >= 100) {
            module_lock = false;
          } else {
            module_lock = true;
          }
        } else {
          module_lock = false;
        }
        moduleObj.module_lock = module_lock;
        output.modules.push(moduleObj);
        index += 1;

      }

      return [null, output];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }


};