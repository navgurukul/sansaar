exports.up = async (knex) => {
    await knex.schema.createTable('main.partner_specific_batches_v2', (table) => {
        table.increments().primary();
        table.integer('class_id').unsigned().references('id').inTable('main.classes');
        table
            .integer('recurring_id')
            .unsigned()
            .references('id')
            .inTable('main.recurring_classes')
            .nullable();
        table.integer('space_id')
            .unsigned()
            .references('id')
            .inTable('main.partner_space')
            .onDelete('set null');
        table.integer('group_id')
            .unsigned()
            .nullable()
            .references('id')
            .inTable('main.space_group')
            .onDelete('set null');
        table.integer('partner_id').unsigned().references('id').inTable('main.partners');
        table.integer('pathway_id');
    });
};
exports.down = async (knex) => {
    await knex.schema.dropTable('main.partner_specific_batches_v2');
};
