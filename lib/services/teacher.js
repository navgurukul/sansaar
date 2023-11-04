/* eslint-disable class-methods-use-this */
/* eslint-disable prettier/prettier */
/* eslint-disable no-shadow */
/* eslint-disable eqeqeq */
/* eslint-disable prefer-const */
/* eslint-disable no-else-return */
const Schmervice = require('schmervice');
const XLSX = require('xlsx');
const { errorHandler } = require('../errorHandling');

module.exports = class teacherService extends Schmervice.Service {

  async createTeacherCapacityBuilding(data) {
    let { TeacherCapacityBuilding } = this.server.models();
    try {
      let newData = await TeacherCapacityBuilding.query().select().where('user_id', data.user_id)

      if (newData.length == 0 ) {
        let newData = await TeacherCapacityBuilding.query().insert(data)
        return [null, { status: 'sucessfully', data: newData }]
      } else {
        return [{ error: true, message: 'you allready give the data', code: 403 },null]
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
          message: `Fill the form 'User_id' : ${user_id} data does not exist in the teacher capacity building`,code:403,
        },null];
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

  async TeacherCapacityBuildingTotalUsersID(){
    let { TeacherCapacityBuilding } = this.server.models();
    try{
      let TCBData = await TeacherCapacityBuilding.query().select()
      let userIDs = TCBData.map(person =>  person.user_id);

      return [null,userIDs,TCBData]
    } catch (err){
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
  
          // eslint-disable-next-line no-restricted-syntax
          for (const course of progressInfo.Courses) {
            const course_name = course.name.replace(/ /g, '_');
            const coursePrgKey = `${course_name}_completion`;
            const mcqScoreKey = `${course_name}_MCQ_score`;
  
            coursePrg[coursePrgKey] = course.courseProgressBar;
            coursePrg[mcqScoreKey] = course.mcqs.correctAnswers;
          }

          // eslint-disable-next-line no-await-in-loop
          const userD2 = await User.query().where('id', userInfo.user_id);
          // eslint-disable-next-line no-await-in-loop
          const cert = await Certificate.query()
            .where('user_id', userInfo.user_id)
            .andWhere('pathway_code', 'TCBPI');
  
          outcomes.push({
            Zone: userInfo.zone,
            Teacher_name: userD2[0].name,
            Teacher_ID: userInfo.teacher_id,
            School_Name: userInfo.school_name,
            School_ID: userInfo.school_id,
            Gmail_ID: userD2[0].email,
            Class: userInfo.class_of_teacher,
            module_score: progressInfo.overallProgress,
            Module_completion: `${parseInt(progressInfo.overallProgress)}%`,
            ...coursePrg,
            Certificate: cert.length > 0 ? 'Yes' : 'No',
            user_id: userInfo.user_id,
          });
        }
      } 
      for (let i = 0; i < outcomes.length; i++) {
        outcomes[i].Scratch_JR_MCQ_score = `${outcomes[i].Scratch_JR_MCQ_score}/${assessmentIds[0]}`;
        outcomes[i].Google_Form_MCQ_score = `${outcomes[i].Google_Form_MCQ_score}/${assessmentIds[1]}`;
        outcomes[i].MS_Word_MCQ_score = `${outcomes[i].MS_Word_MCQ_score}/${assessmentIds[2]}`;
        outcomes[i].MS_Excel_MCQ_score = `${outcomes[i].MS_Excel_MCQ_score}/${assessmentIds[3]}`;
      }
      
      return [null, outcomes];
    } catch (err) {
      return [errorHandler(err)];
    }
  }
};