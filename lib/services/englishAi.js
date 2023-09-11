const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');

module.exports = class EnglishAiService extends Schmervice.Service {
  async getAllEnglishContent() {
    const { EnglishAiContent } = this.server.models();
    const EnglishAiData = {};
    try {
      const data = await EnglishAiContent.query().orderBy('title');
      data.forEach((article) => {
        const { title, level, link, id } = article;

        if (!EnglishAiData[title]) {
          EnglishAiData[title] = {
            title: {},
            level1: {},
            level2: {},
            level3: {},
            level4: {},
            level5: {},
            id: {},
            link,
          };
        }

        EnglishAiData[title].title = article.title;
        EnglishAiData[title][`level${level}`] = article.content;
        EnglishAiData[title].id[level] = id;
      });

      const finalData = { articles: Object.values(EnglishAiData) };
      return [null, finalData];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getEnglishAiDataByLevel(level) {
    const { EnglishAiContent } = this.server.models();
    let EnglishAiData;
    try {
      EnglishAiData = await EnglishAiContent.query().where('level', level);
      return [null, EnglishAiData];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getEnglishAiDataByid(id) {
    const { EnglishAiContent } = this.server.models();
    try {
      const EnglishAiUserData = await EnglishAiContent.query().where('id', id);
      return [null, EnglishAiUserData];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async getEnglishAiHistoryByUser(userId) {
    const { EnglishAiHistory } = this.server.models();
    try {
      const EnglishAiUserHist = await EnglishAiHistory.query()
        .where('user_id', userId)
        .orderBy('createdAt');
      return [null, EnglishAiUserHist];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async addEnglishAiContent(data) {
    const { EnglishAiContent } = this.server.models();
    try {
      const EnglishAiCont = await EnglishAiContent.query().insert(data);
      return [null, EnglishAiCont];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async addEnglishAiContentHistory(contentId, userId) {
    const { EnglishAiHistory } = this.server.models();
    try {
      const data = {
        user_id: userId,
        english_ai_id: contentId,
        createdAt: new Date(),
      };
      const existingRecord = await EnglishAiHistory.query()
        .where('user_id', userId)
        .andWhere('english_ai_id', contentId)
        .first();

      if (!existingRecord) {
        const EnglishAiUserHist = await EnglishAiHistory.query().insert(data);
        return [null, EnglishAiUserHist];
      }
      return [null, existingRecord];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }
};