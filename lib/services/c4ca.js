const Schmervice = require('schmervice');
const AWS = require('aws-sdk');
// const S3 = new AWS.S3();
const { v4: uuidv4 } = require('uuid');
const JWT = require('jsonwebtoken');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const CONFIG = require('../config');
const CONSTANTS = require('../config/index');



// Make sure to replace 'your-s3-bucket-name' with your actual S3 bucket name



module.exports = class C4caService extends Schmervice.Service {
  async setTeacherProfile(data, user_id, profileImage) {
    const { C4caTeachers } = this.server.models();
    try {
      const existingRecord = await C4caTeachers.query().where('user_id', user_id);
      if (existingRecord.length > 0) {
        return [null, existingRecord];
      }
      const existingTeacher = await C4caTeachers.query().where('email', data.email);
      if (existingTeacher.length > 0) {
        return [null, existingTeacher];
      }
      // Upload the profile image to S3
     
   
      const C4caTeacher = await C4caTeachers.query().insert(finalData);
      return [null, C4caTeacher];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async createTeam(data, user_id) {
    const { C4caTeachers, C4caTeams } = this.server.models();
    try {
      const existingRecord = await C4caTeachers.query().where('user_id', user_id).first();
      if (existingRecord.length <= 0) {
        return [null, { msg: 'teacher not found' }];
      }
      const finalData = {
        ...data,
        login_id: data.team_name.toLowerCase(),
        password: `${data.team_name}_${Math.random().toString(36).slice(-4)}`,
        teacher_id: existingRecord.id,
      };
      const c4caTeam = await C4caTeams.query().insert(finalData);
      return [null, c4caTeam];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async deleteTeam(team_id) {
    const { C4caTeams } = this.server.models();
    try {
      const team = await C4caTeams.query().delete().where('id', team_id);
      return [null, team];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeamsByTeacherId(teachers_id) {
    const { C4caTeams } = this.server.models();
    try {
      const teams = await C4caTeams.query().where('teacher_id', teachers_id);
      return [null, teams];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async updateTeacherProfile(data, teacher_id, user_id) {
    const { C4caTeachers } = this.server.models();
    try {
      const existingRecord = await C4caTeachers.query().where('user_id', user_id);
      if (existingRecord.length <= 0) {
        return [null, { msg: 'teacher not found' }];
      }
      const finalData = {
        ...data,
        user_id,
      };
      const C4caTeacher = await C4caTeachers.query().update(finalData).where('id', teacher_id);
      return [null, C4caTeacher];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async deleteTeacherProfile(teacher_id, user_id) {
    const { C4caTeachers, User } = this.server.models();
    try {
      const C4caTeacher = await C4caTeachers.query().delete().where('id', teacher_id);
      return [null, C4caTeacher];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeamByTeamId(team_id) {
    const { C4caTeams } = this.server.models();
    try {
      console.log(team_id);
      const team = await C4caTeams.query().where('id', team_id).first();
      console.log(team);
      return [null, team];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async updateTeamById(data, team_id) {
    const { C4caTeams } = this.server.models();
    try {
      const team = await C4caTeams.query().where('id', team_id).first();
      if (!team) {
        return [null, { msg: 'team not found' }];
      }
      const finalData = {
        ...data,
        login_id: team.login_id,
        password: team.password,
        teacher_id: team.teacher_id,
      };
      const updatedTeam = await C4caTeams.query().update(finalData).where('id', team_id);
      return [null, updatedTeam];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeacherData(user_id) {
    const { C4caTeachers } = this.server.models();
    try {
      const teacher = await C4caTeachers.query().where('user_id', user_id).first();
      if (!teacher) {
        return [null, { msg: 'first you create teacher' }];
      }
      return [null, teacher];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async addStudentsToTeam(data, user_id, team_id) {
    const { C4caStudents, C4caTeachers } = this.server.models();
    try {
      const teacher = await C4caTeachers.query().where('user_id', user_id).first();
      const teacher_id = teacher.id;
      console.log(teacher_id), '11111111';
      for (const student of data.team_members) {
        const finalData = {
          ...student,
          team_id: data.team_id,
          teacher_id,
        };
        const team = await C4caTeams.query().where('id', team_id).first();

        if (!team) {
          return [null, { msg: 'team not found', code: 404 }];
        }
        const members = await C4caStudents.query().insert(finalData);
      };
      return [null, 'members added'];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async deleteStudentByTeamId(team_id) {
    const { C4caStudents } = this.server.models();
    try {
      const student = await C4caStudents.query().delete().where('team_id', team_id);
      return [null, student];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  
  async uploadProject(payload) {
    console.log(payload,"112121")
    co
      console.log(uploadParams,"uploadParams")
  
      const uploaded = await s3.upload(uploadParams).promise();
      console.log(uploaded,"7888888888888")
  
      if (uploaded.Location) {
        const projectDetail = {
          project_title: payload.project_title,
          project_summary: payload.project_summary,
          project_uploadFile_url: uploaded.Location,
          date: new Date(),
          teacher_id: 5, // Change this to your desired teacher_id
          team_id: payload.team_id,
        };
        console.log(projectDetail,'projectDetail')
  
        const store = await C4caStudentsProjectDetail.query().insert(projectDetail);
        store.scratch_url = `https://www.scratch.merakilearn.org/projects/${store.id}`;
  
        return store;
      } else {
        // Handle S3 upload failure
        throw new Error('S3 upload failed');
      }
    } catch (error) {
      // Handle and log any errors
      console.error(error);
      throw error;
    }
  }
  

  






  




  
