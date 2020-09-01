const Schmervice = require('schmervice');
const _ = require('lodash');

const transforms = {};

module.exports = class DisplayService extends Schmervice.Service {
  _applyTransform = (results, func) => (_.isArray(results) ? _.map(results, func) : func(results));

  userProfile = async (user) => {
    const { User } = this.server.models();

    const results = await User.fetchGraph(user, { roles: true, pathways: true });
    return this._applyTransform(results, transforms.userProfile);
  };

  pathway = async (pathway) => {
    const { Pathway } = this.server.models();

    const pathways = await Pathway.fetchGraph(pathway, 'milestones');
    return this._applyTransform(pathways, transforms.pathway);
  };

  pathwayMilestone = async (milestone) => milestone;

  progressParameter = async (parameter) => parameter;

  progressQuestion = async (question) => question;

  pathwayTrackingForm = async (structure) => {
    const { PathwayFormStructure } = this.server.models();

    const results = await PathwayFormStructure.fetchGraph(structure, {
      parameter: true,
      question: true,
    });
    const form = { questions: [], parameters: [] };
    results.forEach((result) => {
      if (result.parameter_id) {
        form.parameters.push(result.parameter);
      }
      if (result.question_id) {
        form.questions.push(result.question);
      }
    });
    return form;
  };

  pathwayCourses = async (courses) => {
    const { PathwayCourses } = this.server.models();
    return PathwayCourses.fetchGraph(courses, 'courses');
  };

  classesByDate = async (classes, startDate, endDate) => {
    const filteredClass = _.filter(classes, (eachClass) => {
      return eachClass.start_time >= startDate && eachClass.start_time <= endDate;
    });
    return filteredClass;
  };

  classesByLanguage = async (classes, lang) => {
    const filteredClass = _.filter(classes, (eachClass) => {
      return eachClass.lang === lang;
    });
    return filteredClass;
  };
};

transforms.userProfile = ({ roles, ...userInfo }) => ({
  rolesList: _.map(roles, (r) => r.role),
  ...userInfo,
});

transforms.pathway = ({ milestones, ...pathwayInfo }) => ({
  milestones: _.sortBy(milestones, (m) => m.position),
  ...pathwayInfo,
});
