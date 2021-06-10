const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');
const CONSTANTS = require('../config');
const axios = require('axios');
module.exports = class PartnerService extends Schmervice.Service {
  async getAllPartner(txn) {
    const { Partner } = this.server.models();
    let partner;
    try {
      partner = await Partner.query(txn).orderBy('name').withGraphFetched('users');
      return [null, partner];
    } catch (err) {
      return [err, errorHandler(err)];
    }
  }

  async getPartnerUsersDetails(partnerId, query) {
    const { User } = this.server.models();
    const { limit, page } = query;
    const offset = (page - 1) * limit;
    let res;
    try {
      res = await User.query()
        .skipUndefined()
        .orderBy('id')
        .limit(limit)
        .offset(offset)
        .where('partner_id', partnerId)
        .withGraphFetched('[registrations, classes, classes.[facilitator]]');
      res.forEach((allClasses) => {
        allClasses.classes.forEach((data) => {
          if (data.facilitator_id !== null) {
            data.facilitator_name = data.facilitator.name;
            data.facilitator_email = data.facilitator.email;
          }
          delete data.facilitator;
        });
      });

      return [null, res];
    } catch (err) {
      return [err, errorHandler(err)];
    }
  }

  async meraki_link(partner_id) {
    const { Partner } = this.server.models();
    const merakiLink =
      'https://play.google.com/store/apps/details?id=org.merakilearn&referrer=utm_source%3Dwhatsapp%26utm_content%3Dpartner_id%253A' +
      partner_id;
    const merakiShortLink = await axios
      .post(
        'https://api-ssl.bitly.com/v4/shorten',
        {
          long_url: merakiLink,
          domain: 'bit.ly',
        },
        {
          headers: {
            Authorization: `Bearer ${CONSTANTS.bitly.token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      .catch((err) => console.log(err));

    const all = await Partner.query().upsertGraph({
      id: partner_id,
      meraki_link: merakiShortLink.data.link,
    });
    return await Partner.query().where('id', partner_id);
  }
};
