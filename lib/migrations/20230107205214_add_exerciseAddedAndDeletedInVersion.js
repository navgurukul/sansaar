exports.up = async (knex) => {
    await knex.schema.createTable('main.exercise_added_deleted_version', (table)=>{
        table.integer('course_id');
        table.integer('exercise_id');
        table.string('version');
        table.boolean('addedOrRemoved');
    })
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.exercise_added_deleted_version');
};