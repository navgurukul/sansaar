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

  async DataLoaderSheetOBJ(usersInfo,usersProgress){ 
    try{
      let outcomes = [];
      for (let i = 0; i < usersInfo.length; i++ ){
        if (usersInfo[i].user_id == usersProgress[i].user_id){
          let correctAnswers = 0; 

          // eslint-disable-next-line no-restricted-syntax
          for (let course of usersProgress[i].Courses){
            correctAnswers += course.mcqs.correctAnswers;
          }
          outcomes.push({
            Zone: usersInfo[i].zone,
            School_Name: usersInfo[i].school_name,
            School_ID: usersInfo[i].school_id, 
            Gmail_ID:usersInfo[i].email,
            Teacher_ID:usersInfo[i].teacher_id,
            Class:usersInfo[i].class_of_teacher,
            module_score:correctAnswers,
            // eslint-disable-next-line radix
            Module_completion: `${parseInt(usersProgress[i].overallProgress ) }%`
          })
        }
      }
      return [null,outcomes]
  } catch (err){
    return [errorHandler(err)];
  }
  }

};
