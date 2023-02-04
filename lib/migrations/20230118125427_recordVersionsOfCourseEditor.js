exports.up = async (knex) => {
    await knex.schema.createTable('record_versions_of_post_delete_exercisedetails', (table)=>{
        table.increments('id').primary();
        table.integer('course_id').references('id').inTable('main.courses_v2');
        table.integer('exercise_id').references('id').inTable('main.exercises_v2');
        table.string('version');
        table.boolean('addedOrRemoved');
    })
};

exports.down = async (knex) => {
    await knex.schema.dropTable('record_versions_of_post_delete_exercisedetails');
};

