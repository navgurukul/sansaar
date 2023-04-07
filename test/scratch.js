let [chai,expect,token, performance,responceTimeTest,url] = require('./configure/chaiConfigure')


describe(`/exercises, GET and POST API'S test !!`, () => {
  it(' || /scratch/{projectId} GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get(`/scratch/33`)
      .set('Authorization', `Bearer ${token}`);
      
      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
    }
  });
  
  it(' || /scratch/FileUploadS3/{projectId} GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get(`/scratch/FileUploadS3/1`)
      .set('Authorization', `Bearer ${token}`);
      
      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
    }
  });
});
