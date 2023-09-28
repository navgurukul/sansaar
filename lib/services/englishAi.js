/* eslint-disable prettier/prettier */
const Schmervice = require('schmervice');
const { errorHandler } = require('../errorHandling');
const logger = require('../../server/logger');
const { log } = require('handlebars');

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

  async addEnglishAiUserReading(data) {
    const { EnglishAiUsersVoiceRecognise, EnglishAiContent } = this.server.models();
  
    try {
      // Get the user's reading and the corresponding English AI content
      const usersReading = data.users_reading;
  
      // Split the user's reading into lines
      const userLines = usersReading.split(/\n+/);
  
      const results = [];
  
      for (const line of userLines) {
        const englishAiContent = await EnglishAiContent.query().select('content').where('id', data.english_ai_content_id).first();
  
        if (!englishAiContent) {
          // Handle the case where the English AI content is not found for this line
          results.push({ message: 'English AI content not found for this line' });
          continue;
        }
  
        // Split the line into words
        const userWords = line.split(/\s+/);
        const contentWords = englishAiContent.content.split(/\s+/);
  
        // Find words in the line that don't match the content
        const unmatchedWords = userWords.filter(word => !contentWords.includes(word));
  
        // Create a new object to store the matched and unmatched words for this line
        const result = {
          matchedWords: contentWords,
          unmatchedWords,
          allWords: userWords, // Store all words in this field
        };
  
        // Insert the user's reading data for this line into the database
        // eslint-disable-next-line no-await-in-loop
        const addUserReading = await EnglishAiUsersVoiceRecognise.query().insert({
          ...data,
          users_reading: line, // Insert the line as the users_reading value
          wrong_words_pronounced: unmatchedWords.join(' '), // Insert unmatched words for this line
        });
  
        // Add the result for this line to the results array
        results.push({ addUserReading, result });
      }
  
      // Return the array of results
      return [null, results];
    } catch (err) {
      logger.error(JSON.stringify(err));
      return [errorHandler(err), null];
    }
  }
  
  
  
};
