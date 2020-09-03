const Schmervice = require('schmervice');
const _ = require('lodash');

module.exports = class ProgressTrackingService extends Schmervice.Service {
  async createParameter(info, txn) {
    const { ProgressParameter } = this.server.models();
    return ProgressParameter.query(txn).insert(info);
  }

  async findParameters(txn) {
    const { ProgressParameter } = this.server.models();
    return ProgressParameter.query(txn);
  }

  async updateParameter(id, info, txn) {
    const { ProgressParameter } = this.server.models();

    await ProgressParameter.query(txn).update(info).where({ id });
    return id;
  }

  async findParameterById(id, info, txn) {
    const { ProgressParameter } = this.server.models();
    return ProgressParameter.query(txn).throwIfNotFound().findById(id);
  }

  async createQuestion(info, txn) {
    const { ProgressQuestion } = this.server.models();
    return ProgressQuestion.query(txn).insert(info);
  }

  async findQuestions(txn) {
    const { ProgressQuestion } = this.server.models();
    return ProgressQuestion.query(txn);
  }

  async updateQuestion(id, info, txn) {
    const { ProgressQuestion } = this.server.models();

    await ProgressQuestion.query(txn).update(info).where({ id });
    return id;
  }

  async findQuestionById(id, info, txn) {
    const { ProgressQuestion } = this.server.models();
    return ProgressQuestion.query(txn).throwIfNotFound().findById(id);
  }

  async getTrackingForm(pathwayId, txn) {
    const { PathwayFormStructure } = this.server.models();
    const formStructure = await PathwayFormStructure.query(txn).where({ pathway_id: pathwayId });

    return formStructure;
  }

  async updateTrackingForm(pathwayId, questionIds = [], paramIds = [], txn) {
    const { PathwayFormStructure } = this.server.models();
    const formStructure = await PathwayFormStructure.query(txn).where(
      { pathway_id: pathwayId },
      txn
    );

    const existingQuestionIds = _.fromPairs(
      formStructure.map((s) => [s.question_id, s]).filter((s) => s[0])
    );
    const existingParamIds = _.fromPairs(
      formStructure.map((s) => [s.parameter_id, s]).filter((s) => s[0])
    );

    const upsertObj = [];
    questionIds.forEach((qId) => {
      if (existingQuestionIds[qId]) {
        upsertObj.push(existingQuestionIds[qId]);
      } else {
        upsertObj.push({
          pathway_id: pathwayId,
          question_id: qId,
        });
      }
    });
    paramIds.forEach((pId) => {
      if (existingParamIds[pId]) {
        upsertObj.push(existingParamIds[pId]);
      } else {
        upsertObj.push({
          pathway_id: pathwayId,
          parameter_id: pId,
        });
      }
    });
    await PathwayFormStructure.query(txn).upsertGraph(upsertObj);
  }
};
