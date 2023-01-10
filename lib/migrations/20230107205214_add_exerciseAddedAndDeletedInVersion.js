exports.up = async (knex) => {
    await knex.schema.createTable('main.exercise_Added_Deleted_Version', (table)=>{
        table.integer('course_id');
        table.integer('exercise_id');
        table.string('version');
        table.boolean('addedOrRemoved');
    })
};

exports.down = async (knex) => {
    await knex.schema.dropTable('main.exercise_Added_Deleted_Version');
};