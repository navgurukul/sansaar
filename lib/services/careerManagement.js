const CONSTANTS = require('../config');
const Schmervice = require('schmervice');
const axios = require('axios');

const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');

module.exports = class CareerManagementService extends Schmervice.Service {
  // up
  async deleteClusterManagerBy(id) {
    try {
      const { ClusterManager } = this.server.models();

      await ClusterManager.query().throwIfNotFound().where('id', id).del();
      return [
        null,
        {
          status: 'true',
          message: `Cluster Manager with id:${id} data deleted successfully.`,
        },
      ];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // up
  async getClusterManagerBy(id) {
    try {
      const { ClusterManager } = this.server.models();
      const data = await ClusterManager.query().throwIfNotFound().where('id', id);
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
  
  // up
  async clusterManagerUpdataBy(id, data) {
    const { ClusterManager, User, CareerRoles } = this.server.models();
    try {
      let userID
      const oldData = await ClusterManager.query().throwIfNotFound().findById(id);
      let point_of_contact_data = await User.query().where('email', data.email).first();
      let point_of_contact_oldData = await User.query().where('email', oldData.email).first();
      if (oldData.email !== data.email) {
        let oldUserID = parseInt(point_of_contact_oldData.id)
        if (point_of_contact_oldData.cluster_manager_id != null) {
          await User.query().throwIfNotFound().patchAndFetchById(oldUserID, {'cluster_manager_id':null});
          await CareerRoles.query().where('user_id', oldUserID).andWhere('role','clusterManager').del();
          logger.info(`removing the cluster manager role for user ${oldUserID}`);
        }
      }
      if (point_of_contact_data !== null && point_of_contact_data !== undefined) {
        userID = parseInt(point_of_contact_data.id);
        let { cluster_manager_id } = point_of_contact_data;
        if (cluster_manager_id != null && cluster_manager_id != id) {
          return [
            {
              Error: true,
              code: 403,
              message: `This point of contact is already associated with another cluster manager!`,
            },
          ];
        }
        let roleAdmin = await CareerRoles.query().where('user_id', userID).andWhere('role', 'admin');
        if (roleAdmin.length > 0) {
          return [
            {
              Error: true,
              code: 403,
              message: `This user has Admin access, You can't make this user into point of contact to this c4caPartner!`,
            },
          ];
        }
        let rolePrt = await CareerRoles.query().where('user_id', userID).andWhere('role', 'clusterManager');
        if (rolePrt.length === 0) {
          await CareerRoles.query().insert({ role: 'clusterManager', user_id: userID });

          logger.info(`Giving access of Cluster Managet to ${userID}`);
        }
      } else {
        point_of_contact_data = await User.query().insert({
          email: data.email,
          name: data.point_of_contact_name,
          contact: data.phone_number,
        });
        userID = parseInt(point_of_contact_data.id);
        logger.info(`inserted data into users table user_id:${userID}`);

      }
      data.point_of_contact = data.point_of_contact_name
      delete  data.point_of_contact_name
      const updateData = await ClusterManager.query().throwIfNotFound().patchAndFetchById(id, data);
      if (updateData){
        await User.query().throwIfNotFound().patchAndFetchById(userID, {'cluster_manager_id':id})
        let rolePrt = await CareerRoles.query()
              .where('user_id', userID)
              .andWhere('role', 'clusterManager')
              .first();
        if (!rolePrt) {
          await CareerRoles.query().insert({ role: 'clusterManager', user_id: userID });
          logger.info(`Giving the cluster Manager role to the user :${userID}`);
        }
      }
      return [null, updateData];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // up
  async createClusterManager(data) {
    const { ClusterManager, User, CareerRoles } = this.server.models();
    try {
      // Validate input data
      if (!data.email || !data.point_of_contact || !data.phone_number) {
        throw new Error('Missing required fields: email, point_of_contact, or phone_number');
      }

      let userID;
      let point_of_contact_data = await User.query().where('email', data.email).first();
      if (point_of_contact_data !== null && point_of_contact_data !== undefined) {
        userID = parseInt(point_of_contact_data.id);
        let { cluster_manager_id } = point_of_contact_data;
        if (cluster_manager_id != null) {
          return [
            {
              Error: true,
              code: 403,
              message: `This point of contact is already associated with another cluster manager!`,
            },
          ];
        }
        let roleAdmin = await CareerRoles.query().where('user_id', userID).andWhere('role', 'admin');
        if (roleAdmin.length > 0) {
          return [
            {
              Error: true,
              code: 403,
              message: `This user has Admin access, You can't make this user a cluster manager!`,
            },
          ];
        }
        let rolePrt = await CareerRoles.query().where('user_id', userID).andWhere('role', 'clusterManager');
        if (rolePrt.length === 0) {
          await CareerRoles.query().insert({ role: 'clusterManager', user_id: userID });

          logger.info(`clusterManager access granted to user ${userID}`);
        }
      } else {
        point_of_contact_data = await User.query().insert({
          email: data.email,
          name: data.point_of_contact,
          contact: data.phone_number,
        });
      }
      const res = await ClusterManager.query().insert(data);
      if (res) {
        userID = parseInt(point_of_contact_data.id);
        let re = await User.query()
          .throwIfNotFound()
          .patchAndFetchById(userID, { cluster_manager_id: res.id });
        let rolePrt = await CareerRoles.query()
          .where('user_id', userID)
          .andWhere('role', 'clusterManager')
          .first();
        if (!rolePrt) {
          await CareerRoles.query().insert({ role: 'clusterManager', user_id: userID });
          logger.info(`Giving the Cluster Manager role to the user: ${userID}'}`);
        }
      }
      return [null, { status: true, message: 'Cluster Manager created successfully!', data: res }];
    } catch (err) {
      logger.error(`Error creating Cluster Manager: ${err.message}`);
      return [errorHandler(err), null];
    }
  }

  // up
  async getAllClusterManagers(limit, offset) {
    const { ClusterManager } = this.server.models();
    try {
      let data = await ClusterManager.query().page(offset, limit).withGraphFetched('career_teachers.teams_data');
      console.dir(data.results);
      console.log('-----from career management service admin view api');
      data.results.map((result) => {
        const { career_teachers } = result;
        let counts = 0;
        if (career_teachers && career_teachers.length > 0) {
          for (let teacher of career_teachers) {
            if (teacher.teams_data && teacher.teams_data.length > 0) {
              for (let team of teacher.teams_data) {
                counts += team.team_size;
              }
            }
          }
        }
        delete result.career_teachers;
        return result.no_of_students = counts;
      });
      
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async createFacilitator(data) {
    const { Facilitator, User, CareerRoles } = this.server.models();

    try {
      let userID;
      let point_of_contact_data = await User.query().where('email', data.email).first();
      if (point_of_contact_data !== null && point_of_contact_data !== undefined) {
        userID = parseInt(point_of_contact_data.id);
        let { c4ca_facilitator_id, cluster_manager_id } = point_of_contact_data;
        if (c4ca_facilitator_id != null || cluster_manager_id != null) {
          return [
            {
              Error: true,
              code: 403,
              message: `This point of contact is already associated with another partner!`,
            },
          ];
        }
        let roleAdmin = await CareerRoles.query().where('user_id', userID).andWhere('role', 'admin');
        if (roleAdmin.length > 0) {
          return [
            {
              Error: true,
              code: 403,
              message: `This user has Admin access, You can't make this user into point of contact to this partner!`,
            },
          ];
        }
        let rolePrt = await CareerRoles.query()
          .where('user_id', userID)
          .andWhere('role', 'facilitator');
        if (rolePrt.length === 0) {
          await CareerRoles.query().insert({ role: 'facilitator', user_id: userID });

          logger.info('giving the partner role to the user');
        }
      } else {
        point_of_contact_data = await User.query().insert({
          email: data.email,
          name: data.name,
          contact: data.phone_number,
        });
      }
      data.web_link = 'link';
      const res = await Facilitator.query().insert(data);
      if (res) {
        userID = parseInt(point_of_contact_data.id);
        let re = await User.query()
          .throwIfNotFound()
          .patchAndFetchById(userID, {
            c4ca_facilitator_id: res.id,
            cluster_manager_id: data.cluster_manager_id,
          });
        let rolePrt = await CareerRoles.query()
          .where('user_id', userID)
          .andWhere('role', 'facilitator')
          .first();
        if (!rolePrt) {
          await CareerRoles.query().insert({ role: 'facilitator', user_id: userID });
          logger.info(`Giving the facilitator role to the user${userID}`);
        }
      }
      return [
        null,
        { status: true, message: 'createFacilitator created successfully!', data: res },
      ];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async c4caTeacherInviteLink(partner_id, facilitator_id) {
    const { Facilitator } = this.server.models();
    try {
      const main_or_merd = process.env.code_folding_mode;
      
      let c4ca_web_link;
      if (main_or_merd == 'main') {
         c4ca_web_link = CONSTANTS.c4ca_teacher_link
          .replace('partner_id_val', partner_id)
          .replace('facilitator_id_val', facilitator_id);
      } else{
        c4ca_web_link = CONSTANTS.c4ca_teacher_link_dev
          .replace('partner_id_val', partner_id)
          .replace('facilitator_id_val', facilitator_id);
      }

      let webShortLink;
      try {
        // this code will make the bitly link
        [webShortLink] = await Promise.all([
          axios.post(
            'https://api-ssl.bitly.com/v4/shorten',
            {
              long_url: c4ca_web_link,
              domain: 'bit.ly',
            },
            {
              headers: {
                Authorization: `Bearer ${CONSTANTS.bitly.token}`,
                'Content-Type': 'application/json',
              },
            }
          )
        ]);
      } catch (err) {
        return [errorHandler(err), null];
      }
        let data = await Facilitator.query().throwIfNotFound().patchAndFetchById(facilitator_id, {
        web_link: webShortLink.data.link
      });
      return [null, data];  
    } catch (err) {
      return [errorHandler(err), null];
    } 
  }
};
