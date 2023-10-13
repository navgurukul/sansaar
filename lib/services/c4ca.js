const Schmervice = require('schmervice');
const JWT = require('jsonwebtoken');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const CONFIG = require('../config');

module.exports = class C4caService extends Schmervice.Service {
  async setTeacherProfile(data, user_id) {
    const { C4caTeachers } = this.server.models();
    try {
      const existingRecord = await C4caTeachers.query().where('user_id', user_id);
      if (existingRecord.length > 0) {
        return [null, existingRecord];
      }
      const finalData = {
        ...data,
        user_id,
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
      const teacher = await C4caTeams.query().where('teacher_id', teachers_id);
      if (teacher.length <= 0) {
        return [null, { msg: 'teacher not found' }];
      }
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

      const team = await C4caTeams.query().where('id', team_id).first();
      if (!team) {
        return [null, { msg: 'team not found' }];
      }
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
      const teacherData = await C4caTeachers.query().where('user_id', user_id).first();
      if (!teacherData) {
        return [null, { msg: 'teacher not found' }];
      }
      const teacher = await C4caTeachers.query().where('user_id', user_id).first();
      return [null, teacher];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async addStudentsToTeam(data, user_id) {
    const { C4caStudents, C4caTeachers, C4caTeams } = this.server.models();
    try {
      const teacher = await C4caTeachers.query().where('user_id', user_id);
      if (teacher.length <= 0) {
        return [null, { msg: 'teacher not found' }];
      }
      const teacher_id = teacher[0].id;
      const existingRecord = await C4caStudents.query().where('team_id', data.team_id);
      if (existingRecord.length > 0) {
        return [null, { msg: 'team already exists' }];
      }
      const existingTeam = await C4caTeams.query().where('id', data.team_id);
      if (existingTeam.length <= 0) {
        return [null, { msg: 'team not found' }];
      }
      const teamSize = existingTeam[0].team_size; // Get the specified team size
  
      if (teamSize !== data.team_members.length) {
        return [null, { msg: 'team size does not match specified size' }];
      }
  
      for (const student of data.team_members) {
        const finalData = {
          ...student,
          team_id: data.team_id,
          teacher_id,
        };
        await C4caStudents.query().insert(finalData);
      }
      return [null, 'Members added'];
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

  async loginTeam(data) {
    const { C4caTeams } = this.server.models();
    try {
      const teacher = await C4caTeams.query()
        .where('login_id', data.login_id)
        .andWhere('password', data.password)
        .first();
      return [null, teacher];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  createToken = (data) => {
    const JWTtoken = JWT.sign({ teamId: data.id, loginId: data.login_id }, CONFIG.auth.jwt.secret, {
      algorithm: 'HS256',
      expiresIn: CONFIG.auth.jwt.expiresIn,
    });
    return { token: JWTtoken };
  };
};
