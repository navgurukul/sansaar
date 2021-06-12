exports.up = async (knex) => {
    await knex.schema.withSchema('main').renameTable('campus', 'student_campus');
    await knex.schema.createTable('main.campus', (table) => {
        table.increments();
        table.string('campus', 225);
      });
    await knex.schema.alterTable('main.student_campus',(table)=>{
        table.dropColumn('campus');
        table.integer("campus_id").references('id').inTable('main.campus');
    })
};
exports.down = async (knex) => {
    await knex.schema.alterTable('main.student_campus',(table)=>{
        table.dropColumn('campus_id');
        table.string('campus');
    })
    await knex.schema.dropTable('main.campus');
    await knex.schema.withSchema('main').renameTable('student_campus', 'campus');
};