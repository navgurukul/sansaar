/* eslint-disable import/order */
/* eslint-disable no-return-await */
/* eslint-disable no-console */
const CONSTANTS = require('../config');
const axios = require('axios');
const Schmervice = require('schmervice');
const _ = require('lodash');
const csv = require('csv-parser');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const { async } = require('crypto-random-string');

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

  async getPartnerIdByPartnerName(name) {
    const { Partner } = this.server.models();
    let partner;
    try {
      partner = await Partner.query().where('name', name);
      return [null, partner];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getPartnerUsersDetails(partnerId, query) {
    const { User, Partner, UserRole } = this.server.models();
    const { limit, page, name } = query;
    const offset = (page - 1) * limit;
    let students;
    let count = 0;
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
      let student = [];
      for (let user of students) {
        let a = await UserRole.query().where('user_id', user.id);
        if (a.length == 0) {
          count += 1; //count the number of students without having any role.
          student.push(user);
          students = student;
        }
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
      // const length = await User.query().where('partner_id', partnerId).count();
      const partner_name = await Partner.query().select('name').where('id', partnerId);
      const data = { students, count, partner_name: partner_name[0].name };
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async partnerSpecificLink(platform, partnerId) {
    const { Partner } = this.server.models();
    const partner = await Partner.query().where('id', partnerId);
    if (partner == null || partner == undefined || partner.length == 0) {
      return { error: true, message: 'Partner does not exist' };
    }
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

  /* eslint-disable */
  async assignPartnerRole() {
    const { Partner, User, UserRole } = this.server.models();
    return await Partner.query()
      .select('email', 'id')
      .then(async (data) => {
        for (var i of data) {
          if (i.email) {
            await User.query()
              .select('*')
              .where('email', i.email)
              .then(async (x) => {
                if (x.length > 0) {
                  if (x[0].partner_id === null) {
                    let partner_id = i.id;
                    await User.query()
                      .update({ name: x[0].name, email: x[0].email, partner_id })
                      .where('id', x[0].id);
                  }
                  try {
                    await UserRole.query().insert([
                      {
                        user_id: x[0].id,
                        role: 'partner',
                      },
                    ]);
                  } catch (e) {
                    logger.error(JSON.stringify(e));
                  }
                }
              });
          }
        }
        return 0;
      });
  }

  async assignPartnerRoleToTeacher() {
    const { PartnerUser, User, UserRole } = this.server.models();
    return await PartnerUser.query()
      .select('email', 'partner_id')
      .then(async (data) => {
        for (var i of data) {
          if (i.email) {
            await User.query()
              .select('*')
              .where('email', i.email)
              .then(async (x) => {
                if (x.length > 0) {
                  if (x[0].partner_id === null) {
                    let partner_id = i.partner_id;
                    await User.query()
                      .update({ name: x[0].name, email: x[0].email, partner_id })
                      .where('id', x[0].id);
                  }
                  try {
                    await UserRole.query().insert([
                      {
                        user_id: x[0].id,
                        role: 'partner',
                      },
                    ]);
                  } catch (e) {
                    logger.error(JSON.stringify(e));
                  }
                }
              });
          }
        }
        return 0;
      });
  }

  async getPartnerUser(email, partnerId) {
    const { User, Partner, UserRole } = this.server.models();
    let partnerUser;
    let parterName;
    let userRole;
    try {
      partnerUser = await User.query().where('email', email);
      if (partnerUser.length > 0) {
        //If users don't have any role then, In that case only a partner_id will be asign.
        userRole = await UserRole.query().where('user_id', partnerUser[0].id);
        if (userRole.length <= 0 || userRole == null || userRole == undefined) { 
          if (partnerUser[0].partner_id == null) {
            await User.query()
              .update({
                name: partnerUser[0].name,
                email: partnerUser[0].email,
                partner_id: partnerId,
              })
              .where('id', partnerUser[0].id);
            return { status: `success`, message: `user added successfully to ${partnerId} partner.` };
            // eslint-disable-next-line
          } else {
            parterName = await Partner.query().select('name').where('id', partnerUser[0].partner_id);
            return {
              error: `true`,
              message: `This Student is already associated with ${parterName[0].name}.`,
            };
          }
        }
        else {
          return { error: `true`, message: `Admins/Partners/Volunteers cannot be added as students` }
        }
        // eslint-disable-next-line
      } else {
        await User.query().insert({ name: email, email: email, partner_id: partnerId });
        return { status: `success`, message: `user added successfully to ${partnerId} partner.` };
      }
    } catch (err) {
      return { error: true, message: 'Please enter a valid email. For eg., literalstudent@gmail.com' };
    }
  }

  async arrayCall(arrayOfData) {
    console.log(arrayOfData);
    const promises = arrayOfData.map((data) => {
      if (
        !data.hasOwnProperty('name') ||
        !data.hasOwnProperty('email') ||
        data.name == null ||
        data.name == undefined ||
        !data.name.length ||
        !data.email.length ||
        data.email == null ||
        data.email == undefined
      ) {
        return {
          Error:
            'There is no name or email. And undefined or null data present there in the Object value ',
          data: data,
        };
      } else {
        return this.getPartnerUserIns(data);
      }
    });
    const results = await Promise.all(promises);
    // do something with the results here
    return results;
  }
  async getPartnerUserInside(studentData) {
    let { email, name, partner_id } = studentData;
    const { User, Partner, UserRole } = this.server.models();
    let existPartner = await Partner.query().where(id, partner_id);
    console.log('existPartner', existPartner);
    if (!existPartner.length) {
      return {
        error: true,
        message: `partner id is not exist`,
      };
    }

    let partnerUser;
    let parterName;
    let userRole;

    try {
      let partnerUser = await User.query().where('email', email);

      if (partnerUser.length > 0) {
        //If users don't have any role then, In that case only a space_id will be asign.
        userRole = await UserRole.query().where('user_id', partnerUser[0].id);
        if (userRole.length <= 0 || userRole == null || userRole == undefined) {
          if (partnerUser[0].space_id == null) {
            await User.query().where('id', partnerUser[0].id).update({
              email: email,
              partner_id: partner_id,
            });
            return {
              status: `success`,
              message: `update the partner_id student data successfully. `,
              partner_id: partner_id,
            };
            // eslint-disable-next-line
          } else {
            parterName = await Partner.query().select('name').where('id', existPartner[0].id);
            return {
              Error: `true`,
              message: `This Student is already associated with ${existPartner[0].id} partner. `,
            };
          }
        } else {
          return {
            Error: `true`,
            message: `Admins/Partners/Volunteers cannot be added as students `,
          };
        }
        // eslint-disable-next-line
      } else {
        await User.query().insert({ name: name, email: email, space_id: spaceID });
        return {
          status: `success`,
          message: `user added successfully to partner id:${existPartner[0].id}. `,
          space_id: spaceID,
        };
      }
    } catch (err) {
      return errorHandler(err);
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
    const { User, UserRole } = this.server.models();
    let userRole;
    try {
      const partnerUser = await User.query().findById(userId);
      userRole = await UserRole.query().where('user_id', partnerUser.id);
      if (userRole.length <= 0 || userRole === null || userRole === undefined) {
        const removeAnPartnerUser = await User.query()
          .update({
            name: partnerUser.name,
            email: partnerUser.email,
            partner_id: null,
          })
          .where('id', userId);
        return [null, removeAnPartnerUser];
      } else {
        return [null, 'Admins/Partners/Volunteers cannot be removed'];
      }
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getPartnerGroupData(partnerGroupId) {
    const { PartnerGroupRelationship, PartnerGroup, PartnerRelationship } = this.server.models();
    // eslint-disable-next-line
    let partnerGroupData = {};
    let total_no_of_partners = 0;
    let total_no_of_students = 0;
    let is_base_group = true;
    let base_inp = false;
    try {
      const partnerSubGroups = await PartnerGroupRelationship.query()
        .select('partner_group_id')
        .where('member_of', partnerGroupId)
        .withGraphFetched('[partner_group, partners.[partner, users]]');

      // if there are no subgroups, check if it's a base group then send partners data
      if (partnerSubGroups.length === 0) {
        // check if it's a base group
        const group_data = await PartnerGroup.query().findById(partnerGroupId);
        if (group_data.base_group === true) {
          const partners = await PartnerRelationship.query()
            .select()
            .where('partner_group_id', partnerGroupId)
            .withGraphFetched('[partner, users]');

          const data = {
            partner_group_id: group_data.id,
            partner_group: { ...group_data },
            // eslint-disable-next-line
            partners: partners,
          };
          partnerSubGroups.push(data);
          base_inp = true;
        } else {
          return [errorHandler({ error: `true`, message: 'This is not a group.' }), null];
        }
      }

      // recursively get the partner's data if still a group
      const dta = partnerSubGroups.map(async (item) => {
        if (item.partner_group.base_group === false) {
          is_base_group = false;
          return {
            ...item,
            partner_group: {
              ...item.partner_group,
              partner_groups_data: (await this.getPartnerGroupData(item.partner_group.id))[1],
            },
          };
        }
        return item;
      });

      const resolved_dta = await Promise.all(dta);

      // query for state_name
      const partnerGroup = await PartnerGroup.query().findById(partnerGroupId);

      // parse partner groups data
      const res = resolved_dta.map((partner_group) => {
        let students = 0;
        partner_group.partners.forEach((partner) => (students += partner.users.length));
        const final = {
          partner_group_id: partner_group.partner_group.id,
          partner_group_name: partner_group.partner_group.name,
          total_no_of_partners: partner_group.partners.length,
          total_no_of_students: students,
          partners: partner_group.partners.map((partner) => {
            return {
              partner_id: partner.partner.id,
              partner_name: partner.partner.name,
              users_count: partner.users.length,
            };
          }),
        };

        if (partner_group.partner_group.partner_groups_data) {
          final.partner_groups_data = partner_group.partner_group.partner_groups_data;
        }
        return final;
      });

      // parse for json structure
      if (is_base_group === false) {
        res.forEach((item) => {
          total_no_of_partners += item.partner_groups_data.total_no_of_partners;
          total_no_of_students += item.partner_groups_data.total_no_of_students;
        });
      } else {
        res.forEach((partner_group) => {
          total_no_of_partners += partner_group.total_no_of_partners;
          total_no_of_students += partner_group.total_no_of_students;
        });
      }

      partnerGroupData.partner_group_name = partnerGroup.name;
      partnerGroupData.total_no_of_groups = res.length;
      partnerGroupData.total_no_of_partners = total_no_of_partners;
      partnerGroupData.total_no_of_students = total_no_of_students;
      partnerGroupData.partner_groups_data = res;

      // sort the partner_group data alphabetically.
      partnerGroupData.partner_groups_data = partnerGroupData.partner_groups_data.sort((a, b) => {
        return a.partner_group_name.localeCompare(b.partner_group_name);
      });

      if (base_inp === true) {
        return [null, res];
      }

      return [null, partnerGroupData];
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
      // please put state partner group csv file inside statePartnerGroupsData folder
      const csvPath = path.join(__dirname, '../helpers/statePartnerGroupsData/');
      fs.createReadStream(csvPath + filename)
        .pipe(csv())
        .on('data', (data) => partnerGroupData.push(data))
        .on('end', async () => {
          /* eslint-disable */

          for (const item of partnerGroupData) {
            if (item['Sub groups'] === '') {
              partnergroup = await PartnerGroup.query().insert({
                name: item.Partner_Group,
                base_group: true,
              });
            } else {
              partnergroup = await PartnerGroup.query().insert({
                name: item.Partner_Group,
                base_group: false,
              });
            }

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
          for (const pgitem of partnerGroupData) {
            const memberOf = await PartnerGroup.query().where('name', pgitem.Partner_Group);
            pgitem['Sub groups'] = pgitem['Sub groups'].split(';');
            if (pgitem['Sub groups'].length > 1 || pgitem['Sub groups'][0] !== '') {
              _.map(pgitem['Sub groups'], async (subGroup) => {
                const subGroupNames = await PartnerGroup.query().where('name', subGroup);
                await PartnerGroupRelationship.query().insert({
                  partner_group_id: subGroupNames[0].id,
                  member_of: memberOf[0].id,
                });
              });
            }
          }
          /* eslint-enable */
        });
      return [null, true];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getAllClusters() {
    const { PartnerGroup } = this.server.models();
    try {
      const clusters = await PartnerGroup.query().select('id', 'name').where('scope', 'state');
      return [null, clusters];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getPartnerThrowPartnerID(id) {
    const { Partner } = this.server.models();
    try {
      const data = await Partner.query()
        .select(
          'id',
          'name',
          'point_of_contact_name',
          'email',
          'platform',
          'created_at',
          'updated_at',
          'status'
        )
        .where('id', id);

      if (!data.length) {
        return [{ Error: 'partner id is not exist', code: 403 }, null];
      }
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // partner dashboard    ----==>>>  NEW API's by (PREM)
  async createPartner(partner_data) {
    try {
      const { Partner } = this.server.models();
      partner_data['notes'] = 'r';
      partner_data['platform'] = 'sansaar';
      let existPartner = await Partner.query().where({ name: partner_data.name.toLowerCase() });
      partner_data['name'] = partner_data['name'].toLowerCase();
      if (!existPartner.length) {
        let d = await Partner.query().insert(partner_data);

        let dataPartner = await Partner.query()
          .select(
            'id',
            'name',
            'point_of_contact_name',
            'email',
            'platform',
            'created_at',
            'updated_at',
            'status'
          )
          .where({ name: partner_data.name });

        return [null, { status: 'Data sent to the database succesfully', data: dataPartner }];
      }
      return [{ Error: 'Partner name is already exist. Try another name!', code: 403 }, null];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // Update the partner by the ID
  async updatePartner(id, updateData) {
    try {
      const { Partner } = this.server.models();

      if (updateData.hasOwnProperty('name')) {
        updateData['name'] = updateData.name.toLowerCase();

        let updateName = await Partner.query()
          .where({ name: updateData['name'] })
          .whereNot({ id: id });
        if (updateName.length) {
          return [{ status: 'Partner name is already exist. Try another name!', code: 403 }, null];
        }
      }

      // updateData['updated_at'] = new Date();
      const updatedPartner = await Partner.query().patchAndFetchById(id, updateData);

      if (updatedPartner == undefined) {
        return [{ Error: `This partner_id is not exist!`, Partner_id: id, code: 403 }, null];
      }
      let partner_date = await Partner.query()
        .select(
          'id',
          'name',
          'point_of_contact_name',
          'email',
          'platform',
          'created_at',
          'updated_at',
          'status'
        )
        .where('id', id);
      return [
        null,
        {
          status: 'Update the data succesfully',
          'Update data': partner_date,
        },
      ];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // delete the partner by the ID
  async deletePartner(id) {
    try {
      const { PartnerSpace, Partner } = this.server.models();
      // Find the partner by its ID and delete it
      const deletedPartner = await Partner.query().where('id', id).del();

      if (!deletedPartner) {
        return [{ Error: `Partner_ID is not exist, ${id}.`, code: 403 }];
      }

      return [
        null,
        {
          status: 'succesfully',
          message: `Partner with id ${id} and its corresponding partner_space deleted.`,
        },
      ];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // new space for the partners table
  async spaceIdExist(space_id){
    let { User, PartnerSpace } = this.server.models();
    let existData = await PartnerSpace.query().select().where('id', space_id);
    if (!existData.length) {
      return [{ error: 'space id is not found', code: 403 }];
    }
    return false
  }
  async createPartnerNewSpace(partner_id, NewSpace_data) {
    try {
      NewSpace_data['partner_id'] = partner_id;
      const { PartnerSpace, Partner } = this.server.models();

      let existPartner = await Partner.query().where('id', partner_id);
      if (!existPartner.length) {
        return [
          {
            Error: 'partner_id is not exist',
            code: 403,
          },
          null,
        ];
      }
      NewSpace_data['space_name'] = NewSpace_data['space_name'].toLowerCase();
      let existPartnerSpace = await PartnerSpace.query()
        .where('space_name', NewSpace_data.space_name)
        .where('partner_id', partner_id);

      if (!existPartnerSpace.length) {
        let { partner_id } = await PartnerSpace.query().insert(NewSpace_data);
        let dataSpace = await PartnerSpace.query()
          .select()
          .where('space_name', NewSpace_data.space_name)
          .where('partner_id', partner_id);
        return [null, { status: 'Data sent to the database!!', data: dataSpace }];
      }
      return [{ Error: 'PartnerSpace name is already exist. Try another name!', code: 403 }, null];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // Get the partner space by the Partner_ID
  async getPartnerSpaceByPartnerID(partner_id) {
    try {
      const { PartnerSpace, Partner } = this.server.models();
      let existPartner = await Partner.query().where('id', partner_id);
      if (!existPartner.length) {
        return [{ Error: 'partner_id is not exist.', code: 403 }, null];
      }
      const Data = await PartnerSpace.query().select().where({ partner_id: partner_id });
      if (Data.length) {
        return [null, { status: 'Data fetch from the database succesfully', data: Data }];
      }
      return [{ Error: "Partner haven't created space.", code: 403 }, null];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  // Update the partner space bye the space_id
  async updatePartnerSpace(id, updateData) {
    try {
      updateData['space_name'] = updateData['space_name'].toLowerCase();
      const { PartnerSpace } = this.server.models();
      let updateName = await PartnerSpace.query()
        .where({ space_name: updateData.space_name })
        .whereNot({ id: id });
      if (updateName.length) {
        return [{ status: 'Space name is already exist.', code: 403 }, null];
      }

      const updatedPartnerSpace = await PartnerSpace.query().patchAndFetchById(id, updateData);

      if (updatedPartnerSpace == undefined) {
        return [{ Error: `This space_id is not exist!`, space_id: id, code: 403 }, null];
      }
      return [null, { status: 'Updated the data succesfully', 'Update data': updatedPartnerSpace }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // get the space bye the spaceID
  async getPartnerSpaceBySpaceid(space_id) {
    try {
      const { PartnerSpace } = this.server.models();
      const partnerSpaceData = await PartnerSpace.query().select().where('id', space_id);
      if (partnerSpaceData.length) {
        return [
          null,
          { status: 'Data fetch from the database succesfully!!', data: partnerSpaceData },
        ];
      }
      return [{ Error: `This space_id is not found!`, space_id: space_id, code: 403 }, null];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // removing the partner space by the space_id
  async deletePartnerSpace(space_id) {
    try {
      const { PartnerSpace } = this.server.models();
      const delPartnerSpace = await PartnerSpace.query().delete().where('id', space_id);
      if (delPartnerSpace) {
        return [null, { status: `this space is delete succesfully`, space_ID: space_id }];
      }
      return [{ Error: `This space_id is not exist`, space_id: space_id, code: 403 }, null];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // send the dat
  async readTheFile(FilePath, batch_id) {
    try {
      let { PartnerSpace, User } = this.server.models();

      var string_data = [];
      let splitList = FilePath.split('.');
      if (splitList[1] == 'xlsx') {
        const workbook = XLSX.readFile(FilePath);
        const sheetName = workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        string_data.push(...data);
      } else if (splitList[1] == 'csv') {
        const stream = fs.createReadStream(FilePath).pipe(csv());
        stream.on('data', (data) => {
          string_data.push(data);
        });
      } else {
        return [{ Error: 'this file is invallid', code: 403 }, null];
      }
      return [null, await this.arrayCall(string_data, batch_id)];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  //Get students by space ID
  async getStudentsByGroupID(group_id) {
    try {
      let { User, SpaceGroup } = this.server.models();
      let existData = await SpaceGroup.query().select().where('id', group_id);
      if (!existData.length) {
        return [{ error: 'group_id is not found', code: 403 }];
      }
      let data = await User.query()
        .select('id', 'email', 'name', 'group_id')
        .where('group_id', group_id);
      return [null, data];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  //this function will only remove the student from the partner group with the email
  async removeTheStudentFromGroup(email) {
    try {
      let { User } = this.server.models(); // import the user model
      let existData = await User.query()
        .select('name', 'email', 'id', 'space_id')
        .where('email', email);

      if (existData[0].group_id == null) {
        return [{ error: 'this student not associate with any partner space', code: 403 }, null];
      } else if (!existData.length) {
        return [{ error: 'Student email is not found', code: 403 }, null];
      }
      let data = await User.query().patchAndFetchById(existData[0].id, { group_id: null }); // changing the group_id into null

      return [null, { status: 'successfully removed the group_id', update_data: data }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }


  async csvDataUpload(FilePath,partner_id, space_id) {
    try {
      const partnerGroupData = [];
      const csvPath = path.join(__dirname, '../helpers/statePartnerGroupsData/');
      let mainPath = csvPath + FilePath
      // eslint-disable-next-line
      // please put state partner group csv file inside statePartnerGroupsData folder
      // const csvPath = path.join(__dirname, '../helpers/statePartnerGroupsData/');
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (data) => partnerGroupData.push(data))
        .on('end', async () => {
          console.log('partnerGroupData>',partnerGroupData);
        });

      // var string_data = [];

      // let splitList = FilePath.split('.');
      // const csvPath = path.join(__dirname, '../helpers/statePartnerGroupsData/');
      // let mainPath = csvPath + FilePath
      // console.log(mainPath,'mainPath>>>>>>>>>>>>');
      // if (splitList[1] == 'xlsx') {
      //   const workbook = XLSX.readFile(mainPath);
      //   const sheetName = workbook.SheetNames[0];

      //   const sheet = workbook.Sheets[sheetName];
      //   const data = XLSX.utils.sheet_to_json(sheet);

      //   string_data.push(...data);
      // } else if (splitList[1] == 'csv') {
      //   const stream = fs.createReadStream(mainPath).pipe(csv());
      //   for await (const data of stream) {
      //     console.log(data,'<<<<<<<<<<<<<<<<<<<<<<');
      //     string_data.push(data);
      //   }      

      //   return [null,'wow']
      //   // return [null, await this.insideCode(string_data,partner_id, space_id)];
      // } else {
      //   return [{ Error: 'this file is invallid', code: 403 }, null];
      // }
    } catch (err) {
      console.log(err);
      return [errorHandler(err), null];
    }
  }

  async insideCode(array_data,partner_id, space_id){
    try{
      // total_res = []
      for (let data of array_data){
        const { User, Partner } = this.server.models();
        let existPartner = await Partner.query().skipUndefined().where("id", data.partnerId);
        if (!existPartner.length) {
          logger.info('partner id is not exist')
        } else {
          let user_data = await User.query().skipUndefined().where('email', data.email);      

          if (user_data.length >0 && partner_id == undefined || partner_id == null  ) {
            let data1 = await User.query().skipUndefined().where('id', user_data.id).patch({
              "partner_id": partner_id,
              "space_id":space_id
            });
            logger.info(`update the Email ${data.email}, partneId ${partner_id}, spaceID ${space_id} `);
          // console.log({"status":'update the user partner data'})
          } else if(user_data.length > 0){
            logger.info(`allready add this student.`)
          }else {
            let data1 = await User.query().insert({
              "name": data.student_name,
              "email": data.email,
              "partner_id": partner_id,       
              "space_id":space_id
            });
            if (data1) {
              logger.info(`Created the Email ${data.email}, partneId ${partner_id}, spaceID ${space_id} `);
            }
        }
      }
    }
    return [null, 'updated boss'];

  }catch(err){
    logger.error(err);
    return [errorHandler(err), null];
    }
  }
  async createGroup(space_id,group_data){
    try {
      const { SpaceGroup,PartnerSpace } = this.server.models();
      let existPartner = await PartnerSpace.query().where('id', space_id);
      if (!existPartner.length) {
        return [{ Error: 'space_id is not exist.', code: 403 }, null];
      }
      const Data = await SpaceGroup.query().select().where({'group_name' : group_data.group_name });
      if (Data.length) {
        return [{ Error: "Group_name is already exist try another name.", code: 403 }, null];
      }
      group_data['space_id']= space_id
      await SpaceGroup.query().insert(group_data)
      return [null, { status: 'Data fetch from the database succesfully', data: Data }];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  async updateGroup(group_id, update_data){

  }
  async getGroupByspaceID(space_id){

  }

  async getGroupByGroupID(group_id){

  }
  async deleteGroup(group_name){

  }
};
