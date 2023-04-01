let [chai, expect,token,performance,responceTimeTest,url] = require('./configure/chaiConfigure');

describe(`/courseEditor || GET and POST API'S test !!`,()=>{
    it(" || GET API /courseEditor/{courseId}/exercises || should return status code 200 || ",async ()=>{
        let obs = responceTimeTest()
        obs.observe({ entryTypes: ['measure'] });
    
        // Make 5 requests and measure their performance
        for (let i = 0; i < 5; i++) {
            performance.mark(`start-${i}`);
            const res = await chai
            .request(url)
            .get(`/courseEditor/4/exercises?lang=en`)
            .set('Authorization', `Bearer ${token}`);
            
            performance.mark(`end-${i}`);
            performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);
        
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('course');
            
        }
    })    
})