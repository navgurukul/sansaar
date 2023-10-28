const Schmervice = require('schmervice');
const JWT = require('jsonwebtoken');
const AWS = require('aws-sdk');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const CONFIG = require('../config');
const Strapi = require('strapi-sdk-js');
const { UTCToISTConverter } = require('../helpers/index');

const CONSTANTS = require('../config/index');

const S3Bucket = new AWS.S3({
  accessKeyId: CONSTANTS.auth.c4ca.c4caS3SecretKeyId,
  secretAccessKey: CONSTANTS.auth.c4ca.c4caS3SecretAccessKey,
  Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
});


const strapi = new Strapi({
  url: process.env.STRAPI_URL,
});


module.exports = class C4caService extends Schmervice.Service {
  async setTeacherProfile(profile_obj, data, user_id, partner_id) {
    const { C4caTeachers, User } = this.server.models();
    try {
      await User.query().where('id', user_id).update({ partner_id }); // remove this line when partner url gets fix and user model as well
      const existingRecord = await C4caTeachers.query().where('user_id', user_id);
      if (existingRecord.length > 0) {
        return [null, existingRecord];
      }
      // const filename = `${user_id}_${profile_obj.hapi.filename}`;
      // if (data.profile_link) {
      //   data.profile_url = data.profile_link;
      //   delete data.profile_link;
      // }
      if (typeof profile_obj === 'object') {
        const key = `c4caProfileUrl/${user_id}.png`;
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
      }
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
        state: data.state,
        district: data.district,
        school: data.school,
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

  async getTeamsByTeacherId(teachers_id, pathway_id = 18) {
    const { C4caTeams, PathwayCompletionV2 } = this.server.models();
    try {
      const teams = await C4caTeams.query().where('teacher_id', teachers_id);

      if (teams !== null && teams !== undefined && teams.length > 0) {
        for (const team of teams) {
          const pathway = await PathwayCompletionV2.query()
            .where('team_id', team.id)
            .andWhere('pathway_id', pathway_id);

          let completed_portion = 0;

          if (pathway !== null && pathway !== undefined && pathway.length > 0) {
            completed_portion = pathway[0].percentage;
          }
          team.completed_portion = completed_portion;
        }
      }

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
    const { C4caTeachers, User, UserRole, C4caStudents, C4caTeams } = this.server.models();
    try {
      const role = await UserRole.query().where('user_id', user_id).andWhere('role', 'admin');
      if (role.length == 0) {
        return [{ message: 'You are not admin' }];
      }
      const teacher_Data = await C4caTeachers.query().where('id', teacher_id);
      if (teacher_Data.length > 0) {
        const team_data = await C4caTeams.query().where('teacher_id', teacher_id);
        if (team_data.length != 0) {
          const deleteStudent = await C4caStudents.query().where('teacher_id', teacher_id).del();
          const deleteTeam = await C4caTeams.query().where('teacher_id', teacher_id).del();
          const deleteTeacher = await C4caTeachers.query().where('id', teacher_id).del();
          return [
            null,
            {
              msg: 'Teacher profile deleted successfully',
              deleteTeacher,
              deleteTeam,
              deleteStudent,
            },
          ];
        } else {
          const deleteTeacher = await C4caTeachers.query().where('id', teacher_id).del();
          return [
            null, 
            { 
              msg: 'Teacher profile deleted successfully', 
              deleteTeacher,
            },
          ];
        }
      } else {
        return [null, { message: 'Teacher not found' }];
      }
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeamByTeamId(team_id, pathway_id = 18) {
    const { C4caTeams, C4caStudents, PathwayCompletionV2 } = this.server.models();
    try {
      const team = await C4caTeams.query()
        .where('id', team_id)
        .first()
        .withGraphFetched('teacher_relationship');
      if (team === undefined) return [{ message: 'team not found' }];
      const member = await C4caStudents.query().where('team_id', team.id);

      const pathway = await PathwayCompletionV2.query()
        .where('team_id', team_id)
        .andWhere('pathway_id', pathway_id);

      let completed_portion = 0;

      if (pathway !== null && pathway !== undefined && pathway.length > 1) {
        completed_portion = pathway[0].percentage;
      }

      team.team_members = member;
      const responese = {
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
        completed_portion,
        team_members: member,
      };
      return [null, responese];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async updateTeamById(data, team_id) {
    const { C4caTeams,C4caStudents } = this.server.models();
    try {
      const team = await C4caTeams.query().where('id', team_id).first();
      if (!team) {
        return [null, { msg: 'team_id not found' }];
      }
      const teacher_id = team.teacher_id;
      const updateStudent = [];
      for (const student of data.team_members) {
        const finalData = {
          ...student,
          team_id: team_id,
          teacher_id: teacher_id,
        };
        updateStudent.push(finalData)
      }
      const member = await C4caStudents.query().insert(updateStudent);      
      return [null, {msg:'Data Updated Successfully',student: member}];
      // return [null, {msg:'Data Updated Successfully',data: member}];
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
      if (team) {
        await C4caTeams.query().patch({ last_login: new Date() }).where('id', team.id);
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

  async uploadProjectTopic(file, team_id, project_title, project_summary, is_submitted) {
    const { C4caTeamProjectTopic, C4caTeams } = this.server.models();
    try {
      const existingProject = await C4caTeamProjectTopic.query().where('team_id', team_id).first();

      if (existingProject.is_submitted==true) {
        return [{ message: 'Team has already submitted a project topic' }];
      }
      const team = await C4caTeams.query().where('id', team_id).first();
      if (!team) {
        return [{ message: 'Team not found' }];
      }
      const { team_name } = team;
      let url = '';
      if (file) {
        const key = `c4caUploadTopic`;
        const uploadParams = {
          Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
          Key: key,
          Body: file._data,
          ContentType: file.hapi.headers['content-type'],
        };

        const uploader = S3Bucket.upload(uploadParams);
        const uploaded = await uploader.promise();
        url = `https://${CONSTANTS.auth.c4ca.c4caS3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
      } else {
        url = '';
      }
      const store = await C4caTeamProjectTopic.query()
      .where('team_id', team_id)
      .update({
        project_topic_url: url,
        team_name,
        project_title,
        project_summary,
        created_at: new Date(),
        is_submitted,
      })
      .returning('*');
      return [null, store[0]];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async uploadProjectSubmit(file, team_id, project_link, is_submitted) {
    const { C4caTeamProjectSubmitSolution, C4caTeams } = this.server.models();
    try {
      const existingProject = await C4caTeamProjectSubmitSolution.query()
        .where('team_id', team_id)
        .first();

      if (existingProject.is_submitted==true) {
        return [{ message: 'Team has already submitted a project topic' }];
      }
      const team = await C4caTeams.query().where('id', team_id).first();
      if (!team) {
        return [{ message: 'Team not found' }];
      }
      const { team_name } = team;
      let url = '';
      if (file) {
        const key = `c4caUploadProject`;
        const uploadParams = {
          Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
          Key: key,
          Body: file._data,
          ContentType: file.hapi.headers['content-type'],
        };

        const uploader = S3Bucket.upload(uploadParams);
        const uploaded = await uploader.promise();
        url = `https://${CONSTANTS.auth.c4ca.c4caS3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
      } else {
        url = '';
      }
      const store = await C4caTeamProjectSubmitSolution.query().where('team_id',team_id).update({
        project_file_url: url,
        team_id,
        team_name,
        project_link,
        created_at: new Date(),
        is_submitted,
      }).returning('*');
      return [null, store[0]];
    } catch (e) {
      return [errorHandler(e), null];
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
      const checkFacilitator = await Facilitator.query().where('email', facilitatorData.email);
      if (
        checkFacilitator == null ||
        checkFacilitator == undefined ||
        checkFacilitator.length == 0
      ) {
        const facilitator = await Facilitator.query().update(facilitatorData).where('id', id);
        return [null, 'facilitator updated successfully'];
      }
      return [
        null,
        {
          error: `true`,
          message: `facilitator already exist with email ${checkFacilitator[0].email}. Try with another email !!.`,
          code: 403,
        },
      ];
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
    const { Facilitator, C4caTeachers, C4caTeams, C4caStudents } = this.server.models();
    try {
      const facilitator = await Facilitator.query()
        .throwIfNotFound()
        .where('partner_id', partner_id);

                  let totalFacilitatorsDetails = [];
      for (let data of facilitator) {
        const { id } = data;
        let number_of_students = 0;
          let teachersDetails = await C4caTeachers.query().where('facilitator_id', id);
          let teachersIds = teachersDetails.map((teacher) => teacher.id);
          let teamsDetails = await C4caTeams.query().whereIn('teacher_id', teachersIds);
          let teamsIds = teamsDetails.map((team) => team.id);
          let studentsDetails = await C4caStudents.query().whereIn('team_id', teamsIds);
          data.number_of_students = studentsDetails.length;
          totalFacilitatorsDetails.push(data);
        }

      return [null, totalFacilitatorsDetails];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeachersDataBy(Facilitator_id) {
    const { C4caTeachers } = this.server.models();
    try {
      const teachers = await C4caTeachers.query()
        .throwIfNotFound()
        .where('facilitator_id', Facilitator_id);
      return [null, teachers];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeamsByDistrictOrSchool(district, school, page, limit = 10, pathway_id = 18) {
    const { C4caTeams, C4caTeachers, PathwayCompletionV2 } = this.server.models();
    try {
      let c4caTeams = await C4caTeams.query()
        .offset((page - 1) * limit)
        .limit(limit);

      if (district !== undefined && school !== undefined) {
        c4caTeams = await C4caTeams.query()
          .where('district', district)
          .andWhere('school', school)
          .offset((page - 1) * limit)
          .limit(limit);
      } else if (district !== undefined && school === undefined) {
        c4caTeams = await C4caTeams.query()
          .where('district', district)
          .offset((page - 1) * limit)
          .limit(limit);
      } else if (district === undefined && school !== undefined) {
        c4caTeams = await C4caTeams.query()
          .andWhere('school', school)
          .offset((page - 1) * limit)
          .limit(limit);
      }

      if (c4caTeams !== null && c4caTeams !== undefined && c4caTeams.length > 0) {
        for (const team of c4caTeams) {
          const pathway = await PathwayCompletionV2.query()
            .where('team_id', team.id)
            .andWhere('pathway_id', pathway_id);
          let completed_portion = 0;
          if (pathway !== null && pathway !== undefined && pathway.length > 0) {
            completed_portion = pathway[0].percentage;
          }
          team.completed_portion = completed_portion;
        }
      }

      c4caTeams.sort((a, b) => b.completed_portion - a.completed_portion);

      c4caTeams.forEach((team, index) => {
        team.rank = index + 1;
      });

      return [null, c4caTeams];
    } catch (error) {
      console.log(error);
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeachersByFacilitator(facilitator_id, page, limit = 10) {
    const { C4caTeachers, C4caTeams, C4caStudents } = this.server.models();
    try {
      const teachers = await C4caTeachers.query()
      .throwIfNotFound()
      .where('facilitator_id', facilitator_id)
        .offset((page - 1) * limit)
        .limit(limit);

      let totalTeachersDetails = [];
      for (let data of teachers) {
        let number_of_students = 0;
        let number_of_teams = 0;
        let teamsDetails = await C4caTeams.query().where('teacher_id', data.id);
        let teamsIds = teamsDetails.map((team) => team.id);
        let studentsDetails = await C4caStudents.query().whereIn('team_id', teamsIds);
        data.number_of_teams = teamsDetails.length;
        data.number_of_students = studentsDetails.length;
        totalTeachersDetails.push(data);
      }
      return [null, totalTeachersDetails];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getProjectTopicByTeamId(team_id) {
    const { C4caTeamProjectTopic, C4caTeams } = this.server.models();
    try {
      const team = await C4caTeams.query().findById(team_id);
      if (!team) return [{ message: 'Team not found' }];
      const district = team.district;
  
      const teamIdByDistrict = await C4caTeams.query()
        .where('district', district)
        .select('id');
  
      // Extract team IDs from the result
      const arr = teamIdByDistrict.map((team) => team.id);
      let totalSubmitTopic=0;
      let project = await C4caTeamProjectTopic.query()
        .whereIn('team_id', arr);
        if( project==undefined || project==null || project.length==0){ 
          project=null;
        }
        else{
          
           totalSubmitTopic = project.length; // Count the projects in the result
        }
      const response = {
        totalSubmitTopic,
        project,
      };
  
      return [null, response];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }
  
  async getProjectSubmitByTeamId(team_id) {
    const { C4caTeamProjectSubmitSolution, C4caTeams} = this.server.models();
    try {
      const team = await C4caTeams.query().findById(team_id);
      if (!team) return [{ message: 'Team not found' }];
      const district = team.district;
  
      const teamIdByDistrict = await C4caTeams.query()
        .where('district', district)
        .select('id');

         // Extract team IDs from the result
      const arr = teamIdByDistrict.map((team) => team.id);
      let totalSubmitProject=0;
      let project = await C4caTeamProjectSubmitSolution.query()
        .whereIn('team_id',arr);
        if( project==undefined || project==null || project.length==0){
          project=null;
        }else{
          totalSubmitProject = project.length;
        }
        const responce ={
          totalSubmitProject,
          project
        }
      return [null, responce];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async shareProjectTopicTime(team_id) {
    const { C4caTeamProjectTopic, C4caTeams } = this.server.models();
    try {
      const team = await C4caTeams.query().where('id', team_id).first();
  
      if (!team) {
        return [{ message: 'Team not found' }];
      }
  
      const existingRecord = await C4caTeamProjectTopic.query().where('team_id', team_id).first();
  
      if (existingRecord && existingRecord.unlocked_at) {
        return [null,'already unlocked module'];
      }
  
      const team_name = team.team_name;
  
      const store = await C4caTeamProjectTopic.query().insert({
        unlocked_at: new Date(),
        team_name,
        team_id,
      });
  
      return [null, store];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }
  async shareProjectSubmitTime(team_id) {
    const { C4caTeamProjectSubmitSolution, C4caTeams } = this.server.models();
    try {
      const team = await C4caTeams.query().where('id', team_id).first();
  
      if (!team) {
        return [{ message: 'Team not found' }];
      }
  
      const existingRecord = await C4caTeamProjectSubmitSolution.query()
        .where('team_id', team_id)
        .first();
  
      if (existingRecord && existingRecord.unlocked_at) {
        return [null,'already unlocked module'];
      }
  
      const team_name = team.team_name;
  
      const store = await C4caTeamProjectSubmitSolution.query().insert({
        unlocked_at: new Date(),
        team_name,
        team_id,
      });
  
      return [null, store];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }
  

  async getTotalData(partner_id) {
    try {
      if (partner_id === undefined || partner_id === null) {
        const [error, totalAdminPageDAta] = await this.getAllAdminPageData(partner_id);
        if (error) {
          return [error, null];
        }
        return [null, totalAdminPageDAta];
      }
      if (partner_id) {
        const [error, particularParterPageDetails] = await this.getAllAdminPageData(partner_id);
        if (error) {
          return [error, null];
        }
        return [null, particularParterPageDetails];
      }
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }


  // create a funcitons getAllAdminPageData for counting total students, teachers, unique schools, total projects submission
  async getAllAdminPageData(partner_id) {
    const { C4caTeams, C4caTeachers, C4caTeamProjectSubmitSolution, C4caStudents, Facilitator } = this.server.models();
    try {
      if (partner_id === undefined || partner_id === null) {
        const totalStudents = await C4caStudents.query().count('id');
        const totalTeachers = await C4caTeachers.query().count('id');
        const totalUniqueSchools = await C4caTeachers.query()
          .select(C4caTeachers.raw('count(distinct "school") as "totalUniqueSchools"'))
          .first();
        const totalProjectsSubmission = await C4caTeamProjectSubmitSolution.query().count('id');
        
        const adminPageData = {
          totalStudents: totalStudents[0].count,
          totalTeachers: totalTeachers[0].count,
          totalUniqueSchools: totalUniqueSchools.totalUniqueSchools,
          totalProjectsSubmission: totalProjectsSubmission[0].count,
        };
        return [null, adminPageData];
      }
      if (partner_id) {
        let totalNoOfTeams = 0;
        let totalNoOfStundents = 0;
        let totalProjectsSubmitByTeams;
        const facilitatorDetails = await Facilitator.query().throwIfNotFound().where('partner_id', partner_id);
        const facilitator_ids = facilitatorDetails.map((facilitator) => facilitator.id);
        if (facilitator_ids.length > 0) {
          const teachersDetails = await C4caTeachers.query().whereIn('facilitator_id', facilitator_ids);
          const teachers_ids = teachersDetails.map((teacher) => teacher.id);
          const teamsDetails = await C4caTeams.query().whereIn('teacher_id', teachers_ids);
          const team_ids = teamsDetails.map((team) => team.id);
          totalNoOfTeams = team_ids.length.toString();
          if (team_ids.length > 0) {
            const studentsDetails = await C4caStudents.query().whereIn('team_id', team_ids);
            const students_ids = studentsDetails.map((student) => student.id);
            totalNoOfStundents = students_ids.length.toString();
            const totalProjectsSubmissionByTeams = await C4caTeamProjectSubmitSolution.query()
              .whereIn('team_id', team_ids)
              .count('id');
            totalProjectsSubmitByTeams = totalProjectsSubmissionByTeams[0].count;
            const particularParterDetails = {
              totalNoOfTeams,
              totalNoOfStundents,
              totalProjectsSubmitByTeams,
            };
            return [null, particularParterDetails];
          }
        }
      }
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getAllAttemptAssessment(user_id, team_id) {
    const { assessmentOutcome } = this.server.models();
    try {
      const user_team = team_id ? { team_id: team_id } : { user_id: user_id };
      const { data } = await strapi.findOne('pathways', 18, {
        populate: ['courses.assessments'],
      });
      let totalAssessmentIds = [];
      const pathwayData = data.attributes.courses.data;
      const coursePromises = pathwayData.map(async (course) => {
        const { assessments } = course.attributes;
        const assessmentIds =
          assessments && assessments.data ? assessments.data.map((asm) => asm.id) : [];
        totalAssessmentIds = [...totalAssessmentIds, ...assessmentIds];
        return assessmentIds;
      });
      totalAssessmentIds = [...new Set(totalAssessmentIds)];
      await Promise.all(coursePromises);
      const assessment = await assessmentOutcome.query().where(user_team);
      let attemptAssessment = 0;
      if (assessment !== null && assessment !== undefined && assessment.length > 0) {
        attemptAssessment = assessment.length;
      }
      const allData = {
        total_assessment_count: totalAssessmentIds.length,
        attempted_assessment_count: attemptAssessment,
      };
      return [null, allData];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }
};

