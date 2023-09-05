const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');

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
      data.team_members = JSON.stringify(data.team_members);
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
      data.team_members = JSON.stringify(data.team_members);
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
};
