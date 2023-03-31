let [chai, expect,token,performance,responceTimeTest,url] = require('./configure/chaiConfigure');

describe(`HTTP ${url}/courses GET API test !!`,()=>{
    it(" || GET API /courses || should return status code 200 || ",async ()=>{
        let obs = responceTimeTest()
        obs.observe({ entryTypes: ['measure'] });
    
        // Make 5 requests and measure their performance
        for (let i = 0; i < 5; i++) {
            performance.mark(`start-${i}`);
            const name = 'python';
            const res = await chai
            .request(url)
            .get(`/courses`)
            .set('Authorization', `Bearer ${token}`);
            
            performance.mark(`end-${i}`);
            performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);
        
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.be.an('object');
            // expect(res.body).to.have.property('top_popular');
            
        }
    })
    
    it(" || GET API /courses/2 || should return status code 200 || ",async ()=>{
        let obs = responceTimeTest()
        obs.observe({ entryTypes: ['measure'] });
    
        // Make a request and measure its performance for each number
        for (let i = 0; i < 5; i++) {
          performance.mark(`start-${i}`);
          const res = await chai
          .request(url)
          .get('/courses/2/exercises?lang=en')
          .set({ 'version-code': 52, 'Authorization': `Bearer ${token}`});
          
          performance.mark(`end-${i}`);
          performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);
      
          expect(res).to.have.status(200);
          expect(res).to.be.json;
            expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('course');
        }
      })

      it(" || GET API /courses/name || should return status code 200 || ",async ()=>{
        let obs = responceTimeTest()
        obs.observe({ entryTypes: ['measure'] });
    
        // Make a request and measure its performance for each number
        for (let i = 0; i < 5; i++) {
          performance.mark(`start-${i}`);
          const res = await chai
          .request(url)
          .get('/courses/name?name=Grammar%20101&courseType=json')
          .set({ 'version-code': 52, 'Authorization': `Bearer ${token}`});
          
          performance.mark(`end-${i}`);
          performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);
      
          expect(res).to.have.status(200);
          expect(res).to.be.json;
            expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('course');
        }
      })
})