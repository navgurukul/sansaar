exports.up = async (knex) => {
    await knex.schema.createTable('main.english_ai_users_voice_recognise', (table) => {
        table.increments().primary();
        table.text('users_reading').notNullable();
        table.text('wrong_words_pronounced').notNullable();
        table.integer('level').notNullable();
        table.integer('english_ai_content_id').references('id').inTable('main.english_ai_content').notNullable();
        table.integer('user_id').references('id').inTable('main.users').notNullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.english_ai_users_voice_recognise');
};
