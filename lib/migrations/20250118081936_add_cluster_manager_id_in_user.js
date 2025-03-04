exports.up = async (knex, Promise) => {
  await knex.schema.table('main.users', (table) => {
    table.integer('cluster_manager_id').unsigned().nullable();

    table.foreign('cluster_manager_id')
      .references('id')
      .inTable('main.cluster_managers')
      .onDelete('SET NULL');
  });
};

exports.down = async (knex, Promise) => {
  await knex.schema.table('main.users', (table) => {
    table.dropForeign('cluster_manager_id');
    table.dropColumn('cluster_manager_id');
  });
};
