exports.up = async (knex) => {
    await knex.schema.table('main.scratch', (table) => {
        table.string('project_name'),
            table.datetime('updated_at');
    });
};

exports.down = async (knex) => {
    await knex.schema.table('main.scratch', (table) => {
        table.string('project_name'),
            table.dropColumn('updated_at');
    });
};