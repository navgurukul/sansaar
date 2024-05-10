// // will create levelwise content from the article sources

// const { OpenAI } = require('openai');
// const accessGoogleSheet = require('./readSheet');
// require('dotenv').config();
// const { openAiAPI } = require('../../config/index');

// const openai = new OpenAI({
//   apiKey: openAiAPI,
// });

// // It will contain all the article sources from the google sheet
// let articleSources = [];

// // const source = articleSources[1];
// const chatCompletion = async () => {
//   const prompt = `As an experienced English tutor with over 20 years of teaching, you plan to teach your students by converting articles from the internet into different difficulty levels (1, 2, 3, 4, 5). Your goal is to maintain the same information across all levels while adjusting language complexity. Difficulty Level [1/2/3/4/5] - (Beginner/Elementary/Intermediate/Advanced/Expert) generate a JSON response. Article - ${articleSources} Convert the article content to the specified difficulty level while maintaining the same information. Adjust language complexity, sentence structures, and vocabulary accordingly. don't give a summary or conclusion. Just give the title name and article according to the levels specified above.
//     follow this format: { "title": [article title], "allLevels": [ "Level_1": { "content": [ at least 200 words] }, "Level_2": { "content": [at least 230 words] }, "Level_3": { "content": [at least 280 words] }, "Level_4": { "content": [at least 300 words] }, "Level_5": { "content": [at least 350 words] } ] } use the exact format as above.`;

//   try {
//     const gptRes = await openai.chat.completions.create({
//       messages: [{ role: 'user', content: prompt }],
//       model: 'gpt-3.5-turbo-0613',
//     });

//     const resp = gptRes.choices[0].message.content;
//     return resp;
//   } catch (error) {
//     console.error('Error:', error);
//   }
// };

// /**
//  * The `run` function retrieves article sources from a Google Sheet, creates levelwise content from the sources using chat
//  * completion, and returns the levels.
//  * @returns The function `run` is returning the `levels` variable.
//  */
// const run = async () => {
//   // will get all the article sources from the google sheet
//   const articleData = await accessGoogleSheet();
//   articleSources = articleData.flat()[0];
//   console.log(articleSources, '-->--------source_url')
//   const levels  = await chatCompletion();
//   return [articleSources, levels];
// };

// // Let's play!
// // run();

// module.exports = run;
