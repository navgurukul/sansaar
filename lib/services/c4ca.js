const Schmervice = require('schmervice');
const JWT = require('jsonwebtoken');
const AWS = require('aws-sdk');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const CONFIG = require('../config');

const CONSTANTS = require('../config/index');

const S3Bucket = new AWS.S3({
  accessKeyId: CONSTANTS.auth.c4ca.c4caS3SecretKeyId,
  secretAccessKey: CONSTANTS.auth.c4ca.c4caS3SecretAccessKey,
  Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
});

module.exports = class C4caService extends Schmervice.Service {
  async setTeacherProfile(profile_obj, data, user_id, partner_id) {
    const { C4caTeachers, UserRole, User } = this.server.models();
    try {
      await User.query().where('id', user_id).update({ partner_id }); // remove this line when partner url gets fix and user model as well
      const existingRecord = await C4caTeachers.query().where('user_id', user_id);
      if (existingRecord.length > 0) {
        return [null, existingRecord];
      }
      const key = `c4caProfileUrl`;
      const uploadParams = {
        Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
        Key: key,
        Body: profile_obj._data,
        ContentType: profile_obj.hapi.headers['content-type'],
      };
      const uploader = S3Bucket.upload(uploadParams);
      const uploaded = await uploader.promise();
      const profile_url = `https://${CONSTANTS.auth.c4ca.c4caS3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
      data.profile_url = profile_url;

      const finalData = {
        ...data,
        user_id,
        partner_id,
      };
      const C4caTeacher = await C4caTeachers.query().insert(finalData);
      await UserRole.query().insert({
        user_id,
        role: 'c4caTeacher',
      });
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
      const { profile_url } = data;
      if (profile_url != undefined && profile_url != null) {
        const key = `c4caProfileUrl`;
        const uploadParams = {
          Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
          Key: key,
          Body: profile_url._data,
          ContentType: profile_url.hapi.headers['content-type'],
        };
        const uploader = S3Bucket.upload(uploadParams);
        const uploaded = await uploader.promise();
        const p_url = `https://${CONSTANTS.auth.c4ca.c4caS3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
        data.profile_url = p_url;
      }
      const finalData = {
        ...data,
        user_id,
      };
      const C4caTeacher = await C4caTeachers.query().update(finalData).where('id', teacher_id);
      const newUpdate = {
        count: C4caTeacher,
        ...finalData,
      };
      return [null, newUpdate];
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

      console.log(teacher);
      if (teacher !== null && teacher !== undefined && teacher.length > 0) {
        boolResponse = true;
      }
      return [null, boolResponse];
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
    const { C4caTeams, C4caStudents, C4caTeachers } = this.server.models();
    try {

      const team = await C4caTeams.query().where('id', team_id).first().withGraphFetched('teacher_relationship');
      if (team === undefined) return [{ message: 'team not found' }];
      const member = await C4caStudents.query().where('team_id', team.id);
      team.team_members = member;
      const responese = {
        team_name: team.team_name,
        team_size: team.team_size,
        teacher_name: team.teacher_relationship[0].name,
        teacher_email: team.teacher_relationship[0].email,
        teacher_phone: team.teacher_relationship[0].phone,
        school: team.teacher_relationship[0].school,
        state: team.teacher_relationship[0].state,
        district: team.teacher_relationship[0].district,
        team_members: member,
      }
      return [null, responese];
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

  // create facilitator
  async createFacilitator(facilitatorData) {
    const { Facilitator } = this.server.models();
    try {
      const checkFacilitator = await Facilitator.query().where('email', facilitatorData.email);
      if (checkFacilitator.length > 0) {
        return [null, {
          error: `true`,
          message: `facilitator already exist with email ${checkFacilitator[0].email}.`,
          code: 403,
        }]
      } else {
        const facilitator = await Facilitator.query().insert(facilitatorData);
        return [null, facilitator];
      }
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  // get all facilitator
  async getAllFacilitator(limit, offset) {
    const { Facilitator } = this.server.models();
    try {
      const facilitator = await Facilitator.query().page(offset, limit);
      return [null, facilitator];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  // get facilitator by id
  async getFacilitatorById(id) {
    const { Facilitator } = this.server.models();
    try {
      const facilitator = await Facilitator.query().throwIfNotFound().where('id', id).first();
      return [null, facilitator];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  // update facilitator details by id
  async updateFacilitatorById(facilitatorData, id) {
    const { Facilitator } = this.server.models();
    try {
      await Facilitator.query().throwIfNotFound().where('id', id);
      let checkFacilitator = await Facilitator.query().where('email', facilitatorData.email);
      if (checkFacilitator == null || checkFacilitator == undefined || checkFacilitator.length == 0) {
        const facilitator = await Facilitator.query().update(facilitatorData).where('id', id);
        return [null, 'facilitator updated successfully'];
      }
      else {
        return [null, {
          error: `true`,
          message: `facilitator already exist with email ${checkFacilitator[0].email}. Try with another email !!.`,
          code: 403,
        }]
      }
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  // delete facilitator by id
  async deleteFacilitatorById(id) {
    const { Facilitator } = this.server.models();
    try {
      const facilitator = await Facilitator.query().throwIfNotFound().delete().where('id', id);
      return [null, 'facilitator deleted successfully'];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getFacilitatorByPartnerId(partner_id) {
    const { Facilitator } = this.server.models();
    try {
      const facilitator = await Facilitator.query().throwIfNotFound().where('partner_id', partner_id);
      return [null, facilitator];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeachersDataBy(Facilitator_id) {
    const { C4caTeachers } = this.server.models();
    try {
      const teachers = await C4caTeachers.query().throwIfNotFound().where('facilitator_id', Facilitator_id);
      return [null, teachers];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }
};
