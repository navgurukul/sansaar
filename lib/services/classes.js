/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const Schmervice = require('schmervice');
// const Boom = require('@hapi/boom');
const _ = require('lodash');
const { transaction } = require('objection');
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

  async createClass(newClassData, role = null) {
    const { Classes, UserRole } = this.server.models();
    let newClass;

    /**
     * check if role is already assigned to the user.
     * Objection doesn't support on_conflict function that inserts if row doesn't match otherwise simply ignore
     */
    const ifRoleAssigned = await UserRole.query()
      .skipUndefined()
      .where('user_id', newClassData[0].facilitator_id)
      .andWhere('role', role);
    // Check if role is sent in headers, check if facilitator is creating class for themselves and & check if role is not alreadt assigned
    if (role && newClassData[0].facilitator_id && !ifRoleAssigned.length > 0) {
      const assignRole = { user_id: parseInt(newClassData[0].facilitator_id, 10), role };
      await UserRole.query().insert(assignRole);
    }
    try {
      newClass = await Classes.query().insertGraph(newClassData);
      return [null, newClass];
    } catch (err) {
      // eslint-disable-next-line
      console.log(err);
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
        .withGraphFetched({ registrations: true, facilitator: true, parent_class: true })
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
