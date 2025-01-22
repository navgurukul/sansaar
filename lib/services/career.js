const Schmervice = require('schmervice');
const JWT = require('jsonwebtoken');
const AWS = require('aws-sdk');
const Strapi = require('strapi-sdk-js');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const CONFIG = require('../config');
const { UTCToISTConverter } = require('../helpers/index');

const CONSTANTS = require('../config/index');

const S3Bucket = new AWS.S3({
  accessKeyId: CONSTANTS.auth.c4ca.c4caS3SecretKeyId,
  secretAccessKey: CONSTANTS.auth.c4ca.c4caS3SecretAccessKey,
  Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
});
const { C4CA_PATHWAY_ID } = process.env;

const strapi = new Strapi({
  url: process.env.STRAPI_URL,
});

module.exports = class CareerService extends Schmervice.Service {
  // up
  async setTeacherProfile(profile_obj, data, user_id, cluster_manager_id) {
    const { CareerTeachers, User } = this.server.models();
    try {
      const existingRecord = await CareerTeachers.query().where('user_id', user_id);
      if (existingRecord.length > 0) {
        return [null, existingRecord];
      }
      if (typeof profile_obj === 'object') {
        const key = `career-teacher-profile/${user_id}.png`;
        const uploadParams = {
          Bucket: CONSTANTS.auth.career.s3Bucket,
          Key: key,
          Body: profile_obj._data,
          ContentType: profile_obj.hapi.headers['content-type'],
        };
        const uploader = S3Bucket.upload(uploadParams);
        const uploaded = await uploader.promise();
        const profile_url = `https://${CONSTANTS.auth.career.s3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
        data.profile_url = profile_url;
      }
      const finalData = {
        ...data,
        user_id,
        cluster_manager_id,
      };
      const CareerTeacher = await CareerTeachers.query().insert(finalData);
      return [null, CareerTeacher];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async createTeam(data, user_id) {
    const { CareerTeachers, CareerTeams } = this.server.models();
    try {
      if (data.team_size !== data.team_members.length)
        return [{ message: 'team size and team members count is not equal' }, null];
      const existingRecord = await CareerTeachers.query().where('user_id', user_id).first();
      if (existingRecord.length <= 0) {
        return [{ message: 'teacher not found' }, null];
      }
      const checkTeamName = await CareerTeams.query().where('team_name', data.team_name).first();
      if (checkTeamName) {
        return [{ message: 'team name already exists' }, null];
      }
      const finalData = {
        name: data.team_name,
        team_size: data.team_size,
        login_id: data.team_name.replace(/\s+/g, '').toLowerCase(),
        password: `${data.team_name.replace(/\s+/g, '')}_${Math.random().toString(36).slice(-4)}`,
        career_teacher_id: existingRecord.id,
        state: data.state,
        district: data.district,
        school: data.school,
      };
      const newTeam = await CareerTeams.query().insert(finalData);
      return [null, newTeam];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async deleteTeam(team_id) {
    const { CareerTeams } = this.server.models();
    try {
      const team = await CareerTeams.query().delete().where('id', team_id);
      return [null, team];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeamsByTeacherId(teachers_id) {
    const { CareerTeams } = this.server.models();
    try {
      const teams = await CareerTeams.query().where('career_teacher_id', teachers_id).orderBy('id', 'desc');
      if (!teams || teams.length <= 0) {
        return [{ message: 'No teams found' }, null];
      }

      return [null, teams];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  // up
  async updateTeacherProfile(data, teacher_id, user_id) {
    const { CareerTeachers } = this.server.models();
    try {
      const existingRecord = await CareerTeachers.query().where('user_id', user_id);
      if (existingRecord.length <= 0) {
        return [null, { msg: 'teacher not found' }];
      }
      const { profile_url } = data;
      if (profile_url != undefined && profile_url != null) {
        const key = `career-teacher-profile`;
        const uploadParams = {
          Bucket: CONSTANTS.auth.career.s3Bucket,
          Key: key,
          Body: profile_url._data,
          ContentType: profile_url.hapi.headers['content-type'],
        };
        const uploader = S3Bucket.upload(uploadParams);
        const uploaded = await uploader.promise();
        const p_url = `https://${CONSTANTS.auth.career.s3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
        data.profile_url = p_url;
      }
      const finalData = {
        ...data,
        user_id,
      };
      const C4caTeacher = await CareerTeachers.query().update(finalData).where('id', teacher_id);
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
    const { CareerTeachers } = this.server.models();
    try {
      let boolResponse = false;
      const teacher = await CareerTeachers.query().where('user_id', user_id);

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
    const { CareerTeachers, User, UserRole, CareerStudents, CareerTeams } = this.server.models();
    try {
      // const role = await UserRole.query().where('user_id', user_id).andWhere('role', 'admin');
      // if (role.length == 0) {
      //   return [{ message: 'You are not admin' }];
      // }
      const teacher_Data = await CareerTeachers.query().where('id', teacher_id);
      if (teacher_Data.length > 0) {
        const team_data = await CareerTeams.query().where('teacher_id', teacher_id);
        if (team_data.length != 0) {
          const deleteStudent = await CareerStudents.query().where('teacher_id', teacher_id).del();
          const deleteTeam = await CareerTeams.query().where('teacher_id', teacher_id).del();
          const deleteTeacher = await CareerTeachers.query().where('id', teacher_id).del();
          const deleteUserRole = await UserRole.query().where('user_id', user_id).andWhere('role', 'careerteacher').del();
          return [
            null,
            {
              msg: 'Teacher profile deleted successfully',
              deleteTeacher,
              deleteTeam,
              deleteStudent,
              deleteUserRole,
            },
          ];
        }
        const deleteUserRole = await UserRole.query().where('user_id', user_id).andWhere('role', 'careerteacher').del();
        const deleteTeacher = await CareerTeachers.query().where('id', teacher_id).del();
        return [
          null,
          {
            msg: 'Teacher profile deleted successfully',
            deleteTeacher,
            deleteUserRole,
          },
        ];
      }
      return [null, { message: 'Teacher not found' }];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  // up
  async getTeamByTeamId(team_id) {
    const { CareerTeams, CareerStudents } = this.server.models();
    try {
      const team = await CareerTeams.query()
        .where('id', team_id)
        .first()
        .withGraphFetched('teacher_relationship')
        .withGraphFetched('team_members');
      if (!team || team.length <= 0) {
        return [{ message: 'team_id not found' }, null];
      }
      const responese = {
        team_id: team.id,
        team_name: team.team_name,
        team_size: team.team_size,
        login_id: team.login_id,
        password: team.password,
        teacher_name: team.teacher_relationship[0].name,
        teacher_email: team.teacher_relationship[0].email,
        teacher_phone: team.teacher_relationship[0].phone,
        school: team.school,
        state: team.state,
        district: team.district,
        team_members: member,
      };
      return [null, responese];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async updateTeamById(data, team_id) {
    const { CareerTeams, CareerStudents } = this.server.models();
    try {
      const team = await CareerTeams.query().where('id', team_id).first();
      if (!team) {
        return [{ message: 'team_id not found' }, null];
      }
      let member;
      let deleteStudent;
      if (data.team_size || data.team_members) {
        if (data.team_size && data.team_members) {
          if (data.team_size !== data.team_members.length) {
            return [{ message: 'team size and team members count is not equal' }, null];
          }
          const { teacher_id } = team;
          const updateStudent = [];
          for (const student of data.team_members) {
            const finalData = {
              ...student,
              team_id,
              teacher_id,
            };
            updateStudent.push(finalData);
          }
          deleteStudent = await CareerStudents.query().where('team_id', team_id).del();
          member = await CareerStudents.query().insert(updateStudent);
        } else {
          return [{ message: 'team size and team members required' }, null];
        }
      }
      if (data.team_name) {
        const updateTeamName = await CareerTeams.query().where('id', team_id).patch({
          team_name: data.team_name,
        });
      }
      const team_data = await CareerTeams.query().where('id', team_id).first();
      member = await CareerStudents.query().where('team_id', team_id);

      return [null, { ...team_data, team_members: member }];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeacherData(user_id) {

    const { CareerTeachers, UserRole } = this.server.models();
    try {
      const roles = await UserRole.query().where('user_id', user_id);

      const teacherRole = roles.find((role) => role.role === 'careerTeacher');
      if (teacherRole) {
        const teacher = await CareerTeachers.query().where('user_id', user_id).first();
        if (teacher) {
          return [null, teacher];
        } else {
          return [null, null];
        }
      } else if (roles.length > 0) {
        // Handle other roles
        const otherRoles = roles.map((role) => role.role).join(', '); // Get other roles
        return [null, `User has roles: ${otherRoles}`];
      } else {
        return [null, null];
      }
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }


  async addStudentsToTeam(data, teacher_id, team_id) {
    const { CareerStudents } = this.server.models();
    try {
      const resp_ = [];
      if (data.team_members.length !== data.team_size) {
        return [null, { msg: 'team size and team members count is not equal' }];
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const student of data.team_members) {
        const finalData = {
          ...student,
          career_team_id: team_id,
          career_teacher_id: teacher_id,
        };
        // eslint-disable-next-line no-await-in-loop
        const member = await CareerStudents.query().insert(finalData);
        resp_.push({ name: member.name, class: member.class });
      }
      return [null, resp_];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async loginTeam(data) {
    const { CareerTeams } = this.server.models();
    try {
      const team = await CareerTeams.query()
        .where('login_id', data.login_id)
        .andWhere('password', data.password)
        .first();
      if (team) {
        await CareerTeams.query().patch({ last_login: new Date() }).where('id', team.id);
      }
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


  async getTeachersDataBy(manager_id) {
    const { CareerTeachers } = this.server.models();
    try {
      const teachers = await CareerTeachers.query()
        .throwIfNotFound()
        .where('cluster_manager_id', admin_id);
      return [null, teachers];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeachersByFacilitator(manager_id, page, limit = 10) {
    const {
      CareerTeachers,
      C4caTeams,
      C4caStudents,
      Facilitator,
      C4caPartners,
    } = this.server.models();
    try {
      const teachers = await CareerTeachers.query()
        .where('cluster_manager_id', manager_id)
        .offset((page - 1) * limit)
        .limit(limit);

      const totalTeachersDetails = [];
      for (const data of teachers) {
        const number_of_students = 0;
        const number_of_teams = 0;
        const teamsDetails = await C4caTeams.query().where('teacher_id', data.id);
        const teamsIds = teamsDetails.map((team) => team.id);
        const studentsDetails = await C4caStudents.query().whereIn('team_id', teamsIds);
        data.number_of_teams = teamsDetails.length;
        data.number_of_students = studentsDetails.length;
        totalTeachersDetails.push(data);
      }
      const combinedData = {
        ...partner_name,
        ...partner_id,
        ...facilitator_details,
        teachersDetails: totalTeachersDetails,
      };
      return [null, combinedData];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }


  // including all teams of the teacher
  async getTeacherById(teachers_id) {
    const { ClusterManager, CareerTeachers } = this.server.models();
    try {
      const teachersDetails = await CareerTeachers.query()
        .where('id', teachers_id)
        .withGraphFetched('teams_data')
        .first();
      console.log(teachersDetails, 'teachersDetails');
      if (!teachersDetails || teachersDetails === undefined) {
        return [{ message: 'Teacher not found' }, null];
      }

      return [null, teachersDetails];

    } catch (error) {
      console.log(error, '--error');
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }
};
