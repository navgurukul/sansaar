const CONSTANTS = require('../config');
const Schmervice = require('schmervice');

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
    const { C4caPartners } = this.server.models();
    const { userService,mailSender } = this.server.services();
    try {

    const [err, red] = await userService.getUserByEmail(data.email)
        if (err) {
            // await mailSender.sendEmail(data.email, 'C4CA Partner', 'Your C4CA Partner account has been created. Please login to your account link: https://c4ca.in/partner.');
            logger.error(JSON.stringify(err)+ 'sending mail to the user');
        }
    const res = await C4caPartners.query().throwIfNotFound().patchAndFetchById(id, data);
    return [null, res];
    } catch (err) {
    return [errorHandler(err), null];
    }
  }

  async createC4caPartner(data) {
    const { C4caPartners,User,UserRole } = this.server.models();
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
              message: `This point of contact is already associated with another partner!`,
            },
          ];
        }
        let roleAdmin = await UserRole.query().where('user_id', userID).andWhere('role', 'admin');
        if (roleAdmin.length > 0) {
          return [
            {
              Error: true,
              code: 403,
              message: `This user has Admin access, You can't make this user into point of contact to this partner!`,
            },
          ];
        }
        let rolePrt = await UserRole.query().where('user_id', userID).andWhere('role', 'partner');
        if (rolePrt.length === 0) {
          await UserRole.query().insert({ role: 'partner', user_id: userID });

          logger.info('giving the partner role to the user');
        }
      } else{
        point_of_contact_data = await User.query().insert({"email":data.email, 'name':data.point_of_contact,'contact':data.phone_number});
      }
      const res = await C4caPartners.query().insert(data);
      if (res){
        userID = parseInt(point_of_contact_data.id)
        let re = await User.query().throwIfNotFound().patchAndFetchById(userID,{'c4ca_partner_id': res.id})
        let rolePrt = await UserRole.query().where('user_id', userID).andWhere('role', 'partner').first();
        if (!rolePrt) {
          await UserRole.query().insert({ role: 'partner', user_id: userID });
          logger.info('Giving the partner role to the user');
        }
      }
      return [null, {status:true, message:'partner created successfully!',data:res}]
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getAllC4caPartnerBatch(page,_limit) {
    const { C4caPartners } = this.server.models();
    try{
      let data = await C4caPartners.query().select('*').offset((page - 1) * _limit).limit(_limit);
      let dataCount = await C4caPartners.query().count()
      return [null,{data:data,total_count:parseInt(dataCount[0].count)}]
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
