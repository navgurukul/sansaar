exports.up = async (knex) => {
    await knex.schema.createTable('main.new_students_temp', (table) => {
        table.increments('id').primary();
        table.string('name', 300);
        table.integer('gender');
        table.timestamp('dob', { useTz: true });
        table.string('email', 150);
        table.string('state', 2);
        table.string('city', 45);
        table.string('gps_lat', 45);
        table.string('gps_long', 45);
        table.string('pin_code', 10);
        table.integer('qualification');
        table.integer('current_status');
        table.integer('school_medium');
        table.integer('religon');
        table.integer('caste');
        table.string('percentage_in10th', 255);
        table.integer('math_marks_in10th');
        table.string('percentage_in12th', 255);
        table.integer('math_marks_in12th');
        table.string('stage', 45).notNullable();
        table.string('tag', 255);
        table.integer('partner_id');
        table.timestamp('created_at', { useTz: true }).notNullable();
        table.timestamp('last_updated', { useTz: true });
        table.string('district', 255);
        table.integer('current_owner_id');
        table.string('partner_refer', 255);
        table.string('evaluation', 255);
        table.string('redflag', 255);
        table.text('image_url');
        table.string('other_activities', 255);
        table.string('campus_status', 255);
        table.integer('school_stage_id');
    });
};


exports.down = async (knex) => {
    await knex.schema.dropTable('main.new_students_temp') //, (table) => {
    //});
};
