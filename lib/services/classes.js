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

  async createClass(newClassData) {
    const { Classes } = this.server.models();
    let newClass;
    try {
      newClass = await Classes.query().insert(newClassData);
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
      classes = await Classes.query().throwIfNotFound().findById(classId);
      return [null, classes];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

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
    const { ClassRegistrations, Classes } = this.server.models();
    const { user_id, class_id } = registrationDetails;

    let successReg;

    try {
      await Classes.query().findById(class_id);
      await ClassRegistrations.query().findOne({
        user_id,
        class_id,
      });
      successReg = await ClassRegistrations.query().insert(registrationDetails);
      return [null, successReg];
    } catch (err) {
      return [errorHandler(err), null];
    }

    // if (isClassValid === undefined) {
    //   throw Boom.badRequest(`Class with class ID : ${class_id} doesn't exist`);
    // } else if (isAlreadyRegistered !== undefined) {
    //   throw Boom.badRequest('Already registered to this class');
    // }
  }

  async removeRegistrationById(classId, userId, txn) {
    const { ClassRegistrations } = this.server.models();
    try {
      await ClassRegistrations.query(txn)
        .del()
        .where('user_id', userId)
        .andWhere('class_id', classId)
        .throwIfNotFound();
      return [null, { success: true }];
    } catch (err) {
      return [errorHandler(err), null];
    }
    // if (deletion) return { success: true };
    // throw Boom.badRequest('You are not registered to this class');
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
