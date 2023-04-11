let [chai, expect,token,performance,responceTimeTest,url] = require('./configure/chaiConfigure');

describe(`/classes || GET and POST API'S test !!`,()=>{
    it(" || GET API /classes || should return status code 200 || ",async ()=>{
        let obs = responceTimeTest()
        obs.observe({ entryTypes: ['measure'] });
    
        // Make 5 requests and measure their performance
        for (let i = 0; i < 5; i++) {
            performance.mark(`start-${i}`);
            const res = await chai
            .request(url)
            .get(`/classes`)
            .set('Authorization', `Bearer ${token}`);
            
            performance.mark(`end-${i}`);
            performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);
        
            expect(res).to.have.status(200);
            
        };
    }) ;  
    it(" || GET API /classes/all || should return status code 200 || ",async ()=>{
        let obs = responceTimeTest()
        obs.observe({ entryTypes: ['measure'] });
    
        // Make 5 requests and measure their performance
        for (let i = 0; i < 5; i++) {
            performance.mark(`start-${i}`);
            const res = await chai
            .request(url)
            .get(`/classes/all`)
            .set('Authorization', `Bearer ${token}`);
            
            performance.mark(`end-${i}`);
            performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);
        
            expect(res).to.have.status(200);
            
        };
    });

    it(" || GET API /classes/studentEnrolment || should return status code 200 || ",async ()=>{
        let obs = responceTimeTest()
        obs.observe({ entryTypes: ['measure'] });
    
        // Make 5 requests and measure their performance
        for (let i = 0; i < 5; i++) {
            performance.mark(`start-${i}`);
            const res = await chai
            .request(url)
            .get(`/classes/studentEnrolment`)
            .set('Authorization', `Bearer ${token}`);
            
            performance.mark(`end-${i}`);
            performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);
        
            expect(res).to.have.status(200);
            
        };
    });
})