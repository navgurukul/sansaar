exports.up = async (knex) => {
    await knex.schema.createTable('record_versions_of_post_delete_exercisedetails', (table)=>{
        table.increments('id').primary();
        table.integer('course_id');
        table.integer('exercise_id');
        table.string('version');
        table.boolean('addedOrRemoved');
    })
};

exports.down = async (knex) => {
    await knex.schema.dropTable('record_versions_of_post_delete_exercisedetails');
};

