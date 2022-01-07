/* eslint-disable import/order */
/* eslint-disable no-return-await */
/* eslint-disable no-console */
const CONSTANTS = require('../config');
const axios = require('axios');
const Schmervice = require('schmervice');
const _ = require('lodash');
const csv = require('csv-parser');
const fs = require('fs');
const { errorHandler } = require('../errorHandling');

module.exports = class PartnerService extends Schmervice.Service {
  async getAllPartner(query) {
    const { Partner } = this.server.models();
    const { limit, page, name } = query;
    const offset = (page - 1) * limit;
    let partner;
    try {
      if (name) {
        partner = await Partner.query()
          .skipUndefined()
          .whereRaw(`LOWER(name) LIKE ?`, [`%${name.trim().toLowerCase()}%`])
          .orderBy('name')
          .withGraphFetched('users');
      } else {
        partner = await Partner.query()
          .skipUndefined()
          .orderBy('name')
          .limit(limit)
          .offset(offset)
          .withGraphFetched('users');
      }
      const length = await Partner.query().count();
      const data = { partners: partner, count: length[0].count };
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getPartnerUsersDetails(partnerId, query) {
    const { User } = this.server.models();
    const { limit, page, name } = query;
    const offset = (page - 1) * limit;
    let students;
    try {
      if (name) {
        students = await User.query()
          .skipUndefined()
          .where('partner_id', partnerId)
          .whereRaw(`LOWER(name) LIKE ?`, [`%${name.trim().toLowerCase()}%`])
          .orderBy('name')
          .withGraphFetched('[registrations, classes, classes.[facilitator]]');
      } else {
        students = await User.query()
          .skipUndefined()
          .orderBy('id')
          .limit(limit)
          .offset(offset)
          .where('partner_id', partnerId)
          .withGraphFetched('[registrations, classes, classes.[facilitator]]');
      }
      students.forEach((allClasses) => {
        allClasses.classes.forEach((data) => {
          if (data.facilitator_id !== null) {
            data.facilitator_name = data.facilitator.name;
            data.facilitator_email = data.facilitator.email;
          }
          delete data.facilitator;
        });
      });
      const length = await User.query().where('partner_id', partnerId).count();
      const data = { students, count: length[0].count };

      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async partnerSpecificLink(platform, partnerId) {
    const { Partner } = this.server.models();
    const partner = await Partner.query().where('id', partnerId);
    const partnerName = encodeURIComponent(partner[0].name).replace(/%20/g, '+');
    let merakiLink;
    if (platform === 'web') {
      merakiLink = `${CONSTANTS.web_link_url}${partnerId}`;
    } else if (platform === 'android') {
      merakiLink = `${CONSTANTS.meraki_link_url}${partnerId}`;
    }
    merakiLink = merakiLink.replace('partner_name', partnerName);
    // eslint-disable-next-line no-undef
    let merakiShortLink;
    try {
      merakiShortLink = await axios.post(
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
      );
    } catch (err) {
      return { error: true, message: 'Something went wrong. Please try again later' };
    }

    if (platform === 'web') {
      return Partner.query()
        .throwIfNotFound()
        .patchAndFetchById(partnerId, { web_link: merakiShortLink.data.link });
    }
    return Partner.query()
      .throwIfNotFound()
      .patchAndFetchById(partnerId, { meraki_link: merakiShortLink.data.link });
  }

  async getPartnerUser(email, partnerId) {
    const { User } = this.server.models();
    let partnerUser;
    try {
      partnerUser = await User.query().where('email', email);
      if (partnerUser.length > 0) {
        if (partnerUser[0].partner_id == null) {
          await User.query()
            .update({
              name: partnerUser[0].name,
              email: partnerUser[0].email,
              partner_id: partnerId,
            })
            .where('id', partnerUser[0].id);
        } else {
          return { error: `true`, message: 'partner_id is already assigned for this user.' };
        }
        return { status: `success`, message: `user added successfully to ${partnerId} partner.` };
        // eslint-disable-next-line
      } else {
        return { error: `true`, message: `user not exist. please verify your email` };
      }
    } catch (err) {
      return { error: true, message: 'Something went wrong. Please try again later' };
    }
  }

  async updatePartnerUser(userId, userName) {
    const { User } = this.server.models();
    try {
      const partnerUser = await User.query().findById(userId);
      const updatepartneruser = await User.query()
        .update({
          name: userName,
          email: partnerUser.email,
        })
        .where('id', userId);
      return [null, updatepartneruser];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async removeAnUserFromPartner(userId) {
    const { User } = this.server.models();
    try {
      const partnerUser = await User.query().findById(userId);
      const removeAnPartnerUser = await User.query()
        .update({
          name: partnerUser.name,
          email: partnerUser.email,
          partner_id: null,
        })
        .where('id', userId);
      return [null, removeAnPartnerUser];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async partnerGroup(filename) {
    const {
      PartnerGroup,
      PartnerRelationship,
      PartnerGroupRelationship,
      PartnerGroupUser,
    } = this.server.models();
    let partnergroup;
    try {
      const partnerGroupData = [];
      // eslint-disable-next-line
      fs.createReadStream('/home/andy/navgurukul/sansaar/partnerGroupsData/' + filename)
        .pipe(csv())
        .on('data', (data) => partnerGroupData.push(data))
        .on('end', async () => {
          console.log(partnerGroupData, 'partnerGroupData');
          // eslint-disable-next-line
          for (const item of partnerGroupData) {
            // eslint-disable-next-line
            partnergroup = await PartnerGroup.query().insert({
              name: item.Partner_Group,
            });
            /* eslint-disable */
            const partner_group = await PartnerGroup.query();
            // .withGraphFepartner_grouptched({
            //   partner_relationship: true,
            //   partner_group_relationship: true,
            // });
            item.Partners = item.Partners.split(';');
            if (item.Partners.length > 1 || item.Partners[0] !== '') {
              _.map(item.Partners, async (partnerId) => {
                await PartnerRelationship.query().insert({
                  partner_id: parseInt(partnerId),
                  partner_group_id: partnergroup.id,
                });
              });
            }

            item['emails (partner view access role)'] = item[
              'emails (partner view access role)'
            ].split(';');
            if (
              item['emails (partner view access role)'].length > 1 ||
              item['emails (partner view access role)'][0] !== ''
            ) {
              _.map(item['emails (partner view access role)'], async (email) => {
                await PartnerGroupUser.query().insert({
                  partner_group_id: partnergroup.id,
                  email: email,
                });
              });
            }
          }
          for (let j of partnerGroupData) {
            const memberOf = await PartnerGroup.query().where('name', j.Partner_Group);
            j['Sub groups'] = j['Sub groups'].split(';');
            // console.log(j['Sub groups'], "j['Sub groups']", j['Sub groups'].length, 'length');
            if (j['Sub groups'].length > 1 || j['Sub groups'][0] !== '') {
              _.map(j['Sub groups'], async (subGroup) => {
                const subGroupNames = await PartnerGroup.query().where('name', subGroup);
                console.log(
                  {
                    partner_group_id: subGroupNames[0].id,
                    member_of: memberOf[0].id,
                  },
                  '@@@@@@ Member_of @@@@@@@\n\n'
                );
                await PartnerGroupRelationship.query().insert({
                  partner_group_id: subGroupNames[0].id,
                  member_of: memberOf[0].id,
                });
              });
            }
          }
        });
      return [null, true];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
