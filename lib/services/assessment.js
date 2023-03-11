const Schmervice = require('schmervice');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const { log } = require('console');

module.exports = class AssessmentService extends Schmervice.Service {
  async allAssessment(assessment_id){
    const { Assessment, CoursesV2, ExercisesV2  } = this.server.models();
    let assessmentDetail;
    try {
      let assessmentFullDetail = {};
      let data = [];
      const assessmentDetail = await Assessment.query().findById(assessment_id);
      if (assessmentDetail) {
        const courseDetails = await CoursesV2.query().findById(assessmentDetail.course_id);
        const exercise = await ExercisesV2.query().findById(assessmentDetail.exercise_id);
        const courseFolderName = `assessment/${courseDetails.name}_${assessmentDetail.course_id}/${exercise.name}//PARSED_CONTENT`;        
        data = await this.getExerciseAssessment(courseFolderName, assessmentDetail.name, 'en');
        assessmentFullDetail.name = assessmentDetail.name;
        assessmentFullDetail.content = data;
        assessmentFullDetail.course_id = assessmentDetail.course_id;
        assessmentFullDetail.exercise_id= assessmentDetail.exercise_id
      }
      return [null, assessmentFullDetail];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getAssessmentById(assessment_id) {
    const { Assessment, CoursesV2, ExercisesV2 } = this.server.models();
    try {
      let data = [];
      const assessmentDetail = await Assessment.query().findById(assessment_id);
      if (assessmentDetail) {
        const courseDetails = await CoursesV2.query().findById(assessmentDetail.course_id);
        const exercise = await ExercisesV2.query().findById(assessmentDetail.exercise_id);
        const courseFolderName = `assessment/${courseDetails.name}_${assessmentDetail.course_id}/${exercise.name}//PARSED_CONTENT`;
        data = await this.getExerciseAssessment(courseFolderName, assessmentDetail.name, 'en');
      }
      return [null, data];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async addAssessment(data) {
    const { ExercisesV2, CoursesV2, Assessment } = this.server.models();
    const { exercisesServiceV2 } = this.server.services();
    try {
      let newExercise;
      const courseDetails = await CoursesV2.query().findById(data.course_id);
      const exercise = await ExercisesV2.query().findById(data.exercise_id);
      if (courseDetails !== undefined) {
        const courseFolderName = `assessment/${courseDetails.name}_${data.course_id}`;
        if (!fs.existsSync(`${courseFolderName}`)) {
          fs.mkdirSync(`${courseFolderName}`);
          if (!fs.existsSync(`${courseFolderName}/${exercise.name}`)) {
            fs.mkdirSync(`${courseFolderName}/${exercise.name}`);
          }
        } else if (!fs.existsSync(`${courseFolderName}/${exercise.name}`)) {
          fs.mkdirSync(`${courseFolderName}/${exercise.name}`);
        }
        if (fs.existsSync(`${courseFolderName}/${exercise.name}`)) {
          fs.writeFileSync(
            path.resolve(`${courseFolderName}/${exercise.name}/${exercise.name}_${data.name}.json`),
            JSON.stringify(JSON.parse(data.content), null, '\t')
          );
        }
        const exerciseContant = await exercisesServiceV2.parsedModifiedContent(
          `${courseFolderName}/${exercise.name}`,
          `${exercise.name}_${data.name}`,
          data.content,
          'assessment'
        );
        data.name = `${exercise.name}_${data.name}`;
        data.content = exerciseContant;
        newExercise = await Assessment.query().insert(data);
      }
      return [null, newExercise];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async deleteSingleAssessment(assessment_id) {
    const {
      Assessment,
      assessmentResult,
      PathwaysOngoingTopic,
      ExercisesV2,
      CoursesV2,
    } = this.server.models();
    let deleted;
    try {
      const assessmentDetail = await Assessment.query().findById(assessment_id);
      let successfullyDeleted;
      if (assessmentDetail !== undefined) {
        const courseDetails = await CoursesV2.query().findById(assessmentDetail.course_id);
        const exerciseDetails = await ExercisesV2.query().findById(assessmentDetail.exercise_id);
        if (courseDetails !== undefined && exerciseDetails !== undefined) {
          const courseFolderName = `assessment/${courseDetails.name}_${assessmentDetail.course_id}/${exerciseDetails.name}`;
          if (fs.existsSync(`${courseFolderName}`)) {
            const assessmentJson = `${courseFolderName}/${assessmentDetail.name}.json`;
            if (fs.existsSync(assessmentJson)) {
              const propertiesAssessmentJson = `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${assessmentDetail.name}_en.json`;
              const modifiedAssessmentJson = `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${assessmentDetail.name}.json`;
              fs.unlinkSync(propertiesAssessmentJson);
              fs.unlinkSync(modifiedAssessmentJson);
              fs.unlinkSync(assessmentJson);
            }
          }
          await assessmentResult.query().delete().where('assessment_id', assessment_id);
          await PathwaysOngoingTopic.query().delete().where('assessment_id', assessment_id);
          deleted = await Assessment.query().delete().throwIfNotFound().where('id', assessment_id);
          if (deleted) {
            successfullyDeleted = { success: true };
          }
        }
      }
      return [null, successfullyDeleted];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }
  
  async findAssessmentByCourseDetails(
    exerciseDetail,
    courseId,
    courseName,
    sequence,
    userDetails,
    lang = 'en'
  ) {
    const { Assessment } = this.server.models();
    const exerciseAssessment = await Assessment.query().where('exercise_id', exerciseDetail.id);
    const currentFolderName = `assessment/${courseName}_${courseId}/${exerciseDetail.name}/PARSED_CONTENT`;
    const AssessmentList = [];
    if (exerciseAssessment.length > 0) {
      // eslint-disable-next-line
      for (const file of exerciseAssessment) {
        // eslint-disable-next-line
        let data = await this.getExerciseAssessment(currentFolderName, file.name, lang);
        if (data === null) {
          const parseContent = JSON.parse(JSON.parse(file.content));
          data = parseContent.value;
        }
        const attempt_status = {};
        if (userDetails !== null) {
          // eslint-disable-next-line
          const [err, isAttempted] = await this.findResultById(file.id, userDetails.id);
          attempt_status.selected_option = isAttempted.selected_option;
          attempt_status.attempt_count = isAttempted.attempt_count;
        } else {
          attempt_status.selected_option = null;
          attempt_status.attempt_count = 0;
        }
        const newExercise = {};
        newExercise.id = file.id;
        newExercise.course_id = exerciseDetail.course_id;
        newExercise.exercise_id = exerciseDetail.id;
        newExercise.course_name = courseName;
        newExercise.exercise_name = exerciseDetail.name;
        newExercise.content = data;
        newExercise.attempt_status = attempt_status;
        newExercise.sequence_num = sequence;
        newExercise.content_type = 'assessment';
        newExercise.updated_at = file.updated_at;
        AssessmentList.push(newExercise);
        sequence += 1;
      }
    }
    return AssessmentList;
  }

  // eslint-disable-next-line
  async getExerciseAssessment(baseDir, fileName, lang = 'en') {
    const modifiedFile = `${baseDir}/MODIFIED_FILES/${fileName}.json`;
    const propertiesFile = `${baseDir}/PROPERTIES_FILES/${fileName}_${lang}.json`;
    if (fs.existsSync(modifiedFile)) {
      const modifiedDataInString = JSON.parse(fs.readFileSync(modifiedFile));
      if (!fs.existsSync(propertiesFile)) {
        return modifiedDataInString;
      }
      const propertiesDataInString = JSON.parse(fs.readFileSync(propertiesFile));
      _.map(modifiedDataInString, async (modifiedCont) => {
        if (modifiedCont.component === 'image') {
          // eslint-disable-next-line
          if (propertiesDataInString.hasOwnProperty(modifiedCont.alt)) {
            modifiedCont.alt = propertiesDataInString[modifiedCont.alt];
          }
        } else if (modifiedCont.component === 'table') {
          _.map(modifiedCont.value, (tableDetails) => {
            // eslint-disable-next-line
            if (propertiesDataInString.hasOwnProperty(tableDetails.header)) {
              tableDetails.header = propertiesDataInString[tableDetails.header];
            }
            // eslint-disable-next-line
            for (const item in tableDetails.items) {
              // eslint-disable-next-line
              if (propertiesDataInString.hasOwnProperty(tableDetails.items[item])) {
                tableDetails.items[item] = propertiesDataInString[tableDetails.items[item]];
              }
            }
          });
        } else if (modifiedCont.component === 'options') {
          _.forEach(modifiedCont.value, (innerList) => {
            // eslint-disable-next-line
            if (propertiesDataInString.hasOwnProperty(innerList.value)) {
              innerList.value = propertiesDataInString[innerList.value];
            }
          });
        } else if (modifiedCont.component === 'output') {
          _.forEach(modifiedCont.value, (innerList) => {
            _.forEach(innerList, (innerToken) => {
              // eslint-disable-next-line
              if (propertiesDataInString.hasOwnProperty(innerToken.value)) {
                innerToken.value = propertiesDataInString[innerToken.value];
              }
            });
          });
        } else {
          // eslint-disable-next-line
          if (propertiesDataInString.hasOwnProperty(modifiedCont.value)) {
            modifiedCont.value = propertiesDataInString[modifiedCont.value];
          }
        }
      });
      return modifiedDataInString;
    }
    return null;
  }

  async studentResult(details, txn) {
    const { assessmentResult, Assessment } = this.server.models();
    const { coursesServiceV2, progressTrackingService } = this.server.services();
    try {
      const assessment = await assessmentResult
        .query()
        .where('assessment_id', details.assessment_id)
        .andWhere('user_id', details.user_id);
      if (assessment.length > 0 && assessment != null) {
        details.attempt_count = assessment[0].attempt_count + 1;
        await assessmentResult
          .query(txn)
          .patch(details)
          .where('assessment_id', details.assessment_id)
          .andWhere('user_id', details.user_id);
      } else {
        details.attempt_count = 1;
        await assessmentResult.query(txn).insert(details);
      }
      let result = await assessmentResult
        .query()
        .where('assessment_id', details.assessment_id)
        .andWhere('user_id', details.user_id);
      if (result.length > 0 && result != null) {
        // eslint-disable-next-line
        result = result[0];
        const jsonDetails = {};
        const assessmentDetails = await Assessment.query().where('id', details.assessment_id);
        // eslint-disable-next-line
        const [errInPathwayId, getPathwayId] = await coursesServiceV2.getPathwayIdByCourseId(
          assessmentDetails[0].course_id
        );
        jsonDetails.user_id = details.user_id;
        jsonDetails.assessment_id = details.assessment_id;
        jsonDetails.course_id = assessmentDetails[0].course_id;
        jsonDetails.pathway_id = getPathwayId;
        jsonDetails.exercise_id = null;
        await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
      }
      return [null, result];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async findResultById(assessment_id, user_id) {
    const { assessmentResult } = this.server.models();
    const result = {};
    try {
      const assessment = await assessmentResult
        .query()
        .where('assessment_id', assessment_id)
        .andWhere('user_id', user_id);
      if (assessment.length > 0 && assessment != null) {
        if (assessment[0].status === 'Pass') {
          result.attempt_status = 'CORRECT';
        } else {
          result.attempt_status = 'INCORRECT';
        }
        result.attempt_count = assessment[0].attempt_count;
        result.selected_option = assessment[0].selected_option;
        result.assessment_id = assessment_id;
      } else {
        result.attempt_status = 'NOT_ATTEMPTED';
        result.selected_option = null;
        result.attempt_count = 0;
        result.assessment_id = assessment_id;
      }
      return [null, result];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateSingleAssessment(id, data) {
    const { ExercisesV2, CoursesV2, Assessment } = this.server.models();
    const { exercisesServiceV2 } = this.server.services();
    let exerciseContant;
    try {
      if (data.name !== undefined || data.content !== undefined || data.exercise_id !== undefined) {
        const assessmentData = await Assessment.query().findById(id);
        const exerciseDetails = await ExercisesV2.query().findById(assessmentData.exercise_id);
        const courseDetails = await CoursesV2.query().findById(assessmentData.course_id);
        const language = ['hi', 'en', 'te', 'mr', 'ta'];
        const courseFolderName = `assessment/${courseDetails.name}_${assessmentData.course_id}/${exerciseDetails.name}`;
        if (courseDetails !== undefined && exerciseDetails !== undefined) {
          if (data.exercise_id !== undefined && data.exercise_id !== null) {
            const courseData = fs.readFileSync(`${courseFolderName}/${assessmentData.name}.json`);
            const allJsonData = courseData.toString().trim();
            await this.deleteSingleAssessment(id);
            const updatingData = {
              name: data.name
                ? data.name
                : assessmentData.name.split(`${exerciseDetails.name}_`)[1],
              content: data.content ? data.content : allJsonData,
              course_id: assessmentData.course_id,
              exercise_id: data.exercise_id,
            };
            await this.addAssessment(updatingData);
          } else {
            if (data.name !== undefined) {
              data.name = `${exerciseDetails.name}_${data.name}`;
              if (fs.existsSync(`${courseFolderName}`)) {
                const courseData = fs.readFileSync(
                  `${courseFolderName}/${assessmentData.name}.json`
                );
                const allJsonData = courseData.toString().trim();
                fs.renameSync(
                  `${courseFolderName}/${assessmentData.name}.json`,
                  `${courseFolderName}/${data.name}.json`
                );
                fs.renameSync(
                  `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${assessmentData.name}.json`,
                  `${courseFolderName}/PARSED_CONTENT/MODIFIED_FILES/${data.name}.json`
                );
                // eslint-disable-next-line
                for (const lang in language) {
                  if (
                    fs.existsSync(
                      `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${assessmentData.name}_${language[lang]}.json`
                    )
                  ) {
                    fs.renameSync(
                      `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${assessmentData.name}_${language[lang]}.json`,
                      `${courseFolderName}/PARSED_CONTENT/PROPERTIES_FILES/${data.name}_${language[lang]}.json`
                    );
                  }
                }
                assessmentData.name = data.name;
                if (data.content === undefined) {
                  exerciseContant = await exercisesServiceV2.parsedModifiedContent(
                    courseFolderName,
                    data.name,
                    allJsonData,
                    'assessment'
                  );
                }
              }
            }
            if (data.content !== undefined) {
              if (fs.existsSync(`${courseFolderName}`)) {
                fs.writeFileSync(
                  path.resolve(`${courseFolderName}/${assessmentData.name}.json`),
                  JSON.stringify(JSON.parse(data.content), null, '\t')
                );
              }
              exerciseContant = await exercisesServiceV2.parsedModifiedContent(
                courseFolderName,
                assessmentData.name,
                data.content,
                'assessment'
              );
              data.content = exerciseContant;
            }
          }
        }
        await Assessment.query().patch(data).where('id', id);
      }
      return [null, 'success'];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
