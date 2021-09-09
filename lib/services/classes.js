/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const Schmervice = require('schmervice');
// const Boom = require('@hapi/boom');
const _ = require('lodash');
const { transaction } = require('objection');
const axios = require('axios');
const CONFIG = require('../config/index');
const { errorHandler } = require('../errorHandling');
const { UTCToISTConverter } = require('../helpers/index');

module.exports = class classesService extends Schmervice.Service {
  async getAllClasses(startDate) {
    const { Classes } = this.server.models();
    let classes;
    try {
      classes = await Classes.query()
        .skipUndefined()
        .where('start_time', '>=', startDate)
        .orderBy('start_time');
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getAllClassesMailByTime() {
    const { ClassesMail } = this.server.models();
    let classessMailData;
    try {
      classessMailData = await ClassesMail.query().whereNot('status', 'success');
      // console.log(classessMailData, 'classessMailData\n\n');
    } catch (err) {
      return [errorHandler(err), null];
    }
    return classessMailData;
  }

  async updateClassMailById(id, dict) {
    const { ClassesMail } = this.server.models();
    let updateClassMail;
    try {
      updateClassMail = await ClassesMail.query().update(dict).where('id', id);
    } catch (err) {
      return [errorHandler(err), null];
    }
    return updateClassMail;
  }

  async getUpcomingClasses(filters, userId) {
    const { Classes, ClassRegistrations } = this.server.models();
    const { startDate, endDate, lang, classType } = filters;

    let classes;
    try {
      classes = await Classes.query()
        .skipUndefined()
        .where('start_time', '>=', startDate)
        .andWhere('end_time', '>=', endDate)
        .andWhere('lang', lang)
        .andWhere('type', classType)
        .limit(100)
        .orderBy('start_time');
    } catch (err) {
      return [errorHandler(err), null];
    }

    if (userId !== undefined) {
      const enrolledClassIdList = [];
      let classesOfUser;
      try {
        classesOfUser = await ClassRegistrations.query().where('user_id', userId);
      } catch (err) {
        return [errorHandler(err), null];
      }
      classesOfUser.map((enrClass) => {
        return enrolledClassIdList.push(enrClass.class_id);
      });
      const onlyEnrolledClasses = _.filter(classes, (o) => {
        return enrolledClassIdList.indexOf(o.id) < 0;
      });
      return [null, onlyEnrolledClasses];
    }
    return [null, classes];
  }

  async createRecurringEvent(recurringPayload) {
    const { RecurringClasses } = this.server.models();
    let recurringClassEntry;
    try {
      recurringClassEntry = await RecurringClasses.query().insert(recurringPayload);
      return [null, recurringClassEntry];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async updateRecurringEvent(recurringPayload, id) {
    const { RecurringClasses } = this.server.models();
    let recurringClassUpdated;
    try {
      recurringClassUpdated = await RecurringClasses.query()
        .skipUndefined()
        .patch(recurringPayload)
        .where('id', id);
      return [null, recurringClassUpdated];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async sendMailtoVolunteers(classCount, facilitator_name, facilitator_email, class_id) {
    const { ClassesMail } = this.server.models();
    /* eslint-disable */
    try {
      if (classCount === 1) {
        const baseURL = CONFIG.auth.sendMail.sendMailToClassFacilitator;
        await axios
          .post(baseURL + 'sendFirstMailAfterRegistration', {
            name: facilitator_name,
            email: facilitator_email,
          })
          .then(async (res) => {
            if (res.data.status === 'success') {
              await ClassesMail.query().insert({
                class_id: class_id,
                facilitator_email: facilitator_email,
                status: 'success',
                type: 'sendFirstMailAfterRegistration',
              });
            } else {
              await ClassesMail.query().insert({
                class_id: class_id,
                facilitator_email: facilitator_email,
                status: 'pending',
                type: 'sendFirstMailAfterRegistration',
              });
            }
          })
          .catch(async (err) => {
            await ClassesMail.query().insert({
              class_id: class_id,
              facilitator_email: facilitator_email,
              status: 'pending',
              type: 'sendFirstMailAfterRegistration',
            });
          });
        await ClassesMail.query().insert({
          class_id: class_id,
          facilitator_email: facilitator_email,
          status: 'pending',
          type: 'sendFirstMailAfterClassOver',
        });
      } else if (classCount === 5) {
        await ClassesMail.query().insert({
          class_id: class_id,
          facilitator_email: facilitator_email,
          status: 'pending',
          type: 'sendFirstMailAfterFifthClassOver',
        });
      }
      return;
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getFacilitatorDetails(facilitator_id) {
    const { User } = this.server.models();
    let userDetails;
    try {
      userDetails = await User.query().where('id', facilitator_id);
      return { email: userDetails[0].email, name: userDetails[0].name };
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
  async createClass(newClassData) {
    const { Classes } = this.server.models();
    const { email: facilitator_email, name: facilitator_name } = await this.getFacilitatorDetails(
      newClassData[0].facilitator_id
    );
    // console.log(facilitator_email, facilitator_name, 'facilitator_email createClass service\n');
    let newClass;
    let classCount;
    try {
      classCount = await Classes.query().where('facilitator_id', newClassData[0].facilitator_id);
      classCount = classCount.length + 1;
      newClass = await Classes.query().insertGraph(newClassData);
      // newClass.classCount = classCount;
      for (var i in newClassData) {
        await this.sendMailtoVolunteers(
          classCount + parseInt(i),
          facilitator_name,
          facilitator_email,
          newClass[i].id
        );
      }
      return [null, newClass];
    } catch (err) {
      // This is probably never going to throw because validation is already handled by Joi
      return [errorHandler(err), null];
    }
  }

  async deleteClass(classId, txn) {
    const { Classes, ClassRegistrations } = this.server.models();
    try {
      const deleteClassAndClearReg = await transaction(
        Classes,
        ClassRegistrations,
        async (ClassesModel, ClassRegistrationsModel) => {
          try {
            await ClassRegistrationsModel.query(txn).delete().where('class_id', classId);
          } catch (err) {
            return errorHandler(err);
          }
          await ClassesModel.query(txn).delete().where('id', classId);
          return { success: true };
        }
      );
      return [null, deleteClassAndClearReg];
    } catch (err) {
      return [errorHandler(err), null];
    }
    // await ClassRegistrations.query().delete().where('class_id', classId);
    // const deleted = await Classes.query().delete().where('id', classId);
    // if (deleted > 0) {
    //   return { success: true };
    // }
    // throw Boom.badRequest("Class doesn't exist");
  }

  async getClassById(classId) {
    const { Classes } = this.server.models();
    let classes;
    try {
      classes = await Classes.query()
        .throwIfNotFound()
        .findById(classId)
        .withGraphFetched('parent_class');
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClassesByRecurringId(recurringId) {
    const { Classes } = this.server.models();
    let classes;
    try {
      classes = await Classes.query()
        .throwIfNotFound()
        .where('recurring_id', recurringId)
        .withGraphFetched({
          parent_class: true,
          registrations: true,
          facilitator: true,
        })
        // Another way to do this could be only fetch graph by matching user id
        .modifyGraph('registrations', (builder) => builder.select('user_id'));
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  // async getInstancesByRecurringId(recurringId) {
  //   const { Classes } = this.server.models();
  //   let instances;
  //   try {
  //     instances = await Classes.query().throwIfNotFound().where('recurring_id', recurringId);
  //     return [null, instances];
  //   } catch (err) {
  //     return [errorHandler(err), null];
  //   }
  // }

  async updateClass(id, classUpdates) {
    const { Classes, ClassRegistrations } = this.server.models();
    let updatedClass;
    try {
      if (classUpdates.max_enrolment) {
        const totalRegistrations = await ClassRegistrations.query().where('class_id', id);
        if (totalRegistrations.length > classUpdates.max_enrolment) {
          return [
            {
              error: true,
              message: `${totalRegistrations.length} students already enrolled. Please set the class limit above ${totalRegistrations.length}`,
              code: 400,
            },
            null,
          ];
        }
      }
      updatedClass = await Classes.query().throwIfNotFound().patchAndFetchById(id, classUpdates);
      return [null, updatedClass];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async deleteMultipleClasses(recurringId, txn) {
    const { Classes, ClassRegistrations, RecurringClasses } = this.server.models();
    try {
      const deleteClassesAndClearReg = await transaction(
        Classes,
        ClassRegistrations,
        RecurringClasses,
        async (ClassesModel, ClassRegistrationsModel, RecurringClassesModel) => {
          try {
            const getClassesId = await ClassesModel.query(txn)
              .select('id')
              .throwIfNotFound()
              .where('recurring_id', recurringId);
            const filterIds = _.map(getClassesId, (c) => {
              return c.id;
            });
            await ClassRegistrationsModel.query(txn).delete().whereIn('class_id', filterIds);
          } catch (err) {
            return errorHandler(err);
          }
          await ClassesModel.query(txn).delete().where('recurring_id', recurringId);
          await RecurringClassesModel.query(txn).delete().where('id', recurringId);
          return { success: true };
        }
      );
      return [null, deleteClassesAndClearReg];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async recommendedClasses() {
    const { Classes } = this.server.models();
    let classRecommendations;
    try {
      classRecommendations = await Classes.query().orderByRaw(`random()`).limit(4);
      return [null, classRecommendations];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async registerToClassById(registrationDetails) {
    const { ClassRegistrations } = this.server.models();
    let successReg;
    try {
      successReg = await ClassRegistrations.query().insertGraph(registrationDetails);
      return [null, successReg];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async removeRegistrationById(classIds, userId, txn) {
    const { ClassRegistrations } = this.server.models();

    try {
      await ClassRegistrations.query(txn)
        .delete()
        .whereIn('class_id', classIds)
        .andWhere('user_id', userId);
      return [null, { success: true }];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClasses() {
    const { Classes } = this.server.models();
    let classes;
    const dateIST = UTCToISTConverter(new Date());
    try {
      classes = await Classes.query()
        .where('end_time', '>', dateIST)
        .orderBy('start_time')
        .withGraphFetched({ registrations: true, facilitator: true })
        // Another way to do this could be only fetch graph by matching user id
        .modifyGraph('registrations', (builder) => builder.select('user_id'));
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getClassesByUserId(userId) {
    const { ClassRegistrations } = this.server.models();
    let userClasses;
    const dateIST = UTCToISTConverter(new Date());
    try {
      userClasses = await ClassRegistrations.query()
        .where('user_id', userId)
        .orderBy('registered_at')
        .withGraphJoined('classes')
        .modify((builder) => builder.where('classes.end_time', '>', dateIST));

      return [null, userClasses];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }
};
