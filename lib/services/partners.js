/* eslint-disable import/order */
/* eslint-disable no-return-await */
/* eslint-disable no-console */
const CONSTANTS = require('../config');
const axios = require('axios');
const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');

module.exports = class PartnerService extends Schmervice.Service {
  async getAllPartner(query) {
    const { Partner } = this.server.models();
    const { limit, page } = query;
    const offset = (page - 1) * limit;
    let partner;
    try {
      partner = await Partner.query()
        .skipUndefined()
	.orderBy('name')
        .limit(limit)
        .offset(offset)
        .withGraphFetched('users');
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
    const merakiLink = `${CONSTANTS.meraki_link_url}${partner_id}`;
    // eslint-disable-next-line no-undef
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

    await Partner.query().upsertGraph({
      id: partner_id,
      meraki_link: merakiShortLink.data.link,
    });
    return await Partner.query().where('id', partner_id);
  }
};
