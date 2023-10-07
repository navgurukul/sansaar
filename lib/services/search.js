/* eslint-disable no-unused-vars */
const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');
const CONSTANTS = require('../config/index');
const errorHandling = require('../errorHandling');
const { string } = require('@hapi/joi');


module.exports = class searchService extends Schmervice.Service {
  async popularSearch(){
    let { UserPopularSearch } = this.server.models();
    const popularSearchData = await UserPopularSearch.query().select().orderBy('count', 'desc').limit(5);
    // console.log(popularSearchData);

    let popSrc = popularSearchData.map((element) => {
        return element.course_name
    });
    return [null, { top_popular: popSrc }];
  }
  async showing_popular_searches(userID) {
    const { UserSearch, UserPopularSearch } = this.server.models();

    try {
      const popularSearchData = await UserPopularSearch.query().select().orderBy('count', 'desc').limit(5);

      // console.log(!userID == null, 'userID: ', userID);
      const recentSearchData = await UserSearch.query().where({ user_id: userID });
      let total_array = [...popularSearchData, ...recentSearchData];
      let user_search = [];
      let top_popular = [];
      total_array.map((element) => {
        if ('name' in element) {
          user_search.push(element.name);
        } else {
          top_popular.push(element.course_name);
        }
      });

      return [null, { top_popular: top_popular, user_search: user_search }];
    } catch (e) {
      return [errorHandler(e), null];
    }
  }

  async sending_data(payload_data) {
    const { UserSearch, UserPopularSearch } = this.server.models();

    // function for storing the every quary data
    async function createUserSearch(payload_data) {
      let date = new Date(Date.now() - 60 * 60 * 1000);
      payload_data['created_at'] = date.toString();

      let d = await UserSearch.query().insert(payload_data);
    }

    // function for Popular quary search increment the count
    async function incrementPopularSearchCount(courseName) {
      let bool = await UserPopularSearch.query().where({ course_name: payload_data['name'] });
      if (bool.length) {
        let total = bool[0]['count'] + 1;
        await UserPopularSearch.query().findById(bool[0]['id']).patch({ count: total });

        let date = new Date(Date.now() - 60 * 60 * 1000);
        let r = await UserSearch.query()
          .where({ user_id: payload_data.user_id })
          .where({ name: payload_data['name'] });

        if (r.length) {
          await UserSearch.query().findById(r[0]['id']).patch({ created_at: date.toString() });
        } else {
          await createUserSearch(payload_data);
        }
      } else {
        await UserPopularSearch.query().insert({ course_name: payload_data['name'], count: 1 });
        await createUserSearch(payload_data);
      }
    }

    try {
      await incrementPopularSearchCount(payload_data.name);

      const maxRows = 5; // maximum number of rows allowed in the table

      // Check the number of rows in the table
      let [rowCount] = await UserSearch.query().where({ user_id: payload_data.user_id }).count('*');

      // If the row count is greater than the maximum allowed, delete the oldest rows
      if (rowCount.count > maxRows) {
        const oldestRow = await UserSearch.query()
          .where({ user_id: payload_data.user_id })
          .orderBy('created_at')
          .first();

        await UserSearch.query().where({ user_id: payload_data.user_id }).deleteById(oldestRow.id);
      }

      return [null, { Status: 'data sended succesfully bye bye' }];
      // handle error
    } catch (error) {
      return [errorHandler(error), null];
    }
  }
};