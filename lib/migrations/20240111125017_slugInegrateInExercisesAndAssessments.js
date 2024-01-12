exports.up = async (knex) => {
    await knex.schema.alterTable('main.assessment_outcome', function (table) {
        table.integer('slug_id').nullable();
        table.integer('assessment_id').nullable().alter();
    });

    await knex.schema.alterTable('main.exercise_completion_v2', function (table) {
        table.integer('slug_id').nullable();
        table.integer('exercise_id').nullable().alter();

    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('main.assessment_outcome', function (table) {
        table.dropColumn('slug_id'); 
    });
    await knex.schema.alterTable('main.exercise_completion_v2', function (table) {
        table.dropColumn('slug_id'); 
    });
};
