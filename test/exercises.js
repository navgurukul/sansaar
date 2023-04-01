let [chai,expect,token, performance,responceTimeTest,url] = require('./configure/chaiConfigure')


describe(`/exercises, GET and POST API'S test !!`, () => {
  it(' || /exercises/{exerciseId}/exercises GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const name = 'python';
      const res = await chai
      .request(url)
      .get(`/exercises/2/exercises?lang=en`)
      .set('Authorization', `Bearer ${token}`);
      
      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('exercises');
    }
  });

//   it(' || /search/{user_id}/{name} POST API test || should return status code 200', async () => {
//     const obs = responceTimeTest()

//     obs.observe({ entryTypes: ['measure'] });
    
//     // Make 5 requests and measure their performance
//     for (let i = 0; i < 5; i++) {
//       performance.mark(`start-${i}`);
//       const name = 'python';
//       const res = await chai
//         .request(url)
//         .post(`/search/${user_id}/${name}`)
//         .set('Authorization', `Bearer ${token}`);
        
//       performance.mark(`end-${i}`);
//       performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

//       expect(res).to.have.status(200);
//       expect(res).to.be.json;
//       expect(res.body).to.be.an('object');
//     }
//   });

//   it(' || /search GET API test || GET API test status 200', async () => {
//       const obs = responceTimeTest()
  
//       obs.observe({ entryTypes: ['measure'] });
      
//       // Make 5 requests and measure their performance
//       for (let i = 0; i < 5; i++) {
//         performance.mark(`start-${i}`);
//         const res = await chai.request(url).get('/search/popular');

//         performance.mark(`end-${i}`);
//         performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

//         expect(res).to.have.status(200);
//         expect(res.body).to.have.property('top_popular');
//         expect(res.body).to.be.an('object');
//       }
//     });
});
