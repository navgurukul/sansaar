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

module.exports = class C4caService extends Schmervice.Service {
  async setTeacherProfile(profile_obj, data, user_id, c4ca_partner_id, facilitator_id) {
    const { C4caTeachers, User } = this.server.models();
    try {
      // await User.query().where('id', user_id).update({ c4ca_partner_id }); // remove this line when partner url gets fix and user model as well
      const existingRecord = await C4caTeachers.query().where('user_id', user_id);
      if (existingRecord.length > 0) {
        return [null, existingRecord];
      }
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
        c4ca_partner_id,
        facilitator_id,
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
        login_id: data.team_name.replace(/\s+/g, '').toLowerCase(),
        password: `${data.team_name.replace(/\s+/g, '')}_${Math.random().toString(36).slice(-4)}`,
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

  async getTeamsByTeacherId(teachers_id, pathway_id = C4CA_PATHWAY_ID) {
    const { C4caTeams, PathwayCompletionV2, ModuleCompletionV2 } = this.server.models();
    try {
      const teams = await C4caTeams.query().where('teacher_id', teachers_id).orderBy('id', 'desc');
      const allPathwayModule = await strapi.find('modules', {
        pathway_id: pathway_id,
      });
      if (teams !== null && teams !== undefined && teams.length > 0) {
        for (const team of teams) {
          const AllmoduleCompletion = await ModuleCompletionV2.query().where('team_id', team.id);
          let allModulePer = 0;
          for (let module of AllmoduleCompletion) {
            allModulePer = allModulePer + module.percentage
          }
          let newPathwayPercent = Math.floor(allModulePer / allPathwayModule.data.length);
          team.completed_portion = newPathwayPercent;
        }
      }

      return [null, teams];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeamsWithTopicByTeacherId(teachers_id, pathway_id = C4CA_PATHWAY_ID) {
    const { pathwayServiceV2 } = this.server.services();

    const {
      C4caTeams,
      PathwayCompletionV2,
      C4caTeamProjectTopic,
      C4caTeamProjectSubmitSolution,
      C4caStudents,
    } = this.server.models();
    try {
      const teams = await C4caTeams.query().where('teacher_id', teachers_id).orderBy('id', 'desc');

      if (teams !== null && teams !== undefined && teams.length > 0) {
        for (const team of teams) {
          const pathway = await PathwayCompletionV2.query()
            .where('team_id', team.id)
            .andWhere('pathway_id', pathway_id);
          const students = await C4caStudents.query().where('team_id', team.id);
          let completed_portion = 0;
          team.current_topic = null;
          team.Project_topic_submission = null;
          team.Project_solution_submission = null;
          team.team_members = students;

          if (pathway !== null && pathway !== undefined && pathway.length > 0) {
            const Project_topic_submission = await C4caTeamProjectTopic.query().where(
              'team_id',
              team.id
            );

            if (
              Project_topic_submission !== null &&
              Project_topic_submission !== undefined &&
              Project_topic_submission.length > 0
            ) {
              team.Project_topic_submission = Project_topic_submission;
            }

            const projectSolution = await C4caTeamProjectSubmitSolution.query().where(
              'team_id',
              team.id
            );

            if (
              projectSolution !== null &&
              projectSolution !== undefined &&
              projectSolution.length > 0
            ) {
              team.Project_solution_submission = projectSolution;
            }

            completed_portion = pathway[0].percentage;

            const [err, currentTopic] = await pathwayServiceV2.findPathwaysOngoingTopicByPathwayId(
              null,
              team.id,
              pathway_id
            );

            if (currentTopic !== null && currentTopic !== undefined && currentTopic.length > 0) {
              team.current_topic = currentTopic;
            }
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
    const { C4caTeachers, User, C4caRole, C4caStudents, C4caTeams } = this.server.models();
    try {
      // const role = await UserRole.query().where('user_id', user_id).andWhere('role', 'admin');
      // if (role.length == 0) {
      //   return [{ message: 'You are not admin' }];
      // }
      const teacher_Data = await C4caTeachers.query().where('id', teacher_id);
      if (teacher_Data.length > 0) {
        const team_data = await C4caTeams.query().where('teacher_id', teacher_id);
        if (team_data.length != 0) {
          const deleteStudent = await C4caStudents.query().where('teacher_id', teacher_id).del();
          const deleteTeam = await C4caTeams.query().where('teacher_id', teacher_id).del();
          const deleteTeacher = await C4caTeachers.query().where('id', teacher_id).del();
          const deleteUserRole = await C4caRole.query().where('user_id', user_id).del();
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
        const deleteUserRole = await C4caRole.query().where('user_id', user_id).del();
        const deleteTeacher = await C4caTeachers.query().where('id', teacher_id).del();
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

  async getTeamByTeamId(team_id, pathway_id = C4CA_PATHWAY_ID) {
    const { C4caTeams, C4caStudents, PathwayCompletionV2, C4caTeamProjectSubmitSolution, CourseCompletionV3, ModuleCompletionV2 } = this.server.models();
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

      if (pathway !== null && pathway !== undefined && pathway.length > 0) {
        completed_portion = pathway[0].percentage;
      }

      const moduleCompletion = await ModuleCompletionV2.query().where('team_id', team_id).orderBy('complete_at', 'desc').first();
      const modulePathwayDetails = moduleCompletion ? await strapi.findOne('modules', moduleCompletion.module_id) : null;
      const courseCompletion = await CourseCompletionV3.query().where('team_id', team_id).orderBy('complete_at', 'desc').first();
      const CoursePathwayDetails = courseCompletion ? await strapi.findOne('courses', courseCompletion.course_id) : null;
      const projectStatus = await C4caTeamProjectSubmitSolution.query().where('team_id', team_id).first();

      const allPathwayModule = await strapi.find('modules', {
        pathway_id: pathway_id,
      });
      const AllmoduleCompletion = await ModuleCompletionV2.query().where('team_id', team_id)
      let allModulePer = 0;
      for (let module of AllmoduleCompletion) {
        allModulePer = allModulePer + module.percentage
      }
      let newPathwayPercent = Math.floor(allModulePer / allPathwayModule.data.length);
      let projectLink = null;
      let projectFileUrl = null;
      if (projectStatus && projectStatus.is_submitted === true) {
        projectLink = projectStatus.project_link;
        projectFileUrl = projectStatus.project_file_url;
      }
      team.team_members = member;
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
        completed_portion: newPathwayPercent,
        team_members: member,
        projectSubmit: projectStatus ? projectStatus.is_submitted : false,
        projectLink,
        projectFileUrl,
        module_name: modulePathwayDetails ? modulePathwayDetails.data.attributes.name : null,
        course_name: CoursePathwayDetails ? CoursePathwayDetails.data.attributes.name : null,
      };
      return [null, responese];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async updateTeamById(data, team_id) {
    const { C4caTeams, C4caStudents } = this.server.models();
    try {
      const team = await C4caTeams.query().where('id', team_id).first();
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
          deleteStudent = await C4caStudents.query().where('team_id', team_id).del();
          member = await C4caStudents.query().insert(updateStudent);
        } else {
          return [{ message: 'team size and team members required' }, null];
        }
      }
      if (data.team_name) {
        const updateTeamName = await C4caTeams.query().where('id', team_id).patch({
          team_name: data.team_name,
        });
      }
      const team_data = await C4caTeams.query().where('id', team_id).first();
      member = await C4caStudents.query().where('team_id', team_id);

      return [null, { ...team_data, team_members: member }];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeacherData(user_id) {

    const { C4caTeachers, C4caRole } = this.server.models();
    try {
      const roles = await C4caRole.query().where('user_id', user_id);

      const teacherRole = roles.find((role) => role.role === 'c4caTeacher');
      if (teacherRole) {
        const teacher = await C4caTeachers.query().where('user_id', user_id).first();
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

  // async uploadProjectTopic(file, team_id, project_title, project_summary, is_submitted, module_id) {
  //       const { C4caTeamProjectTopic, C4caTeams } = this.server.models();
  //   const { progressTrackingService, exercisesServiceV2 } = this.server.services();

  //   try {
  //     const existingProject = await C4caTeamProjectTopic.query()
  //       .where('team_id', team_id)
  //       .andWhere('module_id', module_id)
  //       .first();

  //     if (existingProject && existingProject.is_submitted ==true) {
  //       return [{ message: 'Team has already submitted a project topic'}];
  //     }
  //     const team = await C4caTeams.query().where('id', team_id).first();
  //     if (!team) {
  //       return [{ message: 'Team not found' }];
  //     }
  //     const { team_name } = team;
  //     let url = '';
  //     if (file) {
  //       const key = `c4caUploadTopic`;
  //       const uploadParams = {
  //         Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
  //         Key: key,
  //         Body: file._data,
  //         ContentType: file.hapi.headers['content-type'],
  //       };

  //       const uploader = S3Bucket.upload(uploadParams);
  //       const uploaded = await uploader.promise();
  //       url = `https://${CONSTANTS.auth.c4ca.c4caS3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
  //     } else {
  //       url = '';
  //     }

  //     const store = await C4caTeamProjectTopic.query()
  //       // .where('team_id', team_id)
  //       // .andWhere('module_id', module_id)
  //       .insert({
  //         project_topic_url: url,
  //         team_name,
  //         project_title,
  //         project_summary,
  //         created_at: new Date(),
  //         is_submitted,
  //         team_id,
  //         module_id,
  //       }).returning('*');

  //     if (store !== null && store !== undefined && store.length > 0) {
  //       const modulePathwayDetails = await strapi.findOne('modules', store[0].module_id, {
  //         populate: ['pathway'],
  //       });

  //       if (store[0].is_submitted == true) {
  //         const data = await exercisesServiceV2.calculateModulePercentageByModuleId(
  //           null,
  //           module_id,
  //           team_id,
  //           100
  //         );
  //       }

  //       const pathway_id =
  //         modulePathwayDetails &&
  //         modulePathwayDetails.data &&
  //         modulePathwayDetails.data.attributes &&
  //         modulePathwayDetails.data.attributes.pathway &&
  //         modulePathwayDetails.data.attributes.pathway.data.id;

  //       const jsonDetails = {};
  //       jsonDetails.user_id = null;
  //       jsonDetails.assessment_id = null;
  //       jsonDetails.exercise_id = null;
  //       jsonDetails.project_topic_id = store[0].id;
  //       jsonDetails.course_id = null;
  //       jsonDetails.project_solution_id = null;
  //       jsonDetails.team_id = store[0].team_id;
  //       jsonDetails.module_id = store[0].module_id;
  //       jsonDetails.pathway_id = pathway_id;
  //       await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
  //     }
  //     return [null, store];
  //   } catch (error) {

  //     logger.error(JSON.stringify(error));
  //     return [errorHandler(error), null];
  //   }
  // }

  // async uploadProjectTopic(file, team_id, project_title, project_summary, is_submitted, module_id,projectTopic_file_name) {
  //   const { C4caTeamProjectTopic, C4caTeams } = this.server.models();
  //   const { progressTrackingService, exercisesServiceV2 } = this.server.services();

  //   try {
  //     const existingProject = await C4caTeamProjectTopic.query().findOne({ team_id });

  //     const team = await C4caTeams.query().findById(team_id);
  //     if (!team) {
  //       return [{ message: 'Team not found' }];
  //     }

  //     let url = '';
  //     if (file) {
  //       const key = `c4caUploadTopic`;
  //       const uploadParams = {
  //         Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
  //         Key: key,
  //         Body: file._data,
  //         ContentType: file.hapi.headers['content-type'],
  //       };

  //       const uploader =await S3Bucket.upload(uploadParams);

  //       const uploaded = await uploader.promise();

  //       url = `https://${CONSTANTS.auth.c4ca.c4caS3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
  //     }

  //     if (existingProject) {
  //       const updatedProject = await C4caTeamProjectTopic.query()
  //         .patchAndFetchById(existingProject.id, {
  //           project_topic_url: url,
  //           team_name: team.team_name,
  //           project_title,
  //           project_summary,
  //           created_at: new Date(),
  //           is_submitted,
  //           projectTopic_file_name,
  //         });

  //       if (updatedProject.is_submitted) {
  //         const modulePathwayDetails = await strapi.findOne('modules', updatedProject.module_id, {
  //           populate: ['pathway'],
  //         });

  //         await exercisesServiceV2.calculateModulePercentageByModuleId(
  //           null,
  //           updatedProject.module_id,
  //           team_id,
  //           100
  //         );

  //         const pathway_id = modulePathwayDetails &&
  //           modulePathwayDetails.data &&
  //           modulePathwayDetails.data.attributes &&
  //           modulePathwayDetails.data.attributes.pathway &&
  //           modulePathwayDetails.data.attributes.pathway.data.id;

  //         const jsonDetails = {
  //           user_id: null,
  //           assessment_id: null,
  //           exercise_id: null,
  //           project_topic_id: updatedProject.id,
  //           course_id: null,
  //           project_solution_id: null,
  //           team_id: updatedProject.team_id,
  //           module_id: updatedProject.module_id,
  //           pathway_id,
  //         };

  //         await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
  //       }
  //       return [null, updatedProject];
  //     } else {
  //       const newProject = await C4caTeamProjectTopic.query().insertGraphAndFetch({
  //         project_topic_url: url,
  //         team_name: team.team_name,
  //         project_title,
  //         project_summary,
  //         created_at: new Date(),
  //         is_submitted,
  //         team_id,
  //         module_id,
  //         projectTopic_file_name
  //       });

  //       return [null, newProject];
  //     }
  //   } catch (error) {
  //     logger.error(JSON.stringify(error));
  //     return [errorHandler(error), null];
  //   }
  // }


  async uploadProjectTopic(file, team_id, project_title, project_summary, is_submitted, module_id, projectTopic_file_name) {
    const { C4caTeamProjectTopic, C4caTeams } = this.server.models();
    const { progressTrackingService, exercisesServiceV2 } = this.server.services();

    try {
      const existingProject = await C4caTeamProjectTopic.query().findOne({ team_id });

      const team = await C4caTeams.query().findById(team_id);
      const key = `c4caUploadTopic/${team_id}`;
      if (!team) {
        return [{ message: 'Team not found' }];
      }
      let url = null;
      if (existingProject) {
        if (file) {
          const uploadParams = {
            Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
            Key: key,
            Body: file._data,
            ContentType: file.hapi.headers['content-type'],
          };
          await S3Bucket.putObject(uploadParams).promise()
          url = `https://${CONSTANTS.auth.c4ca.c4caS3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
        }
        const resp = {
          team_name: team.team_name,
          project_title,
          project_summary,
          is_submitted,
          projectTopic_file_name,
          updated_at: new Date()

        }

        const updatedProject = await C4caTeamProjectTopic.query()
          .patchAndFetchById(existingProject.id, resp);
        if (updatedProject.is_submitted) {
          const modulePathwayDetails = await strapi.findOne('modules', updatedProject.module_id, {
            populate: ['pathway'],
          });
          await exercisesServiceV2.calculateModulePercentageByModuleId(
            null,
            updatedProject.module_id,
            team_id,
            100
          );

          const pathway_id = modulePathwayDetails &&
            modulePathwayDetails.data &&
            modulePathwayDetails.data.attributes &&
            modulePathwayDetails.data.attributes.pathway &&
            modulePathwayDetails.data.attributes.pathway.data.id;

          const jsonDetails = {
            user_id: null,
            assessment_id: null,
            exercise_id: null,
            project_topic_id: updatedProject.id,
            course_id: null,
            project_solution_id: null,
            team_id: updatedProject.team_id,
            module_id: updatedProject.module_id,
            pathway_id,
          };
          await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
        }
        return [null, updatedProject];
      } else {
        let url = '';
        if (file) {
          const uploadParams = {
            Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
            Key: key,
            Body: file._data,
            ContentType: file.hapi.headers['content-type'],
          };
          const uploader = S3Bucket.upload(uploadParams);
          const uploaded = await uploader.promise();
          url = `https://${CONSTANTS.auth.c4ca.c4caS3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
        }
        const newProject = await C4caTeamProjectTopic.query().insertGraphAndFetch({
          project_topic_url: url,
          team_name: team.team_name,
          project_title,
          project_summary,
          created_at: new Date(),
          is_submitted,
          team_id,
          module_id,
          projectTopic_file_name
        });
        if (is_submitted) {
          const modulePathwayDetails = await strapi.findOne('modules', module_id, {
            populate: ['pathway'],
          });
          await exercisesServiceV2.calculateModulePercentageByModuleId(
            null,
            module_id,
            team_id,
            100
          );

          const pathway_id = modulePathwayDetails &&
            modulePathwayDetails.data &&
            modulePathwayDetails.data.attributes &&
            modulePathwayDetails.data.attributes.pathway &&
            modulePathwayDetails.data.attributes.pathway.data.id;

          const jsonDetails = {
            user_id: null,
            assessment_id: null,
            exercise_id: null,
            project_topic_id: newProject.id,
            course_id: null,
            project_solution_id: null,
            team_id: team_id,
            module_id: module_id,
            pathway_id,
          };
          await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
        }
        return [null, newProject];
      }
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }







  // async uploadProjectSubmit(file, team_id, project_link, is_submitted, module_id) {
  //   const { C4caTeamProjectSubmitSolution, C4caTeams } = this.server.models();
  //   const { progressTrackingService, exercisesServiceV2 } = this.server.services();
  //   try {
  //     const existingProject = await C4caTeamProjectSubmitSolution.query()
  //       .where('team_id', team_id)
  //       .andWhere('module_id', module_id)
  //       .first();

  //     if (existingProject && existingProject.is_submitted ==true) {
  //       return [{ message: 'Team has already submitted a project' }];
  //     }
  //     const team = await C4caTeams.query().where('id', team_id).first();
  //     if (!team) {
  //       return [{ message: 'Team not found' }];
  //     }
  //     const { team_name } = team;
  //     let url = '';
  //     if (file) {
  //       const key = `c4caUploadProject`;
  //       const uploadParams = {
  //         Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
  //         Key: key,
  //         Body: file._data,
  //         ContentType: file.hapi.headers['content-type'],
  //       };

  //       const uploader = S3Bucket.upload(uploadParams);
  //       const uploaded = await uploader.promise();
  //       url = `https://${CONSTANTS.auth.c4ca.c4caS3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
  //     } else {
  //       url = '';
  //     }
  //     const store = await C4caTeamProjectSubmitSolution.query()
  //       // .where('team_id', team_id)
  //       // .andWhere('module_id', module_id)
  //       .insert({
  //         project_file_url: url,
  //         team_id,
  //         team_name,
  //         project_link,
  //         created_at: new Date(),
  //         is_submitted,
  //         module_id,
  //       })

  //     if (store !== null && store !== undefined && store.length > 0) {
  //       const modulePathwayDetails = await strapi.findOne('modules', store[0].module_id, {
  //         populate: ['pathway'],
  //       });

  //       if (store[0].is_submitted == true) {
  //         const data = await exercisesServiceV2.calculateModulePercentageByModuleId(
  //           null,
  //           module_id,
  //           team_id,
  //           100
  //         );
  //       }

  //       const pathway_id =
  //         modulePathwayDetails &&
  //         modulePathwayDetails.data &&
  //         modulePathwayDetails.data.attributes &&
  //         modulePathwayDetails.data.attributes.pathway &&
  //         modulePathwayDetails.data.attributes.pathway.data.id;
  //       const jsonDetails = {};
  //       jsonDetails.user_id = null;
  //       jsonDetails.assessment_id = null;
  //       jsonDetails.exercise_id = null;
  //       jsonDetails.project_topic_id = null;
  //       jsonDetails.course_id = null;
  //       jsonDetails.project_solution_id = store[0].id;
  //       jsonDetails.team_id = store[0].team_id;
  //       jsonDetails.module_id = store[0].module_id;
  //       jsonDetails.pathway_id = pathway_id;
  //       await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
  //     }
  //     return [null, store];
  //   } catch (e) {
  //     return [errorHandler(e), null];
  //   }
  // }


  async uploadProjectSubmit(file, team_id, project_link, is_submitted, module_id, project_file_name) {
    try {
      const { C4caTeamProjectSubmitSolution, C4caTeams } = this.server.models();
      const { progressTrackingService, exercisesServiceV2 } = this.server.services();

      // Find the existing project for the team and module
      const existingProject = await C4caTeamProjectSubmitSolution.query()
        .where('team_id', team_id)
        // .andWhere('module_id', module_id)
        .first();

      // If an existing project is found, update the fields
      if (existingProject) {
        let url = existingProject.project_file_url; // Preserve the existing project_file_url

        if (file && file._data) {
          // If a new file is provided, upload it to S3
          const key = `c4caUploadProject/${team_id}`;
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
          url = ''; // Set URL to an empty string when no file is provided
        }
        // Update the existing project details including project_file_url
        const updatedProject = await C4caTeamProjectSubmitSolution.query()
          .patchAndFetchById(existingProject.id, {
            project_link: project_link ? project_link : '',
            project_file_url: url,
            project_file_name: project_file_name ? project_file_name : '',
            is_submitted,
            updated_at: new Date(),
          });
        // Additional actions if the project is submitted
        if (updatedProject.is_submitted) {
          const modulePathwayDetails = await strapi.findOne('modules', updatedProject.module_id, {
            populate: ['pathway'],
          });

          await exercisesServiceV2.calculateModulePercentageByModuleId(
            null,
            updatedProject.module_id,
            team_id,
            100
          );

          const pathway_id =
            modulePathwayDetails &&
            modulePathwayDetails.data &&
            modulePathwayDetails.data.attributes &&
            modulePathwayDetails.data.attributes.pathway &&
            modulePathwayDetails.data.attributes.pathway.data.id;

          const jsonDetails = {
            user_id: null,
            assessment_id: null,
            exercise_id: null,
            project_topic_id: null,
            course_id: null,
            project_solution_id: updatedProject.id,
            team_id: updatedProject.team_id,
            module_id: updatedProject.module_id,
            pathway_id,
          };

          await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
        }

        return [null, updatedProject];
      } else {
        // If no existing project found, proceed to save a new project
        const team = await C4caTeams.query().findById(team_id);
        if (!team) {
          return [{ message: 'Team not found' }];
        }

        const { team_name } = team;
        let url = '';

        if (file && file._data) {
          // Upload file to S3 if provided
          const key = `c4caUploadProject`;
          const uploadParams = {
            Bucket: CONSTANTS.auth.c4ca.c4caS3Bucket,
            Key: key,
            Body: file._data,
            ContentType: file.hapi.headers['content-type'],
          };

          const uploader = await S3Bucket.upload(uploadParams);
          const uploaded = await uploader.promise();
          url = `https://${CONSTANTS.auth.c4ca.c4caS3Bucket}.s3.ap-south-1.amazonaws.com/${key}`;
        }

        // Insert project details into the database
        const newProject = await C4caTeamProjectSubmitSolution.query().insert({
          project_file_url: url,
          team_id,
          team_name,
          project_link,
          created_at: new Date(),
          is_submitted,
          module_id,
          project_file_name,
        });


        // Perform additional actions if the project is submitted
        if (newProject && newProject.is_submitted) {
          const modulePathwayDetails = await strapi.findOne('modules', newProject.module_id, {
            populate: ['pathway'],
          });

          await exercisesServiceV2.calculateModulePercentageByModuleId(
            null,
            module_id,
            team_id,
            100
          );

          const pathway_id =
            modulePathwayDetails &&
            modulePathwayDetails.data &&
            modulePathwayDetails.data.attributes &&
            modulePathwayDetails.data.attributes.pathway &&
            modulePathwayDetails.data.attributes.pathway.data.id;

          const jsonDetails = {
            user_id: null,
            assessment_id: null,
            exercise_id: null,
            project_topic_id: null,
            course_id: null,
            project_solution_id: newProject.id,
            team_id: newProject.team_id,
            module_id: newProject.module_id,
            pathway_id,
          };

          await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
        }

        return [null, newProject];
      }
    } catch (e) {
      return [errorHandler(e), null];
    }
  }







  // create facilitator
  async createFacilitator(facilitatorData) {
    const { Facilitator } = this.server.models();
    try {
      const checkFacilitator = await Facilitator.query().where('email', facilitatorData.email);
      if (checkFacilitator.length > 0) {
        return [
          null,
          {
            error: `true`,
            message: `facilitator already exist with email ${checkFacilitator[0].email}.`,
            code: 403,
          },
        ];
      }
      const facilitator = await Facilitator.query().insert(facilitatorData);
      return [null, facilitator];
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

  async updateFacilitatorById(data, id) {
    const { Facilitator, User, C4caRole } = this.server.models();
    try {
      let userID;
      const oldData = await Facilitator.query().throwIfNotFound().findById(id);
      let point_of_contact_data = await User.query().where('email', data.email).first();
      const point_of_contact_oldData = await User.query().where('email', oldData.email).first();
      if (oldData.email !== data.email) {
        const oldUserID = parseInt(point_of_contact_oldData.id);
        if (
          point_of_contact_oldData.c4ca_partner_id != null &&
          point_of_contact_oldData.c4ca_facilitator_id != null
        ) {
          await User.query()
            .throwIfNotFound()
            .patchAndFetchById(oldUserID, { c4ca_partner_id: null, c4ca_facilitator_id: null });
          await C4caRole.query().where('user_id', oldUserID).andWhere('role', 'facilitator').del();
          logger.info(`removing the facilitator role to the user: ${oldUserID}`);
        }
      }
      if (point_of_contact_data !== null && point_of_contact_data !== undefined) {
        userID = parseInt(point_of_contact_data.id);
        const { c4ca_partner_id, c4ca_facilitator_id } = point_of_contact_data;
        if (c4ca_partner_id != null && c4ca_facilitator_id != null && c4ca_facilitator_id != id) {
          return [
            {
              Error: true,
              code: 403,
              message: `This point of contact is already associated with another facilitator!`,
            },
          ];
        }
        const roleAdmin = await C4caRole.query().where('user_id', userID).andWhere('role', 'admin');
        if (roleAdmin.length > 0) {
          return [
            {
              Error: true,
              code: 403,
              message: `This user has Admin access, You can't make this user into point of contact to this facilitator!`,
            },
          ];
        }
        const rolePrt = await C4caRole.query()
          .where('user_id', userID)
          .andWhere('role', 'facilitator');
        if (rolePrt.length === 0) {
          await C4caRole.query().insert({ role: 'facilitator', user_id: userID });

          logger.info(`giving the facilitator role to the user ${userID}`);
        }
      } else {
        point_of_contact_data = await User.query().insert({
          email: data.email,
          name: data.name,
          contact: data.phone_number,
          c4ca_partner_id: data.c4ca_partner_id,
        });
        userID = parseInt(point_of_contact_data.id);
        logger.info(`inserted data into users table user_id:${userID}`);
      }
      data.point_of_contact = data.point_of_contact_name;
      delete data.point_of_contact_name;
      const updateData = await Facilitator.query().throwIfNotFound().patchAndFetchById(id, data);
      if (updateData) {
        await User.query().throwIfNotFound().patchAndFetchById(userID, { c4ca_facilitator_id: id });
        const rolePrt = await C4caRole.query()
          .where('user_id', userID)
          .andWhere('role', 'facilitator')
          .first();
        if (!rolePrt) {
          await C4caRole.query().insert({ role: 'facilitator', user_id: userID });
          logger.info(`Giving the facilitator role to the user ${userID}`);
        }
      }
      return [null, updateData];
    } catch (err) {
      return [errorHandler(err), null];
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
    const {
      Facilitator,
      C4caTeachers,
      C4caTeams,
      C4caStudents,
      C4caPartners,
    } = this.server.models();
    try {
      const facilitator = await Facilitator.query()
        .throwIfNotFound()
        .where('c4ca_partner_id', partner_id);
      const partnerDetails = await C4caPartners.query().where('id', partner_id);
      const partner_name = { partner_name: partnerDetails[0].name };
      const totalFacilitatorsDetails = [];
      for (const data of facilitator) {
        const { id } = data;
        const number_of_students = 0;
        const teachersDetails = await C4caTeachers.query().where('facilitator_id', id);
        const teachersIds = teachersDetails.map((teacher) => teacher.id);
        const teamsDetails = await C4caTeams.query().whereIn('teacher_id', teachersIds);
        const teamsIds = teamsDetails.map((team) => team.id);
        const studentsDetails = await C4caStudents.query().whereIn('team_id', teamsIds);
        data.number_of_students = studentsDetails.length;
        totalFacilitatorsDetails.push(data);
      }
      const combinedData = { ...partner_name, facilitatorsDetails: totalFacilitatorsDetails };
      return [null, combinedData];
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

  async getTeamsByDistrictOrSchool(district, school, pathway_id = C4CA_PATHWAY_ID) {
    const { C4caTeams, C4caTeachers, PathwayCompletionV2, ModuleCompletionV2 } = this.server.models();
    try {
      let c4caTeams = await C4caTeams.query();

      if (district !== undefined && school !== undefined) {
        c4caTeams = await C4caTeams.query().where('district', district).andWhere('school', school);
      } else if (district !== undefined && school === undefined) {
        c4caTeams = await C4caTeams.query().where('district', district);
      } else if (district === undefined && school !== undefined) {
        c4caTeams = await C4caTeams.query().andWhere('school', school);
      }

      const allPathwayModule = await strapi.find('modules', {
        pathway_id: pathway_id,
      });
      if (c4caTeams !== null && c4caTeams !== undefined && c4caTeams.length > 0) {
        for (const team of c4caTeams) {
          const AllmoduleCompletion = await ModuleCompletionV2.query().where('team_id', team.id);
          let allModulePer = 0;
          for (let module of AllmoduleCompletion) {
            allModulePer = allModulePer + module.percentage
          }
          let newPathwayPercent = Math.floor(allModulePer / allPathwayModule.data.length);
          const pathway = await PathwayCompletionV2.query()
            .where('team_id', team.id)
            .andWhere('pathway_id', pathway_id);
          let completed_portion = 0;
          team.completed_portion = newPathwayPercent;
        }
      }

      c4caTeams.sort((a, b) => b.completed_portion - a.completed_portion);

      c4caTeams.forEach((team, index) => {
        team.rank = index + 1;
      });

      return [null, c4caTeams];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getTeachersByFacilitator(facilitator_id, page, limit = 10) {
    const {
      C4caTeachers,
      C4caTeams,
      C4caStudents,
      Facilitator,
      C4caPartners,
    } = this.server.models();
    try {
      const teachers = await C4caTeachers.query()
        .where('facilitator_id', facilitator_id)
        .offset((page - 1) * limit)
        .limit(limit);

      const facilitatorDetails = await Facilitator.query().findById(facilitator_id);
      const partnerDetails = await C4caPartners.query().where(
        'id',
        facilitatorDetails.c4ca_partner_id
      );
      const partner_id = { partner_id: partnerDetails[0].id };
      const partner_name = { partner_name: partnerDetails[0].name };
      const facilitator_details = {
        facilitator_name: facilitatorDetails.name,
        teacher_link: facilitatorDetails.web_link,
      };

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

  // async getProjectTopicByTeamId(team_id, module_id) {
  //   const { C4caTeamProjectTopic, C4caTeams } = this.server.models();
  //   try {
  //     const team = await C4caTeams.query().findById(team_id);
  //     console.log(team,'team')
  //     if (!team) return [{ message: 'Team not found' }];
  //     const { district } = team;

  //     const teamIdByDistrict = await C4caTeams.query().where('district', district).select('id');
  //     console.log(teamIdByDistrict,'teamIdByDistrict')

  //     // Extract team IDs from the result
  //     const arr = teamIdByDistrict.map((team) => team.id);
  //     let totalSubmitTopic = 0;
  //     let project = await C4caTeamProjectTopic.query()
  //       .whereIn('team_id', arr)
  //       .andWhere('module_id', module_id);

  //     if (project == undefined || project == null || project.length == 0) {
  //       project = null;
  //     } else {
  //       totalSubmitTopic = project.length; // Count the projects in the result
  //       if(project.length===1){
  //         project=project[0]
  //       }
  //     }
  //     const response = {
  //       totalSubmitTopic,
  //       project,
  //     };

  //     return [null, response];
  //   } catch (error) {
  //     logger.error(JSON.stringify(error));
  //     return [errorHandler(error), null];
  //   }
  // }




  async getProjectTopicByTeamId(team_id, module_id) {
    const { C4caTeamProjectTopic, C4caTeams } = this.server.models();
    try {
      // Retrieve team information including district
      const team = await C4caTeams.query().findById(team_id);

      if (!team) {
        return [{ message: 'Team not found' }];
      }

      const { district } = team;

      // Count the total submitted projects for the same district
      const totalSubmitTopic = await C4caTeamProjectTopic.query()
        .join('c4ca_teams', 'c4ca_team_projecttopic.team_id', '=', 'c4ca_teams.id')
        .where('c4ca_teams.district', district)
        .resultSize();

      // Retrieve only the projects for the current team_id and module_id
      const projects = await C4caTeamProjectTopic.query()
        .where('team_id', team_id)
        .andWhere('module_id', module_id);

      const response = {
        totalSubmitTopic,
        team_name: team.team_name,
        projects: projects[0] || null,
      };

      return [null, response];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }










  // async getProjectSubmitByTeamId(team_id, module_id) {
  //   const { C4caTeamProjectSubmitSolution, C4caTeams,C4caTeamProjectTopic } = this.server.models();
  //   try {
  //     const team = await C4caTeams.query().findById(team_id);
  //     if (!team) return [{ message: 'Team not found' }];
  //     const { district } = team;

  //     const teamIdByDistrict = await C4caTeams.query().where('district', district).select('id');

  //     // Extract team IDs from the result
  //     const arr = teamIdByDistrict.map((team) => team.id);
  //     let totalSubmitProject = 0;
  //     let project = await C4caTeamProjectSubmitSolution.query()
  //       .whereIn('team_id', arr)
  //       .andWhere('module_id', module_id);
  //     if (project == undefined || project == null || project.length == 0) {
  //       project = 0;
  //     } else {
  //       totalSubmitProject = project.length;
  //     }
  //     const projectTopic = await C4caTeamProjectTopic.query().whereIn('team_id', arr).andWhere('module_id', module_id);
  //     const responce = {
  //       totalSubmitProject,
  //       projectTopic: projectTopic[0] || null,
  //       project: project.length === 1 ? project[0] : null,
  //     };
  //     return [null, responce];
  //   } catch (error) {
  //     logger.error(JSON.stringify(error));
  //     return [errorHandler(error), null];
  //   }
  // }

  async getProjectSubmitByTeamId(team_id, module_id) {
    const { C4caTeamProjectSubmitSolution, C4caTeams, C4caTeamProjectTopic } = this.server.models();

    try {
      // Retrieve team information including district
      const team = await C4caTeams.query().findById(team_id);

      if (!team) {
        return [{ message: 'Team not found' }];
      }

      const { district } = team;

      // Count the total submitted projects for the same district
      const totalSubmitProject = await C4caTeamProjectSubmitSolution.query()
        .join('c4ca_teams', 'c4ca_team_projectsubmit_solution.team_id', '=', 'c4ca_teams.id')
        .where('c4ca_teams.district', district)
        // .andWhere('c4ca_team_projectsubmit_solution.module_id', module_id)
        .resultSize();

      // Retrieve the last submitted project
      const projects = await C4caTeamProjectSubmitSolution.query()
        .where('team_id', team_id)
      // .andWhere('module_id', module_id)
      // .orderBy('created_at', 'desc') // Assuming there's a timestamp column for submission time
      // .limit(1);

      // Retrieve the last project topic
      const projectTopic = await C4caTeamProjectTopic.query()
        .whereIn('team_id', [team_id])
      // .andWhere('module_id', module_id)
      // .orderBy('created_at', 'desc') // Assuming there's a timestamp column for topic creation time
      // .limit(1);

      const response = {
        totalSubmitProject,
        projectTopic: projectTopic[0] || null,
        project: projects.length === 1 ? projects[0] : null,
      };

      return [null, response];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }


  async shareProjectTopicTime(team_id, module_id) {
    const { C4caTeamProjectTopic, C4caTeams } = this.server.models();
    const { progressTrackingService } = this.server.services();
    try {
      const team = await C4caTeams.query().where('id', team_id).first();

      if (!team) {
        return [{ message: 'Team not found' }];
      }

      const modulePathwayDetails = await strapi.findOne('modules', module_id, {
        populate: ['pathway'],
      });

      const pathway_id =
        modulePathwayDetails &&
        modulePathwayDetails.data &&
        modulePathwayDetails.data.attributes &&
        modulePathwayDetails.data.attributes.pathway &&
        modulePathwayDetails.data.attributes.pathway.data.id;

      const jsonDetails = {};
      jsonDetails.user_id = null;
      jsonDetails.team_id = team_id;
      jsonDetails.assessment_id = null;
      jsonDetails.exercise_id = null;
      jsonDetails.module_id = module_id;
      jsonDetails.project_solution_id = null;
      jsonDetails.course_id = null;
      jsonDetails.pathway_id = pathway_id;

      const existingRecord = await C4caTeamProjectTopic.query()
        .where('team_id', team_id)
        .andWhere('module_id', module_id)
        .first();

      if (existingRecord && existingRecord.unlocked_at) {
        jsonDetails.project_topic_id = existingRecord.id;
        await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
        return [null, 'already unlocked module'];
      }

      const { team_name } = team;

      const store = await C4caTeamProjectTopic.query().insert({
        unlocked_at: new Date(),
        team_name,
        team_id,
        module_id,
      });

      if (store !== undefined && store !== null && Object.keys(store).length !== 0) {
        jsonDetails.project_topic_id = store.id;
        await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
      }
      return [null, store];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async shareProjectSubmitTime(team_id, module_id) {
    const { C4caTeamProjectSubmitSolution, C4caTeams } = this.server.models();
    const { progressTrackingService } = this.server.services();

    try {
      const team = await C4caTeams.query().where('id', team_id).first();

      if (!team) {
        return [{ message: 'Team not found' }];
      }

      const modulePathwayDetails = await strapi.findOne('modules', module_id, {
        populate: ['pathway'],
      });

      const pathway_id =
        modulePathwayDetails &&
        modulePathwayDetails.data &&
        modulePathwayDetails.data.attributes &&
        modulePathwayDetails.data.attributes.pathway &&
        modulePathwayDetails.data.attributes.pathway.data.id;

      const jsonDetails = {};
      jsonDetails.user_id = null;
      jsonDetails.team_id = team_id;
      jsonDetails.assessment_id = null;
      jsonDetails.exercise_id = null;
      jsonDetails.module_id = module_id;
      jsonDetails.project_topic_id = null;
      jsonDetails.course_id = null;
      jsonDetails.pathway_id = pathway_id;
      const existingRecord = await C4caTeamProjectSubmitSolution.query()
        .where('team_id', team_id)
        .andWhere('module_id', module_id)
        .first();

      if (existingRecord && existingRecord.unlocked_at) {
        jsonDetails.project_solution_id = existingRecord.id;
        await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);

        return [null, 'already unlocked module'];
      }

      const { team_name } = team;

      const store = await C4caTeamProjectSubmitSolution.query().insert({
        unlocked_at: new Date(),
        team_name,
        team_id,
        module_id,
      });

      if (store !== undefined && store !== null && Object.keys(store).length !== 0) {
        jsonDetails.project_solution_id = store.id;
        await progressTrackingService.insertPathwayOngoingTopic(jsonDetails);
      }

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
    const {
      C4caTeams,
      C4caTeachers,
      C4caTeamProjectSubmitSolution,
      C4caStudents,
      Facilitator,
    } = this.server.models();
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
        let particularParterDetails = {};
        let totalNoOfTeams = '0';
        let totalNoOfStundents = '0';
        let totalProjectsSubmitByTeams = '0';
        const dataNotFound = { totalNoOfStundents, totalNoOfTeams, totalProjectsSubmitByTeams };
        const facilitatorDetails = await Facilitator.query().where('c4ca_partner_id', partner_id);
        const facilitator_ids = facilitatorDetails.map((facilitator) => facilitator.id);
        if (facilitator_ids.length > 0) {
          const teachersDetails = await C4caTeachers.query().whereIn(
            'facilitator_id',
            facilitator_ids
          );
          const teachers_ids = teachersDetails.map((teacher) => teacher.id);
          const teamsDetails = await C4caTeams.query().whereIn('teacher_id', teachers_ids);
          const team_ids = teamsDetails.map((team) => team.id);
          totalNoOfTeams = team_ids.length.toString();
          if (team_ids.length > 0) {
            const studentsDetails = await C4caStudents.query().whereIn('team_id', team_ids);
            const students_ids = studentsDetails.map((student) => student.id);
            if (students_ids.length > 0) {
              totalNoOfStundents = students_ids.length.toString();
              const totalProjectsSubmissionByTeams = await C4caTeamProjectSubmitSolution.query()
                .whereIn('team_id', team_ids)
                .count('id');
              totalProjectsSubmitByTeams = totalProjectsSubmissionByTeams[0].count;
              particularParterDetails = {
                totalNoOfTeams,
                totalNoOfStundents,
                totalProjectsSubmitByTeams,
              };
              return [null, particularParterDetails];
            }

            return [null, dataNotFound];
          }

          return [null, dataNotFound];
        }

        return [null, dataNotFound];
      }
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getAllAttemptAssessment(user_id, team_id) {
    const { assessmentOutcome } = this.server.models();
    try {
      const user_team = team_id ? { team_id } : { user_id };
      const { data } = await strapi.findOne('pathways', C4CA_PATHWAY_ID, {
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

  // get all c4ca roles by user id
  async getAllC4caRolesByUserId(user_id) {
    const { C4caRole } = this.server.models();
    try {
      const c4caRoles = await C4caRole.query().where('user_id', user_id).select('role');
      const roles = c4caRoles.map(function (role) {
        return role.role;
      });
      return roles;
    } catch (error) {
      logger.error(JSON.stringify(error));
      return null;
    }
  }

  async getTeacherById(teachers_id) {
    const { C4caPartners, C4caTeachers, Facilitator } = this.server.models();
    try {
      let combinedData = {};
      const teachersDetails = await C4caTeachers.query().where('id', teachers_id);
      if (teachersDetails.length > 0) {
        const facilitatorDetails = await Facilitator.query().where(
          'id',
          teachersDetails[0].facilitator_id
        );
        if (facilitatorDetails.length > 0) {
          const partnerDetails = await C4caPartners.query().where(
            'id',
            facilitatorDetails[0].c4ca_partner_id
          );
          if (partnerDetails.length > 0) {
            const partner_name = { partner_name: partnerDetails[0].name };
            const facilitator_name = { facilitator_name: facilitatorDetails[0].name };
            const teacher_name = { teacher_name: teachersDetails[0].name };
            combinedData = { ...partner_name, ...facilitator_name, ...teacher_name };
            return [null, combinedData];
          }

          const partner_name = { partner_name: 'Partner not found' };
          const facilitator_name = { facilitator_name: facilitatorDetails[0].name };
          const teacher_name = { teacher_name: teachersDetails[0].name };
          combinedData = { ...partner_name, ...facilitator_name, ...teacher_name };
          return [null, combinedData];
        }

        const partner_name = { partner_name: 'Partner not found' };
        const facilitator_name = { facilitator_name: 'Facilitator not found' };
        const teacher_name = { teacher_name: teachersDetails[0].name };
        combinedData = { ...partner_name, ...facilitator_name, ...teacher_name };
        return [null, combinedData];
      }
      const partner_name = { partner_name: 'Partner not found' };
      const facilitator_name = { facilitator_name: 'Facilitator not found' };
      const teacher_name = { teacher_name: 'Teacher not found' };
      combinedData = { ...partner_name, ...facilitator_name, ...teacher_name };
      return [null, combinedData];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }
};
