const tableName = 'main.courses';
exports.up = async (knex) => {
  let existRows;
  return knex
    .select()
    .from(tableName)
    .then((rows) => {
      existRows = rows;
      return knex.schema.table(tableName, (table) => table.dropColumn('type'));
    })
    .then(() =>
      knex.schema.table(tableName, (table) =>
        table.enu('type', ['html', 'js', 'python', 'typing']).notNullable().default('html')
      )
    )
    .then(() => {
      return existRows.map((row) => {
        return knex(tableName).update({ type: row.type }).where('id', row.id);
      });
    });
};

exports.down = async (knex) => {
  let existRows;
  return knex
    .select()
    .from(tableName)
    .then((rows) => {
      existRows = rows;
      return knex.schema.table(tableName, (table) => table.dropColumn('type'));
    })
    .then(() =>
      knex.schema.table(tableName, (table) =>
        table.enu('type', ['html', 'js', 'python']).notNullable().default('html')
      )
    )
    .then(() => {
      return existRows.map((row) => {
        return knex(tableName)
          .update({ type: row.type === 'typing' ? 'html' : row.type })
          .where('id', row.id);
      });
    });
};
