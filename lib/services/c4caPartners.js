const CONSTANTS = require('../config');
const Schmervice = require('schmervice');
const axios = require('axios');

const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');

module.exports = class C4caPartnerService extends Schmervice.Service {
  // delete the partner by the ID
  async deleteC4caPartner(id) {
    try {
      const { C4caPartners } = this.server.models();

      // Find the partner by its ID and delete it
      await C4caPartners.query().throwIfNotFound().where('id', id).del();
      return [
        null,
        {
          status: 'true',
          message: `Partner with id:${id} and its corresponding data is deleted.`,
        },
      ];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getC4caPartnerBy(id) {
    try {
      const { C4caPartners } = this.server.models();
      const data = await C4caPartners.query().throwIfNotFound().where('id', id);
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
  

  async c4caPartnerUpdataBy(id, data) {
    const { C4caPartners,User,C4caRole } = this.server.models();
    try {
      let userID
      const oldData = await C4caPartners.query().throwIfNotFound().findById(id);
      let point_of_contact_data = await User.query().where('email', data.email).first();
      let point_of_contact_oldData = await User.query().where('email', oldData.email).first();
      if (oldData.email !== data.email) {
        let oldUserID = parseInt(point_of_contact_oldData.id)
        if (point_of_contact_oldData.c4ca_partner_id != null) {
          await User.query().throwIfNotFound().patchAndFetchById(oldUserID, {'c4ca_partner_id':null});
          await C4caRole.query().where('user_id', oldUserID).andWhere('role','partner').del();
          logger.info(`removing the partner role to the user ${oldUserID}`);
        }
      }
      if (point_of_contact_data !== null && point_of_contact_data !== undefined) {
        userID = parseInt(point_of_contact_data.id);
        let { c4ca_partner_id } = point_of_contact_data;
        if (c4ca_partner_id != null && c4ca_partner_id != id) {
          return [
            {
              Error: true,
              code: 403,
              message: `This point of contact is already associated with another partner!`,
            },
          ];
        }
        let roleAdmin = await C4caRole.query().where('user_id', userID).andWhere('role', 'admin');
        if (roleAdmin.length > 0) {
          return [
            {
              Error: true,
              code: 403,
              message: `This user has Admin access, You can't make this user into point of contact to this c4caPartner!`,
            },
          ];
        }
        let rolePrt = await C4caRole.query().where('user_id', userID).andWhere('role', 'c4caPartner');
        if (rolePrt.length === 0) {
          await C4caRole.query().insert({ role: 'c4caPartner', user_id: userID });

          logger.info(`giving the c4caPartner role to the user ${userID}`);
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
      const updateData = await C4caPartners.query().throwIfNotFound().patchAndFetchById(id, data);
      if (updateData){
        await User.query().throwIfNotFound().patchAndFetchById(userID, {'c4ca_partner_id':id})
        let rolePrt = await C4caRole.query()
              .where('user_id', userID)
              .andWhere('role', 'c4caPartner')
              .first();
        if (!rolePrt) {
          await C4caRole.query().insert({ role: 'c4caPartner', user_id: userID });
          logger.info(`Giving the partner role to the user :${userID}`);
        }
      }
      return [null, updateData];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async createC4caPartner(data) {
    const { C4caPartners, User, C4caRole } = this.server.models();
    try {
      let userID;
      let point_of_contact_data = await User.query().where('email', data.email).first();
      if (point_of_contact_data !== null && point_of_contact_data !== undefined) {
        userID = parseInt(point_of_contact_data.id);
        let { c4ca_partner_id } = point_of_contact_data;
        if (c4ca_partner_id != null) {
          return [
            {
              Error: true,
              code: 403,
              message: `This point of contact is already associated with another c4caPartner!`,
            },
          ];
        }
        let roleAdmin = await C4caRole.query().where('user_id', userID).andWhere('role', 'admin');
        if (roleAdmin.length > 0) {
          return [
            {
              Error: true,
              code: 403,
              message: `This user has Admin access, You can't make this user into point of contact to this partner!`,
            },
          ];
        }
        let rolePrt = await C4caRole.query().where('user_id', userID).andWhere('role', 'c4caPartner');
        if (rolePrt.length === 0) {
          await C4caRole.query().insert({ role: 'c4caPartner', user_id: userID });

          logger.info(`Giving the c4caPartner role to the user ${userID}`);
        }
      } else {
        point_of_contact_data = await User.query().insert({
          email: data.email,
          name: data.point_of_contact,
          contact: data.phone_number,
        });
      }
      const res = await C4caPartners.query().insert(data);
      if (res) {
        userID = parseInt(point_of_contact_data.id);
        let re = await User.query()
          .throwIfNotFound()
          .patchAndFetchById(userID, { c4ca_partner_id: res.id });
        let rolePrt = await C4caRole.query()
          .where('user_id', userID)
          .andWhere('role', 'c4caPartner')
          .first();
        if (!rolePrt) {
          await C4caRole.query().insert({ role: 'c4caPartner', user_id: userID });
          logger.info(`Giving the c4caPartner role to the user: ${userID}'}`);
        }
      }
      return [null, { status: true, message: 'c4caPartner created successfully!', data: res }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getAllC4caPartnerData(limit, offset) {
    const { C4caPartners } = this.server.models();
    try {
      let data = await C4caPartners.query().page(offset, limit).withGraphFetched('teachers.teams_data');
      
      data.results.map((result) => {
        const {teachers } = result;
        let counts = 0
        if (teachers && teachers.length > 0) {
          for (let teacher of teachers){
              if(teacher.teams_data && teacher.teams_data.length > 0){
                  for(let team of teacher.teams_data){
                      counts += team.team_size;
                  }
              }
          }
        }
        delete result.teachers;
        return result.no_of_students = counts;
      })
      
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async createFacilitator(data) {
    const { Facilitator, User, C4caRole } = this.server.models();

    try {
      let userID;
      let point_of_contact_data = await User.query().where('email', data.email).first();
      if (point_of_contact_data !== null && point_of_contact_data !== undefined) {
        userID = parseInt(point_of_contact_data.id);
        let { c4ca_facilitator_id, c4ca_partner_id } = point_of_contact_data;
        if (c4ca_facilitator_id != null || c4ca_partner_id != null) {
          return [
            {
              Error: true,
              code: 403,
              message: `This point of contact is already associated with another partner!`,
            },
          ];
        }
        let roleAdmin = await C4caRole.query().where('user_id', userID).andWhere('role', 'admin');
        if (roleAdmin.length > 0) {
          return [
            {
              Error: true,
              code: 403,
              message: `This user has Admin access, You can't make this user into point of contact to this partner!`,
            },
          ];
        }
        let rolePrt = await C4caRole.query()
          .where('user_id', userID)
          .andWhere('role', 'facilitator');
        if (rolePrt.length === 0) {
          await C4caRole.query().insert({ role: 'facilitator', user_id: userID });

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
            c4ca_partner_id: data.c4ca_partner_id,
          });
        let rolePrt = await C4caRole.query()
          .where('user_id', userID)
          .andWhere('role', 'facilitator')
          .first();
        if (!rolePrt) {
          await C4caRole.query().insert({ role: 'facilitator', user_id: userID });
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
