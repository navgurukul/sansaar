let [chai,expect,token, performance,responceTimeTest,url] = require('./configure/chaiConfigure')




describe(`/search || GET and POST API'S test !!`, () => {
  it(' || /allVolunteers GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const name = 'python';
      const res = await chai
      .request(url)
      .get(`/allVolunteers`)
      .set('Authorization', `Bearer ${token}`);
      
      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');
    }
});});