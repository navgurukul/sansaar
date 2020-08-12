const Schmervice = require('schmervice');
const _ = require('underscore');
const { isArray } = require('underscore');

const transforms = {};

module.exports = class DisplayService extends Schmervice.Service {
  userProfile = async (user) => {
    const { User } = this.server.models();

    const results = await User.fetchGraph(user, 'roles');
    console.log("results", results)
    return this._applyTransform(results, transforms.userProfile);
  };

  pathway = async (pathway) => {
    const { Pathway } = this.server.models();

    const pathways = await Pathway.fetchGraph(pathway, 'milestones');
    return this._applyTransform(pathways, transforms.pathway);
  };

  pathwayMilestone = async (milestone) => milestone;

  _applyTransform = (results, func) => (isArray(results) ? _.map(results, func) : func(results));
};

transforms.userProfile = ({ roles, ...userInfo }) => ({
  rolesList: _.map(roles, (r) => r.role),
  ...userInfo,
});

transforms.pathway = ({ milestones, ...pathwayInfo }) => ({
  milestones: _.sortBy(milestones, (m) => m.position),
  ...pathwayInfo,
});
