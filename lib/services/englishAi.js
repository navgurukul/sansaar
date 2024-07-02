/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
// const generateContent = require('../helpers/englishAi/generateContent');

module.exports = class EnglishAiService extends Schmervice.Service {
  // async getCurrentArticle() {
  //   const { EnglishAiArticle, EnglishAiArticleLevelwise } = this.server.models();
  //   const EnglishAiData = [];
  //   try {
  //     // const currentDate = new Date().toISOString().split('T')[0];
  //     const data = await EnglishAiArticle.query();
  //     // .whereRaw("DATE_TRUNC('day', created_at) = ?", [
  //     //   currentDate,
  //     // ]);
  //     data.forEach(async (article) => {
  //       const { title, source_url, id } = article;
  //       console.log(title, source_url, id, '----------article');

  //       const levelwiseData = await EnglishAiArticleLevelwise.query().where('article_id', id);
  //       console.log(levelwiseData, '----------data----------englishAi.js');
  //       const articleData = {};
  //       for (let i in levelwiseData) {
  //         articleData.title = title;
  //         const levelWise = {};
  //         for (j in levelwiseData[i]) {
  //           levelWise.id = i.id,
  //           levelWise.level = i.level,
  //           levelWise.content = i.content,

  //         }
  //         articleData.levelWise = levelWise;
  //       }
  //       EnglishAiData.push(articleData);

  //       // if (!EnglishAiData[title]) {
  //       //   EnglishAiData[title] = {
  //       //     title: {},
  //       //     level1: {},
  //       //     level2: {},
  //       //     level3: {},
  //       //     level4: {},
  //       //     level5: {},
  //       //     id: {},
  //       //   };
  //       // }

  //       // EnglishAiData[title].title = title;
  //       // EnglishAiData[title].levelWiseContent = levelwiseData;
  //       // EnglishAiData[title].id[level] = id;
  //     });

  //     console.log(EnglishAiData, '----------EnglishAiData');
  //     const finalData = { articles: Object.values(EnglishAiData) };
  //     return [null, finalData];
  //   } catch (error) {
  //     logger.error(JSON.stringify(error));
  //     return [errorHandler(error), null];
  //   }
  // }

  async getCurrentArticle() {
    const { EnglishAiArticle, EnglishAiArticleLevelwise } = this.server.models();
    const EnglishAiData = [];

    try {
      const articles = await EnglishAiArticle.query();

      // Using Promise.all to wait for all levelwise data before constructing the final format
      await Promise.all(
        articles.map(async (article) => {
          const { id, title, source_url, created_at } = article;
          const levelwiseData = await EnglishAiArticleLevelwise.query().where('article_id', id);

          const articleData = {
            id,
            title,
            source_url,
            createdAt: created_at,
            levelWise: {},
          };

          levelwiseData.forEach((level) => {
            articleData.levelWise[`level_${level.level}`] = {
              id: level.id,
              level: level.level,
              content: level.content,
            };
          });

          EnglishAiData.push(articleData);
        })
      );

      const finalData = { articles: EnglishAiData };
      return [null, finalData];
    } catch (error) {
      console.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getEnglishAiDataByLevel(level) {
    const { EnglishAiArticle } = this.server.models();
    let EnglishAiData;
    try {
      EnglishAiData = await EnglishAiArticle.query().where('level', level);
      return [null, EnglishAiData];
    } catch (error) {
      logger.error(JSON.stringify(error));
      return [errorHandler(error), null];
    }
  }

  async getEnglishAiDataByid(id) {
    const { EnglishAiArticle } = this.server.models();
    try {
      const EnglishAiUserData = await EnglishAiArticle.query().where('id', id);
      return [null, EnglishAiUserData];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async getEnglishAiHistoryByUser(user_id) {
    const { EnglishAiHistory } = this.server.models();
    try {
      const EnglishAiUserHist = await EnglishAiHistory.query()
        .where({ user_id })
        .orderBy('created_at');
      return [null, EnglishAiUserHist];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async addEnglishAiContent() {
    const { EnglishAiArticle, EnglishAiArticleLevelwise } = this.server.models();
    try {
      // const [source, generateLevels] = await generateContent();
      // if (!generateLevels) {
      //   return [null, 'Content not generated to save in DB'];
      // }
      // const levels = JSON.parse(generateLevels);
      // // console.log(typeof levels, '----------levels');
      // // console.log(levels.allLevels, '----------Alllevels');

      // const saveArticle = await EnglishAiArticle.query().insert({
      //   title: levels.title,
      //   source_url: source,
      // });
      // // console.log(saveArticle, '----------savedArticle');
      // const allLevels = [];
      // let levelCount = 1;
      // for (const levelKey in levels.allLevels) {
      //   const levelData = levels.allLevels[levelKey];
      //   // console.log(levelData, '----------levelData');
      //   try {
      //     const saveLevelwise = await EnglishAiArticleLevelwise.query().insert({
      //       level: levelCount, // Use levelKey as the level value
      //       content: JSON.stringify(
      //         levelData.content
      //           .replace(/\n\n/g, ' ')
      //           .replace(/\.(?=.* )/g, '. ')
      //           .trim()
      //       ),
      //       article_id: saveArticle.id,
      //     });
      //     levelCount++;
      //     // console.log('Level saved successfully:', saveLevelwise);
      //     allLevels.push(saveLevelwise);
      //   } catch (error) {
      //     console.error('Error saving level:', error);
      //   }
      // }
      // saveArticle.allLevels = allLevels;
      // return [null, saveArticle];
      return [null, 'not ready in production'];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }

  async addEnglishAiContentHistory(contentId, user_id) {
    const { EnglishAiHistory } = this.server.models();
    try {
      const data = {
        user_id,
        eng_articles_id: contentId,
        // createdAt: new Date(),
      };
      const existingRecord = await EnglishAiHistory.query()
        .where('user_id', user_id)
        .andWhere('eng_articles_id', contentId)
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
