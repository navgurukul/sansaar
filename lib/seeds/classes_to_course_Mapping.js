/* eslint-disable no-undef */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
/* eslint-disable prettier/prettier */

const Strapi = require('strapi-sdk-js');

const strapi = new Strapi({
    url: process.env.STRAPI_URL,
});

// eslint-disable-next-line func-names, consistent-return
exports.seed = async function (knex) {
    try {
        const startTime = Date.now();

        // all assessments from sansaar
        const v2Completion = await knex('main.exercises_v2')
            .select('exercises_v2.id', 'exercises_v2.name');

        let strapiExer = [];
        let start = 0;
        const limit = 100;
        const total = 1366; // how much data you want from strapi database
        while (strapiExer.length < total) {
            // eslint-disable-next-line no-await-in-loop
            const { data } = await strapi.find('exercises', {
                sort: 'createdAt:asc',
                pagination: { start, limit },
                fields: ['id', 'name']
            });
            strapiExer = strapiExer.concat(data);
            start += limit;
        }


        const dictionary = {};

        for (const v2Item of v2Completion) {
            for (const strapiItem of strapiExer) {
                if (v2Item.name === strapiItem.attributes.name) {
                    dictionary[strapiItem.id] = v2Item.id;
                    await knex('main.classes_to_courses').update('exercise_v2', strapiItem.id).where('exercise_v2',v2Item.id);
                    const endTime = Date.now();
                    console.log(endTime - startTime, '- time taken in millisec');
                    break; // Once a match is found, exit the inner loop
                }
            }
        }

    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        return error;
    }
};




// relation make exercise_v2 mapp exercise_v2 select name
//    