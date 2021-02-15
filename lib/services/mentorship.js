const Schmervice = require('schmervice');
const Boom = require('@hapi/boom');

const { errorHandler } = require('../errorHandling');

module.exports = class MentorshipService extends Schmervice.Service {
  // #TODO
  async addMentees(pathwayId, userId, menteeIds, txn) {
    const { MentorTree, StudentPathways } = this.server.models();

    // check if the specified mentees are a part of the given pathway
    const pathwayMembership = await StudentPathways.query(txn)
      .where({ pathway_id: pathwayId })
      .whereIn('user_id', menteeIds);
    if (pathwayMembership.length !== menteeIds.length) {
      throw Boom.badRequest('Some mentees specified are a not a part of the given pathway.');
    }

    const existing = await MentorTree.query(txn)
      .where({ pathway_id: pathwayId, mentor_id: userId })
      .whereIn('mentee_id', menteeIds);
    if (existing.length > 0) {
      throw Boom.badRequest(
        'Some mentees specified already existing as mentees of the current user.'
      );
    }

    const objToAdd = menteeIds.map((menteeId) => ({
      mentor_id: userId,
      mentee_id: menteeId,
      pathway_id: pathwayId,
    }));
    await MentorTree.query(txn).insert(objToAdd);

    return userId;
  }

  // #TODO
  async deleteMentees(pathwayId, userId, menteeIds, txn) {
    const { MentorTree, StudentPathways } = this.server.models();

    // check if the specified mentees are a part of the given pathway
    const pathwayMembership = await StudentPathways.query(txn)
      .where({ pathway_id: pathwayId })
      .whereIn('user_id', menteeIds);
    if (pathwayMembership.length !== menteeIds.length) {
      throw Boom.badRequest('Some mentees specified are a not a part of the given pathway.');
    }

    const existing = await MentorTree.query(txn)
      .where({ pathway_id: pathwayId, mentor_id: userId })
      .whereIn('mentee_id', menteeIds);
    if (existing.length !== menteeIds.length) {
      throw Boom.badRequest('Some mentees specified are not the mentees of the specified user.');
    }

    await MentorTree.query(txn)
      .where({ pathway_id: pathwayId, mentor_id: userId })
      .whereIn('mentee_id', menteeIds)
      .del();

    return userId;
  }

  async getMentees(pathwayId, userId, txn) {
    const { MentorTree, User } = this.server.models();

    let menteeIds = await MentorTree.query(txn).where({ mentor_id: userId, pathway_id: pathwayId });
    menteeIds = menteeIds.map((r) => r.mentee_id);
    let mentees;
    try {
      mentees = await User.query(txn).whereIn('id', 'asdas');
      return [null, mentees];
    } catch (err) {
      return [errorHandler(err), null];
    }
  }

  async getMentorTree(pathwayId, txn) {
    const { MentorTree, User } = this.server.models();

    const treeNodes = await MentorTree.query(txn).where({ pathway_id: pathwayId });

    // get details of all users which exist in the tree
    const userIds = new Set();
    treeNodes.forEach((node) => {
      userIds.add(node.mentor_id);
      userIds.add(node.mentee_id);
    });
    const users = await User.query(txn).findByIds(Array.from(userIds));
    const userMapping = {};
    users.forEach((user) => (userMapping[user.id] = user));

    // find the roots of the mentor tree
    const userIdAddedToTree = new Set();
    const tree = treeNodes
      .map((node) => {
        const mentorId = node.mentor_id;
        const mentors = treeNodes
          .map((n) => {
            return n.mentee_id === mentorId ? n : null;
          })
          .filter((m) => m);
        if (mentors.length === 0) {
          if (!userIdAddedToTree.has(mentorId)) {
            userIdAddedToTree.add(mentorId);
            return { ...userMapping[mentorId], mentees: [] };
          }
        }
        return null;
      })
      .filter((m) => m);

    // find children of root
    const addNodeChildren = (root) => {
      treeNodes.forEach((n) => {
        if (parseInt(n.mentor_id, 10) === parseInt(root.id, 10)) {
          root.mentees.push({ ...userMapping[n.mentee_id], mentees: [] });
        }
      });
      root.mentees.forEach((m) => addNodeChildren(m));
    };
    tree.forEach((root) => addNodeChildren(root));
    return tree;
  }
};
