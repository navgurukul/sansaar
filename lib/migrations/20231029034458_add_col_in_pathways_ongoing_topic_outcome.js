exports.up = async (knex) => {
    await knex.schema.alterTable('main.pathways_ongoing_topic_outcome', (table) => {
        table.integer('team_id');
        table.integer('module_id');
        table.integer('project_topic_id');
        table.integer('project_solution_id');
    });

    await knex.schema.alterTable('main.learning_track_status_outcome', (table) => {
        table.integer('module_id');
    });

};

exports.down = async (knex) => {
    await knex.schema.alterTable('main.pathways_ongoing_topic_outcome', (table) => {
        table.dropColumn('team_id');
        table.dropColumn('module_id');
        table.dropColumn('project_topic_id');
        table.dropColumn('project_solution_id');

    });

    await knex.schema.alterTable('main.learning_track_status_outcome', (table) => {
        table.dropColumn('module_id');
    });

};
