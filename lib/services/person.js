const Schmervice = require('schmervice');

module.exports = class PersonService extends Schmervice.Service {
  async getAllPersons(query) {
    console.log(query, "getmethod")
    const { PersonInformation } = this.server.models();
    const { limit = 10, page = 1, name } = query;
    const offset = (page - 1) * limit;
    console.log(offset)
    console.log(offset, page, limit)

    try {
      let personsQuery = PersonInformation.query().orderBy('email').limit(limit).offset(offset);
      if (name) {
        personsQuery = personsQuery.whereRaw('LOWER(email) LIKE ?', [`%${name.trim().toLowerCase()}%`]);
      }
      const persons = await personsQuery;
      const count = await PersonInformation.query().count();
      return [null, { persons, count: count[0].count }];
    } catch (err) {
      return [err, null];
    }
  }

  async addPerson(payload) {
    console.log(payload, "service file");
    const { PersonInformation } = this.server.models();
    console.log(PersonInformation,"add data")

    try {
      const existingPerson = await PersonInformation.query().findOne({ email: payload.email });

      if (existingPerson) {

        return {
          statusCode: 400,
          Code: true,
          message: 'Cannot add this email because it already exists in the table.',
        };
      }


      const newPerson = await PersonInformation.query().insert(payload);


      return {
        statusCode: 201,
        message: 'Person added successfully.',
        data: newPerson,
      };

    } catch (err) {
      return {
        statusCode: 500,
        errorCode: 'INTERNAL_ERROR',
        message: err.message,
      };
    }
  }


  async updatePerson(id, payload) {
    const { PersonInformation } = this.server.models();

    try {

      const currentPerson = await PersonInformation.query().findById(id);
      if (!currentPerson) {
        return { statusCode: 404, status: 'error', message: `Person not found with ID ${id}.` };


      }

      let isUpdateMade = false;
      const updateData = {};

      if (payload.state && payload.state !== currentPerson.state) {
        updateData.state = payload.state;
        isUpdateMade = true;
      }


      if (payload.number && payload.number !== currentPerson.number) {
        updateData.number = payload.number;
        isUpdateMade = true;
      }

      if (payload.email && payload.email !== currentPerson.email) {
        return { statusCode: 409, status: 'error', message: "Email ID cannot be updated because it is unique." };

      }


      if (!isUpdateMade) {
        return { statusCode: 400, status: 'error', message: "No updates were made. You cannot change email ID." };

      }


      const updatedPerson = await PersonInformation.query().patchAndFetchById(id, updateData);
      return { statusCode: 200, status: 'success', message: 'Update successful', data: updatedPerson };


    } catch (err) {
      console.error(err.message);
      return { statusCode: 404, status: 'error', message: "An error occurred during the update process." };
    }
  }



  async deletePerson(id) {
    const { PersonInformation } = this.server.models();

    try {
      console.log(`Attempting to delete person with ID ${id}`);

      const deleteCount = await PersonInformation.query().deleteById(id);
      console.log(deleteCount)

      if (deleteCount === 0) {
        console.log(`Person with ID ${id} not found`);
        return {
          statusCode: 404,
          status: 'error',
          message: `Person not found with ID ${id}.`
        };
      }


      console.log(`Person with ID ${id} successfully deleted`);
      return {
        statusCode: 204,
        status: 'success',
        message: "Your data has been successfully deleted."
      };

    } catch (err) {
      console.error(`Error occurred during delete operation: ${err.message}`);
      return {
        statusCode: 500,
        status: 'error',
        message: "An error occurred during the delete process."
      };
    }
  }

}




