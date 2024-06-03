/* eslint-disable prettier/prettier */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-shadow */
/* eslint-disable eqeqeq */
/* eslint-disable prefer-const */
/* eslint-disable no-else-return */
const Schmervice = require('schmervice');
const XLSX = require('xlsx');
const { errorHandler } = require('../errorHandling');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csv = require('csv-parser');

module.exports = class teacherService extends Schmervice.Service {

  async createTeacherCapacityBuilding(data) {
    let { TeacherCapacityBuilding } = this.server.models();
    try {
      let newData = await TeacherCapacityBuilding.query().select().where('user_id', data.user_id)

      if (newData.length == 0) {
        let newData = await TeacherCapacityBuilding.query().insert(data)
        return [null, { status: 'sucessfully', data: newData }]
      } else {
        return [{ error: true, message: 'you allready give the data', code: 403 }, null]
      }
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getTeacherUserId(user_id) {
    let { TeacherCapacityBuilding } = this.server.models();
    try {
      let newData = await TeacherCapacityBuilding.query().select().where('user_id', user_id)
      if (newData.length != 0) {
        return [null, true]
      }
      return [null, false]
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getTeacherDataByUserId(user_id) {
    let { TeacherCapacityBuilding } = this.server.models();
    try {
      let newData = await TeacherCapacityBuilding.query().select('*').where('user_id', user_id)
      if (newData.length != 0) {
        return [null, newData]
      }
      else {
        return [{
          Error: `true`,
          message: `Fill the form 'User_id' : ${user_id} data does not exist in the teacher capacity building`, code: 403,
        }, null];
      }
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async DeleteUserIdTeacher(user_id) {
    let { TeacherCapacityBuilding } = this.server.models();
    try {
      let newData = await TeacherCapacityBuilding.query().select().delete().where('user_id', user_id)
      if (newData != 0) {
        return [null, 'deleted succesfully the user']
      }
      return [{ error: true, message: "user id is not found", code: 403 }, null];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async TeacherCapacityBuildingTotalUsersID() {
    let { TeacherCapacityBuilding } = this.server.models();
    try {
      let TCBData = await TeacherCapacityBuilding.query().select()
      let userIDs = TCBData.map(person => person.user_id);

      return [null, userIDs, TCBData]
    } catch (err) {
      return [errorHandler(err)];
    }
  }

  async TeacherCapacityBuildingTotalUsersIDNew(page, limit) {    
    let { TeacherCapacityBuilding } = this.server.models();
    try {
      let TCBData = await TeacherCapacityBuilding.query().page(page, limit);

      return [null, TCBData];
    } catch (err) {
      return [errorHandler(err)];
    }
  }


  async DataLoaderSheetOBJ(usersInfo,usersProgress, assessmentIds){
    try {
      const { Certificate, User } = this.server.models();
      const outcomes = [];

      for (let i = 0; i < usersInfo.length; i++) {
        const userInfo = usersInfo[i];
        const progressInfo = usersProgress[i];

        if (userInfo.user_id === progressInfo.user_id) {
          const coursePrg = {};

          // eslint-disable-next-line no-await-in-loop
          const userD2 = await User.query().where('id', userInfo.user_id);
          // eslint-disable-next-line no-await-in-loop
          const cert = await Certificate.query()
            .where('user_id', userInfo.user_id)
            .andWhere('pathway_code', 'TCBPI');

          progressInfo.userResults.forEach(userResult => {
            coursePrg[userResult.name] = userResult.courseProgressBar;
            for (let course in userResult.mcqs) {
              coursePrg[`${course}`] = userResult.mcqs[course];
            }
          });

          outcomes.push({
            Zone: userInfo.zone,
            Teacher_name: userD2[0].name,
            Teacher_ID: userInfo.teacher_id,
            School_Name: userInfo.school_name,
            School_ID: userInfo.school_id,
            Gmail_ID: userD2[0].email,
            Class: userInfo.class_of_teacher,
            Module_completion: `${parseInt(progressInfo.overallProgress)}%`,
            ...coursePrg,
            Certificate: cert.length > 0 ? 'Yes' : 'No',
            user_id: userInfo.user_id,
          });
        }
      }
      return [null, outcomes];
    } catch (err) {
      return [errorHandler(err)];
    }
  }

  async DataLoaderSheetOBJNew(user, pathwayCourses, total_assessmentIds) {
    try {
      const { Certificate, assessmentsHistory, CourseCompletionV3, PathwayCompletionV2 } = this.server.models();
      let finalData = {};
      finalData = user;

      let totaProgresOfPathway = await PathwayCompletionV2.query()
        .where('user_id', user.user_id)
        .andWhere('pathway_id', 10);
      if (totaProgresOfPathway.length > 0) {
        finalData["Module_completion"] = totaProgresOfPathway[0].percentage + "%";
      }
      else {
        finalData["Module_completion"] = 0 + "%";
      }

      for (let data of pathwayCourses) {
        let courseName = data.name.toLowerCase().replace(/\s+/g, '_');
        let rightAns;
        let TotalQues = data.ass_slug_ids.length;
        let rightAnswer = await assessmentsHistory.query()
          .where('user_id', user.user_id)
          .whereIn('slug_id', data.ass_slug_ids)
          .count();
        if (rightAnswer.length > 0) {
          rightAns = parseInt(rightAnswer[0].count);
        } else {
          rightAns = 0;
        }

        let percent = (rightAns / TotalQues) * 100;
        if (percent >= 80){
          finalData['complete_status'] = 'successfully completed'
        }else{
          finalData['complete_status'] = 'partially completed'
        }

        let courseData = await CourseCompletionV3.query()
          .where('user_id', user.user_id)
          .andWhere('course_id', data.id);
        if (courseData.length > 0) {
          finalData[courseName] = courseData[0].percentage + "%";
        } else {
          finalData[courseName] = 0 + "%";
        }
      }

      finalData["totalQuestions"] = total_assessmentIds.length;
      let attemptedQuestions;
      let correctAnswers;
      let wrongAnswers;
      let totalAssData = await assessmentsHistory.query()
        .where('user_id', user.user_id)
        .whereIn('slug_id', total_assessmentIds)
        .count();
      if (totalAssData.length > 0) {
        attemptedQuestions = parseInt(totalAssData[0].count);
      } else {
        attemptedQuestions = 0;
      }

      let totalCorrectData = await assessmentsHistory.query()
        .where('user_id', user.user_id)
        .andWhere('status', 'Pass')
        .whereIn('slug_id', total_assessmentIds)
        .count();
      if (totalCorrectData.length > 0) {
        correctAnswers = parseInt(totalCorrectData[0].count);
      }
      else {
        correctAnswers = 0;
      }

      wrongAnswers = attemptedQuestions - correctAnswers;
      finalData["attemptedQuestions"] = attemptedQuestions;
      finalData["correctAnswers"] = correctAnswers;
      finalData["wrongAnswers"] = wrongAnswers;

      const cert = await Certificate.query()
        .where('user_id', user.user_id)
        .andWhere('pathway_code', 'TCBPI');

      let date = new Date();
      let dateStr = date.toISOString().split('T');
      finalData["Certificate"] = cert.length > 0 ? 'Yes' : 'No';
      finalData["SheetUpdatedOn"] = dateStr[0];

      return [null, finalData];
    } catch (err) {
      return [errorHandler(err)];
    }
  }

  async insertIntoCSV(outcomes) {
    try {
      
      const csvWriter = createCsvWriter({
        path: '1359_mcdigital_teachers_progress.csv',
        header: [
          { id: 'user_id', title: 'User ID' },
          { id: 'zone', title: 'Zone' },
          { id: 'school_name', title: 'School Name' },
          { id: 'teacher_name', title: 'Teacher Name' },
          { id: 'school_id', title: 'School ID' },
          { id: 'teacher_id', title: 'Teacher ID' },
          { id: 'class_of_teacher', title: 'Class of Teacher'},
          { id: 'phone_number', title: 'Phone Number' },
          { id: 'email', title: 'Email'},
          { id: 'Module_completion', title: 'Module Completion' },
          { id: 'complete_status', title: 'Complete Status' },
          { id: 'scratch_jr', title: 'Scratch JR' },
          { id: 'google_form', title: 'Google Forms' },
          { id: 'ms_word', title: 'MS Word' },
          { id: 'ms_excel', title: 'MS Excel' },
          { id: 'totalQuestions', title: 'Total Questions' },
          { id: 'attemptedQuestions', title: 'Attempted Questions' },
          { id: 'correctAnswers', title: 'Correct Answers' },
          { id: 'wrongAnswers', title: 'Wrong Answers' },
          { id: 'Certificate', title: 'Certificate' },
          { id: 'SheetUpdatedOn', title: 'Sheet Updated On' },
        ],
      });

      await csvWriter.writeRecords(outcomes);
      return [null, 'Data inserted successfully in CSV file'];
    } catch (err) {
      return [errorHandler(err)];
    }
  }

  async insertNewUsersIntoCSV(outcomes) {
    try {
      const csvWriter = createCsvWriter({
        path: '1359_last_week_users_login.csv',
        header: [
          { id: 'user_id', title: 'User ID' },
          { id: 'zone', title: 'Zone' },
          { id: 'school_name', title: 'School Name' },
          { id: 'teacher_name', title: 'Teacher Name' },
          { id: 'school_id', title: 'School ID' },
          { id: 'teacher_id', title: 'Teacher ID' },
          { id: 'class_of_teacher', title: 'Class of Teacher'},
          { id: 'phone_number', title: 'Phone Number' },
          { id: 'email', title: 'Email'},
          { id: 'Module_completion', title: 'Module Completion' },
          { id: 'complete_status', title: 'Complete Status' },
          { id: 'scratch_jr', title: 'Scratch JR' },
          { id: 'google_form', title: 'Google Forms' },
          { id: 'ms_word', title: 'MS Word' },
          { id: 'ms_excel', title: 'MS Excel' },
          { id: 'totalQuestions', title: 'Total Questions' },
          { id: 'attemptedQuestions', title: 'Attempted Questions' },
          { id: 'correctAnswers', title: 'Correct Answers' },
          { id: 'wrongAnswers', title: 'Wrong Answers' },
          { id: 'Certificate', title: 'Certificate' },
          { id: 'SheetUpdatedOn', title: 'Sheet Updated On' },
        ],
      });

      await csvWriter.writeRecords(outcomes);
      return [null, 'Data inserted successfully in CSV file'];
    } catch (err) {
      return [errorHandler(err)];
    }
  }

  async getLastWeekLoggedInTeachers() {
    let { TeacherCapacityBuilding, User } = this.server.models();
    try {
      let lastWeekDate = new Date();
      lastWeekDate.setDate(lastWeekDate.getDate() - 7);
      let lastWeekDateStr = lastWeekDate.toISOString().split('T')[0];
      let lastWeekData = await User.query().select().where('created_at', '>=', lastWeekDateStr);
      if (lastWeekData !== null && lastWeekData !== undefined) {
        let userIDs = lastWeekData.map(person => person.id);
        let finalData = await TeacherCapacityBuilding.query().select().whereIn('user_id', userIDs);
        if (finalData.length > 0) {
          return [null, finalData];
        }
        else{
          let output = [];
          output.push({ message: `There have been no users who logged in since last week ${lastWeekDateStr}`});
          const csvWriter = createCsvWriter({
            path: '1359_last_week_users_login.csv',
            header: [
              { id: 'message', title: 'Message' },
            ],
          });
          await csvWriter.writeRecords(output);
          output = [];
          return [null, output];
        }
      }

      return [null, finalData];
    } catch (err) {
      return [errorHandler(err)];
    }
  }

  async countTeachers() {
    let { TeacherCapacityBuilding } = this.server.models();
    try {
      let newData = await TeacherCapacityBuilding.query().count()
      // convert the values of the object to integers
      return [null, newData[0]];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};