/* eslint-disable prettier/prettier */
// eslint-disable-next-line
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  const Email = ['example@gmail.com']; // list of emails
  await knex('users').update('partner_id', 904).whereIn('email', Email);
};
