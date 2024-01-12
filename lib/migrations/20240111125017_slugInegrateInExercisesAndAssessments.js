exports.up = async (knex) => {
    await knex.schema.alterTable('main.assessment_outcome', function (table) {
        table.integer('slug_id').nullable();
    });

    await knex.schema.alterTable('main.exercise_completion_v2', function (table) {
        table.integer('slug_id').nullable();
    });
};

exports.down = async (knex) => {
    await knex.schema.alterTable('main.assessment_outcome', function (table) {
        table.dropColumn('slug_id'); 
    });
    await knex.schema.alterTable('main.aexercise_completion_v2', function (table) {
        table.dropColumn('slug_id'); 
    });
};
