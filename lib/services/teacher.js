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
const path = require('path');
const fs = require('fs');

module.exports = class teacherService extends Schmervice.Service {
  
  async createTeacherCapacityBuilding(data) {
    data.created_at = new Date();
    const { TeacherCapacityBuilding } = this.server.models();
    const { userService } = this.server.services();

    try {
      const existingData = await TeacherCapacityBuilding.query().select().where('user_id', data.user_id);

      // Return error if user already exists
      if (existingData.length > 0) {
        return [{ error: true, message: `user details already exist for email ${data.email}`, code: 403 }, null];
      }

      // Validation for clerical staff
      if (data.employee_type === 'clerical_staff') {
        if (data.school_name || data.school_id) {
          return [{ error: true, message: 'School name and school id should be NULL', code: 403 }, null];
        }
        if (data.class_of_teacher != null) {
          return [{ error: true, message: 'Class teacher field should be NULL', code: 403 }, null];
        }
      } else {
        // Validation for other employee types
        if (data.school_name == null || data.school_id == null) {
          return [{ error: true, message: 'School name and school id should not be NULL', code: 403 }, null];
        }

        if (['mentor_teacher', 'teacher'].includes(data.employee_type) && data.class_of_teacher == null) {
          return [{ error: true, message: 'Class teacher field should not be NULL', code: 403 }, null];
        }

        if (['school_inspector', 'principal'].includes(data.employee_type) && data.class_of_teacher != null) {
          return [{ error: true, message: 'Class teacher field should be NULL', code: 403 }, null];
        }
      }

      // Update user name and insert new data
      await userService.updateById(data.user_id, { name: data.teacher_name });
      const newData = await TeacherCapacityBuilding.query().insert(data);

      return [null, { status: 'successfully', data: newData }];
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

  async TeacherCapacityBuildingTotalUsersIDNew(page, limit) {    
    let { TeacherCapacityBuilding } = this.server.models();
    try {
      let TCBData = await TeacherCapacityBuilding.query().page(page, limit);

      return [null, TCBData];
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
          finalData[`${courseName}_completion_date`] = courseData[0].percentage === 100 ? courseData[0].complete_at: null;
        } else {
          finalData[courseName] = 0 + "%";
          finalData[`${courseName}_completion_date`]=null;
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
          {id: 'scratch_jr_completion_date', title: 'Scratch JR Completion Date'},
          { id: 'google_form', title: 'Google Forms' },
          {id: 'google_form_completion_date', title: 'Google Forms Completion Date'},
          { id: 'ms_word', title: 'MS Word' },
          {id: 'ms_word_completion_date', title: 'MS Word Completion Date'},
          { id: 'ms_excel', title: 'MS Excel' },
          {id: 'ms_excel_completion_date', title: 'MS Excel Completion Date'},
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

 

  async  getSheetUpdatedColumnData() {
    const filePath1 = '1359_mcdigital_teachers_progress.csv';
    const filePath2 = '1359_last_week_users_login.csv';
  
    if (!fs.existsSync(filePath1)) {
      return [{ error: true, message: 'CSV file not found', code: 404 }, null];
    }
  
    if (!fs.existsSync(filePath2)) {
      return [{ error: true, message: 'CSV file not found', code: 404 }, null];
    }
  
    const readCSVFile = async (filePath) => {
      const results = [];
      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', (err) => reject(err));
      });
    };
  
    try {
      const [file1Data, file2Data] = await Promise.all([readCSVFile(filePath1), readCSVFile(filePath2)]);
      const currentDate = new Date();
  
      // Extracting "Sheet Updated On" from the first file
      const sheetUpdatedOnData = file1Data.length > 0 ? file1Data[0]['Sheet Updated On'] : null;
      const sheetUpdatedOnDate = sheetUpdatedOnData ? new Date(sheetUpdatedOnData) : null;
  
      // Check if the dates were successfully extracted
      if (!sheetUpdatedOnDate) {
        return [{ error: true, message: 'Sheet Updated On column not found in the first file', code: 404 }, null];
      }
  
      // Extracting date from the second file's message
      let lastLoginMessageDate = null;
      let loginMessage = null;
      if (file2Data.length > 0 && file2Data[0].Message) {
        loginMessage = file2Data[0].Message;
        const match = loginMessage.match(/\d{4}-\d{2}-\d{2}/);
        if (match) {
          lastLoginMessageDate = new Date(match[0]);
        }
      }
  
      // Check if second CSV file has the same structure as the first one
      if (file2Data.length > 0 && file2Data[0]['Sheet Updated On']) {
        const sheetUpdatedOnLastWeek = new Date(file2Data[0]['Sheet Updated On']);
        return [null, {
          allUsersDetailUpdatedOn: sheetUpdatedOnDate.toISOString().split('T')[0],
          lastWeekUsersLoginDetailsUpdatedOn: sheetUpdatedOnLastWeek.toISOString().split('T')[0],
          at: '2:30 AM',
        }];
      }
  
      // Calculate the difference in days between current date and the last login message date
      if (!lastLoginMessageDate) {
        return [{ error: true, message: 'No data found in the second file', code: 404 }, null];
      }
  
      const daysDifference = (currentDate - lastLoginMessageDate) / (1000 * 3600 * 24);
      let messageDate;
  
      if (daysDifference <= 7) {
        messageDate = currentDate;
      } else {
        messageDate = new Date(lastLoginMessageDate);
        messageDate.setDate(messageDate.getDate() + 7);
      }
  
      return [null, {
        allUsersDetailUpdatedOn: sheetUpdatedOnDate.toISOString().split('T')[0],
        lastWeekUsersLoginDetailsUpdatedOn: messageDate.toISOString().split('T')[0],
        at: '2:30 AM',
      }];
    } catch (err) {
      return [{ error: true, message: err.message, code: 500 }, null];
    }
  }
  async getTeacherAndCourses(email) {
    try {
      const { TeacherCapacityBuilding } = this.server.models();
      const teacher = await TeacherCapacityBuilding.query().where('email', email).first();
      const filePath = path.resolve(__dirname, '../../data/courses.json'); 
      const fileData = fs.readFileSync(filePath, 'utf8');
      const courses = JSON.parse(fileData);
      let courseDetails;
      if (['principal', 'clerical_staff'].includes(teacher.employee_type)) {
        courseDetails = {
          mandatory_course: courses.principalAndClericalStaff.mandatory_course,
          optional_course: courses.principalAndClericalStaff.optional_course
        };
      } else if (['teacher', 'mentor_teacher', 'school_inspector'].includes(teacher.employee_type)) {
        courseDetails = {
          mandatory_course: courses.teacherAndOthers.mandatory_course,
          optional_course: courses.teacherAndOthers.optional_course
        };
      } else {
        return { error: 'Invalid employee_type' };
      }
      return { teacher, courseDetails };
    } catch (error) {
      return { error: 'Internal server error' };
    }
  }
};

