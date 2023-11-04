const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const { afterEach, beforeEach, describe, it } = exports.lab = Lab.script();
const { deployment } = require('../server/index');

describe('GET /', () => {
    let server;

    beforeEach(async () => {
        server = await deployment();
    });

    afterEach(async () => {
        await server.stop();
    });

    it('responds with 200', async () => {
        const res = await server.inject({
            method: 'get',
            url: '/courses'
        });
        expect(res.statusCode).to.equal(200);
    });
});
