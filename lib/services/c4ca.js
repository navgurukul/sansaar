const Schmervice = require('schmervice');
const JWT = require('jsonwebtoken');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const CONFIG = require('../config');

const AWS = require('aws-sdk');
const CONSTANTS = require('../config/index');

const S3Bucket = new AWS.S3({
  accessKeyId: CONSTANTS.auth.merakiScratch.scratchS3SecretKeyId,
  secretAccessKey: CONSTANTS.auth.merakiScratch.scratchS3SecretAccessKey,
  Bucket: CONSTANTS.auth.merakiScratch.scratchBucket,
});


module.exports = class C4caService extends Schmervice.Service {
  async setTeacherProfile(profile_obj, data, user_id, partner_id) {
    const { C4caTeachers } = this.server.models();
    try {
      const existingRecord = await C4caTeachers.query().where('user_id', user_id);
      if (existingRecord.length > 0) {
        return [null, existingRecord];
      }
      const key = `c4caProfileUrl`;
      const uploadParams = {
        Bucket: CONSTANTS.auth.merakiScratch.scratchBucket,
        Key: key,
        Body: profile_obj._data,
        ContentType: profile_obj.hapi.headers['content-type'],
      };
      const uploader = S3Bucket.upload(uploadParams);
      const uploaded = await uploader.promise();
      let profile_url = `https://${CONSTANTS.auth.merakiScratch.scratchBucket}.s3.ap-south-1.amazonaws.com/${key}`;
      data.profile_url = profile_url;

      const finalData = {
        ...data,
        user_id,
        partner_id,
      };
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
      if (data.team_size !== data.team_members.length)
        return [{ message: 'team size and team members count is not equal' }, null];
      const existingRecord = await C4caTeachers.query().where('user_id', user_id).first();
      if (existingRecord.length <= 0) {
        return [{ message: 'teacher not found' }, null];
      }
      const finalData = {
        team_name: data.team_name,
        team_size: data.team_size,
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
      const team = await C4caTeams.query().delete().where('id', team_id).returning('*');
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

  async checkIfTeacher(user_id) {
    const { C4caTeachers } = this.server.models();
    try {
      let boolResponse = false;
      const teacher = await C4caTeachers.query().where('user_id', user_id);

      console.log(teacher)
      if (teacher !== null && teacher !== undefined && teacher.length > 0) {
        boolResponse = true;
      }
      return [null, boolResponse];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }


  }

  async getTeamByTeamId(team_id) {
    const { C4caTeams, C4caStudents } = this.server.models();
    try {

      const team = await C4caTeams.query().where('id', team_id).first();
      const students = await C4caStudents.query().where('team_id', team_id)
      team.students = students
      if (team === undefined) return [{ message: 'team not found' }];
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
      return [null, teacher];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async addStudentsToTeam(data, teacher_id, team_id) {
    const { C4caStudents } = this.server.models();
    try {
      const resp_ = [];
      if (data.team_members.length !== data.team_size) {
        return [null, { msg: 'team size and team members count is not equal' }];
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const student of data.team_members) {
        const finalData = {
          ...student,
          team_id,
          teacher_id,
        };
        // eslint-disable-next-line no-await-in-loop
        const member = await C4caStudents.query().insert(finalData);
        resp_.push({ name: member.name, class: member.class });
      }
      return [null, resp_];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  // async uploadProject(file, team_id) {
  //   const { C4caStudentsProjectDetail } = this.server.models();
  //   const key = `scratch/${project_id}.sb3`;
  //   const c4caProjects = await c4ca_students_projectDetail.query()
  //     .select('project_name')
  //     .where('project_name', 'LIKE', `%${project_name}%`);
  //   const allProjectsNames = c4caProjects .map(
  //     (project) => project && project.project_name && project.project_name.replace(/\.sb3$/, '')
  //   );
  //   const NewName = this.createNameValidate(project_name, allProjectsNames);
  //   try {
  //     const uploadParams = {
  //       Bucket: CONSTANTS.auth.merakiScratch.scratchBucket,
  //       Key: key,
  //       Body: fileObj._data,
  //       ContentType: fileObj.hapi.headers['content-type'],
  //     };

  //     const uploader = S3Bucket.upload(uploadParams);
  //     const uploaded = await uploader.promise();
  //     const url = `https://${CONSTANTS.auth.merakiScratch.scratchBucket}.s3.ap-south-1.amazonaws.com/${key}`;
  //     const store = await c4caProject.query().insert({
  //       project_id,
  //       url,
  //       team_id,
  //       project_name: `${NewName}.sb3`,
  //     });
  //     store.userId = userId_scratch;
  //     store.scratch_url = `https://www.scratch.merakilearn.org/projects/${project_id}`;
  //     return [null, store];
  //   } catch (e) {
  //     return [errorHandler(e), null];
  //   }

  // }

  async loginTeam(data) {
    const { C4caTeams } = this.server.models();
    try {
      const team = await C4caTeams.query()
        .where('login_id', data.login_id)
        .andWhere('password', data.password)
        .first();
      return [null, team];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  createToken = (data) => {
    const JWTtoken = JWT.sign({ team_id: data.id, flag: data.flag }, CONFIG.auth.jwt.secret, {
      algorithm: 'HS256',
      expiresIn: CONFIG.auth.jwt.expiresIn,
    });
    return { token: JWTtoken };
  };

  // use this wrapper function to make response structure
  responseWrapper = (data, status) => {
    return {
      status,
      data,
    };
  };
};
