const CONSTANTS = require('../config');
const Schmervice = require('schmervice');
const axios = require('axios');
const crypto = require('crypto');

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
      const data = await ClusterManager.query()
        .where('id', id)
        .orderBy('created_at', 'desc')
        .withGraphFetched('career_teachers')
        .first();
      if (!data) {
        return [
          {
            code: 404,
            error: true,
            message: `Cluster Manager with id ${id} not found`
          }, 
          null
        ];
      }
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
  
  // up
  async clusterManagerUpdateBy(id, data) {
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
  async getAllClusterManagers(limit = 10, offset = 0) {
    const { ClusterManager } = this.server.models();
    try {
      // First get total count
      const totalCountResult = await ClusterManager.query().count('id as count').first();
      const totalCount = parseInt(totalCountResult.count);

      // Handle case when limit/offset are undefined or null
      const safeLimit = limit || 10;
      const safeOffset = offset || 0;
      
      // Get paginated data with relations
      const data = await ClusterManager.query()
        .orderBy('created_at', 'desc')
        .limit(safeLimit)
        .offset(safeOffset);

      if (!data) {
        return [null, { results: [], total: 0 }];
      }

      const processedResults = data.map((result) => {
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
        const newResult = { ...result };
        delete newResult.career_teachers;
        newResult.no_of_students = counts;
        return newResult;
      });

      return [null, { 
        results: processedResults, 
        total: totalCount 
      }];
      
    } catch (err) {
      console.error('Error in getAllClusterManagers:', err);
      return [errorHandler(err), null];
    }
  }
  
  async careerTeacherInviteLink(admin_id, manager_id) {
    const { ClusterManager, User } = this.server.models();

    try {
      // Verify if the admin exists
      const admin = await User.query().findById(admin_id).throwIfNotFound();
      if (!admin) {
        return [{ message: "Admin not found" }, null];
      }

      // Check if a web link already exists
      const existingWebLink = await ClusterManager.query()
        .select("web_link")
        .where("admin_id", admin_id)
        .whereNotNull("web_link")
        .first();

      if (existingWebLink && existingWebLink.web_link) {
        return [null, {
          short_url: existingWebLink.web_link,
          isExisting: true
        }];
      }

      // Determine the base URL based on the environment
      const baseUrl = process.env.code_folding_mode === "main"
        ? CONSTANTS.career_teacher_link
        : CONSTANTS.career_teacher_link_dev;

      // Create tracking URL with admin and manager IDs
      const utmParams = new URLSearchParams({
        utm_source: "whatsapp",
        utm_content: `admin_id:${admin_id},cluster_manager_id:${manager_id}`,
      });
      const long_url = `${baseUrl}?referrer=${utmParams.toString()}`;
      try {
        // Generate a short code using a hash of the parameters
        const hashInput = `${admin_id}-${manager_id}-${Date.now()}`;
        const shortCode = crypto
          .createHash('md5')
          .update(hashInput)
          .digest('hex')
          .substring(0, 8);

        // Create the short URL using your domain
        const shortUrl = `${process.env.CAREER_EXP_URL_DEV || 'http://localhost:5000'}/r/${shortCode}`;

        // Update the cluster manager with the short link
        const updatedManager = await ClusterManager.query()
          .patchAndFetchById(manager_id, {
            web_link: long_url,
            admin_id: admin_id,
            short_code: shortCode
          });

        return [null, {
          short_code: shortCode,
        }];

      } catch (err) {
        console.error("URL Shortener Error:", err);
        return [{ 
          message: "Failed to generate short URL",
          error: err.message 
        }, null];
      }

    } catch (err) {
      console.error("Career Teacher Invite Link Error:", err);
      return [errorHandler(err), null];
    }
  }

  async getOriginalUrl(shortCode) {
    const { ClusterManager } = this.server.models();

    try {
      // Find the cluster manager with the given short code
      const weblink = await ClusterManager.query()
        .select("web_link")
        .where('short_code', shortCode)
        .first();
      if (!weblink) {
        return [{ message: "data not found" }, null];
      }

      return [null, weblink.web_link];

    } catch (err) {
      console.error("Get Full Web Link Error:", err);
      return [errorHandler(err), null];
    }
  }
};
