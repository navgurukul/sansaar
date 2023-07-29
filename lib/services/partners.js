/* eslint-disable prettier/prettier */
/* eslint-disable eqeqeq */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable prettier/prettier */
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
const Dotenv = require('dotenv');

Dotenv.config({ path: `${__dirname}/../../server/.env` });

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
      const student = [];
      for (const user of students) {
        const a = await UserRole.query().where('user_id', user.id);
        if (a.length == 0) {
          count += 1; // count the number of students without having any role.
          student.push(user);
        }
      }
      students = student;
      students.forEach((allClasses) => {
        allClasses.classes.forEach((data) => {
          if (data.facilitator_id !== null) {
            data.facilitator_name = data.facilitator.name;
            data.facilitator_email = data.facilitator.email;
          }
          delete data.facilitator;
        });
      });

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
    // this code for checking main to merd
    const main_or_merd = process.env.code_folding_mode;

    let merakiLink;
    if (platform === 'web') {
      if (main_or_merd == 'main') {
        merakiLink = `${CONSTANTS.web_link_url}${partnerId}`;
      } else {
        merakiLink = `${CONSTANTS.web_link_url_dev}${partnerId}`;
      }
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
            return {
              status: `success`,
              message: `user added successfully to ${partnerId} partner.`,
            };
            // eslint-disable-next-line
          } else {
            parterName = await Partner.query()
              .select('name')
              .where('id', partnerUser[0].partner_id);
            return {
              error: `true`,
              message: `This Student is already associated with ${parterName[0].name}.`,
              code: 403,
            };
          }
        } else {
          return {
            error: `true`,
            message: `Admins/Partners/Volunteers cannot be added as students`,
            code: 403,
          };
        }
        // eslint-disable-next-line
      } else {
        await User.query().insert({ name: email, email: email, partner_id: partnerId });
        return { status: `success`, message: `user added successfully to ${partnerId} partner.` };
      }
    } catch (err) {
      return {
        error: true,
        message: 'Please enter a valid email. For eg., literalstudent@gmail.com',
        code: 403,
      };
    }
  }

  async arrayCall(arrayOfData, group_id) {
    let { SpaceGroup } = this.server.models();
    let existGroup = await SpaceGroup.query().where('id', group_id);
    if (!existGroup.length) {
      return [
        {
          error: true,
          message: `Group id is not exist`,
          code: 404,
        },
      ];
    }
    if (arrayOfData.length === 0) {
      return [
        {
          error: true,
          message:
            'An empty file cannot be uploaded. Please upload the file with valid and proper student details.',
          code: 403,
        },
      ];
    }
    if (
      (!arrayOfData[0].hasOwnProperty('name') && !arrayOfData[0].hasOwnProperty('NAME')) ||
      (!arrayOfData[0].hasOwnProperty('email') && !arrayOfData[0].hasOwnProperty('EMAIL'))
    ) {
      return [
        {
          error: true,
          message: 'Need headers name and email in the file.',
          code: 403,
        },
      ];
    }
    const promises = arrayOfData.map((data) => {
      if (
        (!data.name || !data.email || !data.name.length || !data.email.length) &&
        (!data.NAME || !data.EMAIL || !data.NAME.length || !data.EMAIL.length)
      ) {
        return {
          Error: `true`,
          message:
            'There is no name/NAME or email/EMAIL. And undefined or null data present there in the Object value ',
          student_data: data,
        };
      } else {
        data['group_id'] = group_id;
        return this.getPartnerUserInside(data, existGroup);
      }
    });
    const results = await Promise.all(promises);
    // do something with the results here
    return results;
  }
  async getPartnerUserInside(studentData, existGroup) {
    let { group_id } = studentData;
    let email = studentData.email || studentData.EMAIL;
    let name = studentData.name || studentData.NANE;

    const { User, UserRole } = this.server.models();

    let userRole;

    try {
      let partnerUser = await User.query().where('email', email);

      if (partnerUser.length > 0) {
        //If users don't have any role then, In that case only a space_id will be asign.
        userRole = await UserRole.query().where('user_id', partnerUser[0].id);
        if (userRole.length <= 0 || userRole == null || userRole == undefined) {
          if (partnerUser[0].group_id == null) {
            await User.query().where('id', partnerUser[0].id).update({
              email: email,
              group_id: group_id,
            });

            // eslint-disable-next-line
          } else {
            delete studentData.group_id;
            return {
              Error: `true`,
              message: `This Student is already associated with this space group_id:${partnerUser[0].group_id}.`,
              code: 403,
              student_data: studentData,
            };
          }
        } else {
          delete studentData.group_id;
          return {
            Error: `true`,
            message: `Admins/Partners/Volunteers cannot be added as students`,
            code: 403,
            student_data: studentData,
          };
        }
        // eslint-disable-next-line
      } else {
        await User.query().insert({ name: name, email: email, group_id: group_id });
        return {
          status: true,
          message: 'student added successfully...',
          student_data: studentData,
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
  // async removeAndUserFromPartner(userId) {
  //   const { User, UserRole } = this.server.models();
  //   let userRole;
  //   try {
  //     const partnerUser = await User.query().findById(userId);
  //     userRole = await UserRole.query().where('user_id', partnerUser.id);
  //     if (userRole.length <= 0 || userRole === null || userRole === undefined) {
  //       const removeAnPartnerUser = await User.query()
  //         .update({
  //           name: partnerUser.name,
  //           email: partnerUser.email,
  //           partner_id: null,
  //         })
  //         .where('id', userId);
  //       return [null, removeAnPartnerUser];
  //     } else {
  //       return [null, 'Admins/Partners/Volunteers cannot be removed'];
  //     }
  //   } catch (err) {
  //     return [errorHandler(err), null];
  //   }
  // }

  async removeGrpPrtSpc(userId) {
    const { User,UserRole } = this.server.models();
    let userRole;
    try {
      const partnerUser = await User.query().findById(userId);
      userRole = await UserRole.query().where('user_id', partnerUser.id);
      // update the role of the user execept the student role

      if (partnerUser!==0) {
        const removeAnPartnerUser = await User.query()
          .update({
            space_id: null,
            group_id: null,
            partner_id: null,
          })
          .where('id', userId);
        return [null, removeAnPartnerUser];
      } else {
        return [null, 'pArtner/Group_id/Space_id null'];
      }
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
      // eslint-disable-next-line prettier/prettier
      return [null, data[0]];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // partner dashboard    ----==>>>  NEW API's by (PREM)
  async createPartner(partner_data) {
    try {
      const { Partner } = this.server.models();
      partner_data.notes = 'r';
      partner_data.platform = 'sansaar';
      const existPartner = await Partner.query().where({ name: partner_data.name.toLowerCase() });
      partner_data.name = partner_data.name.toLowerCase();
      if (!existPartner.length) {
        await Partner.query().insert(partner_data);
        const dataPartner = await Partner.query()
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
        updateData.name = updateData.name.toLowerCase();

        const updateName = await Partner.query().where({ name: updateData.name }).whereNot({ id });
        if (updateName.length) {
          return [{ status: 'Partner name is already exist. Try another name!', code: 403 }, null];
        }
      }

      // updateData['updated_at'] = new Date();
      const updatedPartner = await Partner.query().patchAndFetchById(id, updateData);

      if (updatedPartner == undefined) {
        return [{ Error: `This partner_id is not exist!`, Partner_id: id, code: 403 }, null];
      }
      const partner_date = await Partner.query()
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
      const { Partner } = this.server.models();
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

  async createPartnerNewSpace(partner_id, NewSpace_data) {
    try {
      NewSpace_data.partner_id = partner_id;
      const { PartnerSpace, Partner } = this.server.models();

      const existPartner = await Partner.query().where('id', partner_id);
      if (!existPartner.length) {
        return [
          {
            Error: 'partner_id is not exist',
            code: 403,
          },
          null,
        ];
      }
      NewSpace_data.space_name = NewSpace_data.space_name.toLowerCase();
      const existPartnerSpace = await PartnerSpace.query()
        .where('space_name', NewSpace_data.space_name)
        .where('partner_id', partner_id);

      if (!existPartnerSpace.length) {
        const { partner_id } = await PartnerSpace.query().insert(NewSpace_data);
        const dataSpace = await PartnerSpace.query()
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
      const existPartner = await Partner.query().where('id', partner_id);
      if (!existPartner.length) {
        return [{ Error: 'partner_id is not exist.', code: 403 }, null];
      }
      const Data = await PartnerSpace.query().select().where({ partner_id });
      return [null, { status: 'Data fetch from the database succesfully', data: Data }];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  // Update the partner space bye the space_id
  async updatePartnerSpace(id, updateData) {
    try {
      updateData.space_name = updateData.space_name.toLowerCase();
      const { PartnerSpace } = this.server.models();
      const updateName = await PartnerSpace.query()
        .where({ space_name: updateData.space_name })
        .whereNot({ id });
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

  // get the space by the spaceID
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
      return [{ Error: `This space_id is not found!`, space_id, code: 403 }, null];
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
      return [{ Error: `This space_id is not exist`, space_id, code: 403 }, null];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // Get students by space ID
  async getStudentsByGroupID(group_id) {
    try {
      const { User, SpaceGroup } = this.server.models();

      const existData = await SpaceGroup.query().select().where('id', group_id);
      if (!existData.length) {
        return [{ error: 'group_id is not found', code: 403 }];
      }
      const data = await User.query()
        .select('users.id', 'users.name', 'users.email', 'classes.title')
        .distinct('users.name', 'users.email')
        .leftJoin('class_registrations', 'users.id', 'class_registrations.user_id')
        .leftJoin('classes', 'class_registrations.class_id', 'classes.id')
        .where('users.group_id', group_id);

      const result = [];
      const emailMap = {};

      data.forEach((row) => {
        const { id, name, email, title } = row;

        if (emailMap[email]) {
          // If email already exists, add the title to the existing object
          emailMap[email].enrolled_in.push(title);
        } else {
          // Create a new object for the user
          const userObject = {
            id,
            name,
            email,
            enrolled_in: title ? [title] : [],
          };
          result.push(userObject);
          emailMap[email] = userObject;
        }
      });
      return [null, result];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // this function will only remove the student from the partner group with the email
  async removeTheStudentFromGroup(email) {
    try {
      const { User } = this.server.models(); // import the user model

      const existData = await User.query()
        .select('name', 'email', 'id', 'group_id')
        .where('email', email);

      if (!existData.length) {
        return [{ error: 'Student email is not found', code: 403 }, null];
      }
      if (existData[0].group_id == null) {
        return [{ error: 'this student not associate with any space group', code: 403 }, null];
      }
      const data = await User.query().patchAndFetchById(existData[0].id, { group_id: null }); // changing the group_id into null

      return [
        null,
        { status: 'student successfully removed from the space group,', update_data: data },
      ];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async createGroup(space_id, group_data) {
    try {
      const { SpaceGroup, PartnerSpace } = this.server.models();
      const existPartner = await PartnerSpace.query().where('id', space_id);
      if (!existPartner.length) {
        return [{ Error: 'space_id is not exist.', code: 403 }, null];
      }
      const Data = await SpaceGroup.query()
        .select()
        .where({ group_name: group_data.group_name })
        .andWhere('space_id', space_id);

      if (Data.length) {
        return [{ Error: 'Group_name is already exist try another name.', code: 403 }, null];
      }
      group_data.space_id = space_id;

      const data2 = await SpaceGroup.query().insert(group_data);
      return [null, { status: 'succesfully created the space group', data: data2 }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateGroup(id, updateData) {
    try {
      updateData.group_name = updateData.group_name.toLowerCase();

      const { SpaceGroup } = this.server.models();

      const updateName = await SpaceGroup.query()
        .where({ group_name: updateData.group_name })
        .whereNot({ id });
      if (updateName.length) {
        return [{ status: 'Space name is already exist.', code: 403 }, null];
      }
      const updatedSpaceGroup = await SpaceGroup.query().patchAndFetchById(id, updateData);

      if (updatedSpaceGroup == undefined) {
        return [{ Error: `This group_id is not exist!`, group_id: id, code: 403 }, null];
      }
      const data = await SpaceGroup.query().where({ id });

      return [null, { status: 'Updated the data succesfully', 'Update data': data }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getGroupByspaceID(space_id) {
    try {
      const { PartnerSpace, SpaceGroup } = this.server.models();
      const existData = await PartnerSpace.query().where({ id: space_id });

      if (!existData.length) {
        return [{ status: 'Space id is not exist.', code: 403 }, null];
      }
      const totalSpaceGroup = await SpaceGroup.query().where('space_id', space_id);
      return [null, totalSpaceGroup];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getGroupByGroupID(group_id) {
    const { SpaceGroup } = this.server.models();
    const totalSpaceGroup = await SpaceGroup.query().where('id', group_id);
    if (!totalSpaceGroup.length) {
      return [{ Error: `Group_id is not exist, group_id:${group_id}.`, code: 403 }, null];
    }
    return [null, totalSpaceGroup];
  }

  async deleteGroup(group_id) {
    try {
      const { SpaceGroup } = this.server.models();
      // Find the PartnerGroup by its ID and delete it
      const deletedPartnerGroup = await SpaceGroup.query().where('id', group_id).del();

      if (!deletedPartnerGroup) {
        return [{ Error: `group_id is not exist, ${group_id}.`, code: 403 }, null];
      }
      return [
        null,
        {
          status: 'succesfully',
          message: `spaceGroup deleted succesfully. group_id:${group_id}.`,
        },
      ];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getPartnerTotalData(id) {
    const { Partner } = this.server.models();
    let totalData;
    try {
      totalData = await Partner.query()
        .select()
        .where('id', id)
        .withGraphFetched('spaces_data.space_groups.students');
      return [null, totalData];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async extractDataFromCsv(filePath, group_id) {
    try {
      // if (splitList[1] == "csv")
      const results = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => {
            // Process the CSV file and insert data into the database
            // this.insertData(results, partner_id, group_id)
            resolve();
          })
          .on('error', (error) => reject(error));
      });
      return await this.arrayCall(results, group_id);
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async extractDataFromXlsx(filePath, group_id) {
    try {
      const students_data = [];
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];

      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      students_data.push(...data);
      return await this.arrayCall(students_data, group_id);
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // Finding the email in the user table
  async studentsSearchEmail(email) {
    const { User, Partner, SpaceGroup } = this.server.models();
    try {
      let exist_partner;
      let name;
      let status;

      const exist_user = await User.query().select().where('email', email);
      if (exist_user.length == 0) {
        return [null, true];
      }
      if (exist_user[0].group_id == null) {
        if (exist_user[0].partner_id == null) {
          return [null, true];
        }
        exist_partner = await Partner.query().where('id', exist_user[0].partner_id);
        name = `${exist_partner[0].name} partner`;
        status = `This Student is already associated with this ${name}`;
      } else {
        exist_partner = await SpaceGroup.query().select().where('id', exist_user[0].group_id);
        name = `${exist_partner[0].group_name} partner group`;
        status = `This Student is already associated with this ${name}`;
      }

      return [{ error: true, message: status, name, code: 403 }, null];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  async getClsByGroupId(group_id) {
    const { PartnerSpecificBatches, Classes } = this.server.models();
    try {
      const partnerSpecificBatchData = await PartnerSpecificBatches.query().where(
        'group_id',
        group_id
      );
      if (partnerSpecificBatchData.length >= 1) {
        const recurringIds = partnerSpecificBatchData.map((item) => item.recurring_id);
        const AllBatchDetails = {
          space_id: partnerSpecificBatchData[0].space_id,
          batches_data: []
        };
        for (const recurring_id of recurringIds) {
          const classDetails = await Classes.query()
            .where('recurring_id', recurring_id)
            .orderBy('recurring_id')
            .limit(1)
            .select('*');
          if (classDetails.length > 0) {
            const response = {}
            response.recurring_id = classDetails[0].recurring_id
            response.title = classDetails[0].title
            response.group_id = group_id
            response.class_id = classDetails[0].id
            response.start_time = classDetails[0].start_time
            response.end_time = classDetails[0].end_time
            classDetails[0].group_id = group_id;
            AllBatchDetails.batches_data.push(response);
          }
        }
      return [null, AllBatchDetails];
      }
      else {
        let error = {
          error: true,
          code: 403,
          message: `there is no batches data by group_id ${group_id}`
        }
        return [error, null];
      }
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  async relationChickerPartnerSpaceGroup(partnerID, spaceID, groupID) {
    const { SpaceGroup, PartnerSpace, Partner } = this.server.models();
    const totalData = await Partner.query().select().where('id', partnerID);

    if (totalData.length != 0) {
      // Handle error: spaceID does not exist
      const totalDataSpace = await PartnerSpace.query()
        .select()
        .where({ id: spaceID, partner_id: partnerID });
      if (totalDataSpace != 0) {
        const totalDataGroup = await SpaceGroup.query()
          .select()
          .where({ id: groupID, space_id: spaceID });

        if (totalDataGroup != 0) {
          return [null, [totalData, totalDataSpace, totalDataGroup]];
        }
        return [{ error: true, message:  `For this space_id:${spaceID}. There is no any relation with this group_id:${groupID}. In side this partner space`, code: 403 }, null];
      }
      return [{ error: true, message: `For this partner_id:${partnerID}. There is no any relation with this space_id:${spaceID}. In side this partner`, code: 403 }, null];
    }
    return [{ error: true, message: 'Partner id does not exist', code: 403 }, null];
  }

  async groupSpecificLinkAuto(partnerId, spaceID, groupID) {
    const { SpaceGroup } = this.server.models();
    const [err, conditions] = await this.relationChickerPartnerSpaceGroup(
      partnerId,
      spaceID,
      groupID
    );
    if (err) {
      return [err, null];
    }
    const Group = await SpaceGroup.query().select().where({ id: groupID });

    const webKey = 'web_link';
    const androidKey = 'android_link';

    if (Group[0][webKey] || Group[0][androidKey]) {
      return [
        {
          error: true,
          message: 'You already created the links',
          code: 403,
        },
        null,
      ];
    }

    const [partner, partnerSpace, group_] = conditions;

    const partnerName = encodeURIComponent(partner[0].name).replace(/%20/g, '+');
    const spaceName = encodeURIComponent(partnerSpace[0].space_name).replace(/%20/g, '+');
    const groupName = encodeURIComponent(group_[0].group_name).replace(/%20/g, '+');
    //this code for checking main to merd
    const main_or_merd = process.env.code_folding_mode;

    let webLink;
    if ('main' == main_or_merd) {
      webLink = `${CONSTANTS.web_link_url}${partnerId}`;
    } else {
      webLink = `${CONSTANTS.web_link_url_dev}${partnerId}`;
    }
    webLink = webLink.replace('partner_name', partnerName);
    webLink += `%3D${spaceName}%26utm_content%3Dspace_id%253A${spaceID}%3D${groupName}%26utm_content%3Dgroup_id%253A${groupID}`;

    let androidLink = `${CONSTANTS.meraki_link_url}${partnerId}`;
    androidLink = androidLink.replace('partner_name', partnerName);
    androidLink += `%3D${spaceName}%26utm_content%3Dspace_id%253A${spaceID}%3D${groupName}%26utm_content%3Dgroup_id%253A${groupID}`;

    let webShortLink;
    let androidShortLink;
    try {
      [webShortLink, androidShortLink] = await Promise.all([
        axios.post(
          'https://api-ssl.bitly.com/v4/shorten',
          {
            long_url: webLink,
            domain: 'bit.ly',
          },
          {
            headers: {
              Authorization: `Bearer ${CONSTANTS.bitly.token}`,
              'Content-Type': 'application/json',
            },
          }
        ),
        axios.post(
          'https://api-ssl.bitly.com/v4/shorten',
          {
            long_url: androidLink,
            domain: 'bit.ly',
          },
          {
            headers: {
              Authorization: `Bearer ${CONSTANTS.bitly.token}`,
              'Content-Type': 'application/json',
            },
          }
        ),
      ]);
    } catch (err) {
      return [errorHandler(err), null];
    }

    logger.info('Successfully created new links: ');

    const dict = {
      [webKey]: webShortLink.data.link,
      [androidKey]: androidShortLink.data.link,
    };

    const _data_ = await SpaceGroup.query().throwIfNotFound().patchAndFetchById(groupID, dict);

    return [null, _data_];
  }

  async returnCsvFile(data) {
    try {
      const filteredData = data
        .filter((obj) => !obj.status) // Exclude objects with status=true
        .map((obj) => ({
          message: obj.message,
          name: obj.student_data.name || obj.student_data.NAME,
          email: obj.student_data.email || obj.student_data.EMAIL,
        }));
      return [
        null,
        [
          {
            succes: data.length - filteredData.length,
            failed: filteredData.length,
            reports: filteredData,
          },
        ],
      ];
    } catch (error) {
      return [errorHandler(error), null];
    }
  }

  async getBatchesDataByRecurringId(recurring_id) {
      const { Classes, PartnerSpecificBatches, PathwaysV2, User } = this.server.models();
    try {
      const classDetails = await Classes.query()
        .throwIfNotFound()
        .where('recurring_id', recurring_id)
        .orderBy('end_time')

      const partner_Specific = await PartnerSpecificBatches.query().throwIfNotFound().where('recurring_id', recurring_id);
      if(partner_Specific[0].pathway_id !== null && partner_Specific[0].pathway_id !== undefined){
        const pathway_data = await PathwaysV2.query().where('id', partner_Specific[0].pathway_id); 
        const facilitator_details = await User.query().throwIfNotFound().where('id', classDetails[0].facilitator_id);
  
        let batchStartDate = new Date(classDetails[0].start_time);
        let lastClasses = classDetails.length-1;
        let bacthEndDate = new Date(classDetails[lastClasses].end_time);
        let currentDate = new Date();
       
        const response = {}
        response.pathway_id = pathway_data[0].id;
        response.pathway_name = pathway_data[0].name;
        response.pathway_logo = pathway_data[0].logo;
        response.class_title = classDetails[0].title;
        response.recurring_id = recurring_id;
        response.batch_start_date = batchStartDate;
        response.batch_end_date = bacthEndDate;
        response.facilitator_name = facilitator_details[0].name;
        response.facilitator_email = facilitator_details[0].email;
        if (currentDate >= batchStartDate && currentDate <= bacthEndDate){
          response.status = "OnGoing"
        }else if(currentDate < batchStartDate){
          response.status = "Batch not start yet!"
        }else{
          response.status = "Complete"
        }
      return [null, response];
      }else{
        let error = 
          {
            "error": true,
            "message": "pathway_id does not exist",
            "type": "NotFound",
            "data": [],
            "code": 404
          }
        return [error, null];
      }
    } catch (error) {
      return [errorHandler(error), null];
    }
  }
};
