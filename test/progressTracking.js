let [chai,expect,token, performance,responceTimeTest,url] = require('./configure/chaiConfigure')


describe(`/progressTracking, || GET and POST API'S test !!`, () => {
  it(' || /progressTracking/{courseId}/completedCourseContentIds GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get(`/progressTracking/1/completedCourseContentIds`)
      .set({'Authorization': `Bearer ${token}`});
      
      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('exercises');
    }
    }); 
});