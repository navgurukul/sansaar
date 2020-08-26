exports.up = async (knex) => {
  await knex.schema.table('main.users', (table) => {
    table.renameColumn('createdAt', 'created_at');
  });
  await knex.schema.table('main.pathways', (table) => {
    table.renameColumn('createdAt', 'created_at');
  });
  await knex.schema.table('main.pathway_milestones', (table) => {
    table.renameColumn('createdAt', 'created_at');
  });
  await knex.schema.table('main.sansaar_user_roles', (table) => {
    table.renameColumn('createdAt', 'created_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.table('main.users', (table) => {
    table.renameColumn('created_at', 'createdAt');
  });
  await knex.schema.table('main.pathways', (table) => {
    table.renameColumn('created_at', 'createdAt');
  });
  await knex.schema.table('main.pathway_milestones', (table) => {
    table.renameColumn('created_at', 'createdAt');
  });
  await knex.schema.table('main.sansaar_user_roles', (table) => {
    table.renameColumn('created_at', 'createdAt');
  });
};
