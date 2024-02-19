/* eslint-disable prettier/prettier */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-shadow */
/* eslint-disable eqeqeq */
/* eslint-disable prefer-const */
/* eslint-disable no-else-return */
const Schmervice = require('schmervice');
const XLSX = require('xlsx');
const { errorHandler } = require('../errorHandling');
const fs = require('fs');

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

  // for getting teachers details of TCBPI pathway
  async getTeacherCapacityBuilding() {
    let { TeacherCapacityBuilding, Certificate } = this.server.models();
    try {
      let newData = await TeacherCapacityBuilding.query().select();
      let userIDs = newData.map(person => person.user_id);
      let cert = await Certificate.query().select().whereIn('user_id', userIDs).andWhere('pathway_code', 'TCBPI');
      let finalData = [];
      newData.map(data => {
        var userConf = {};
        userConf.user_id = data.user_id;
        userConf.name = data.teacher_name;
        userConf.email = data.email;
        userConf.school_name = data.school_name;
        userConf.school_id = data.school_id;
        userConf.class_of_teacher = data.class_of_teacher;
        userConf.zone = data.zone;
        userConf.certificate = 'No';
        cert.map(certificate => {
          if (certificate.user_id === data.user_id) {
            userConf.certificate = 'Yes';
          }
        });
        if (userConf.user_id) {
          finalData.push(userConf);
        }
      });

      // Convert finalData to CSV format
      let csvContent = "user_id,name,email,school_name,school_id,class_of_teacher,zone,certificate\n";
      finalData.forEach(data => {
        const schoolName = data.school_name.replace(/,/g, ' ');
        csvContent += `${data.user_id},"${data.name}","${data.email}","${schoolName}",${data.school_id},"${data.class_of_teacher}","${data.zone}","${data.certificate}"\n`;
      });

      // Write CSV content to a file
      fs.writeFileSync('teachers_detail.csv', csvContent, 'utf8');

      return [null, finalData];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};