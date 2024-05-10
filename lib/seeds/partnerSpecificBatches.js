exports.seed = async function (knex) {
  try {
    return (
      knex('main.partner_specific_batches')
        .select('*')
        // eslint-disable-next-line
              .then(async (data) => {
          // eslint-disable-next-line
                for (let i of data) {
            console.log('i: ', i);
            // eslint-disable-next-line
                  await knex('main.partner_specific_batches_v2').insert(i);
          }
        })
    );
  } catch (err) {
    console.log('err: ', err);
    return [errorHandler(err), null];
  }
};
