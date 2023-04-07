let [chai,expect,token, performance,responceTimeTest,url] = require('./configure/chaiConfigure')


describe(`/pathways, || GET and POST API'S test !!`, () => {
  it(' || /pathways GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get(`/pathways?courseType=json`)
      .set({ 'version-code': 52})

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('pathways');
    }
  });

  it(' || /pathways/{pathwayId} GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get(`/pathways/2?courseType=json`)
      .set({ 'version-code': 52})
      
      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('pathway');
    }
  });

  it(' || /pathways/{pathwayId}/courses  GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get(`/pathways/2/courses?courseType=json`)
      .set({ 'version-code': 52})
      
      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('courses');
    }
  });

  it(' || /pathways/ResidentialPathway  GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get(`/pathways/ResidentialPathway`)
      
      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');

    }
  }); ///pathways/ongoingTopic

  it(' || /pathways/ongoingTopic  GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/ongoingTopic')
      .set({ 'version-code': 52, 'Authorization': `Bearer ${token}`});
      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');

    }
  });

  it(' || /pathways/courses  GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/courses?courseType=json')
      .set({ 'version-code': 52})

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
    }
  });


  it(' || /pathways/complete  GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/complete')
      .set({ 'version-code': 52, 'Authorization': `Bearer ${token}`});

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');

    }
  });

  it(' || /pathways/{pathwayId}/mentorship/tree GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/complete')
      .set({ 'version-code': 5, 'Authorization': `Bearer ${token}`});

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');

    }
  });
  it(' || //pathways/{pathwayId}/upcomingBatches GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/2/upcomingBatches')
      .set({'Authorization': `Bearer ${token}`});

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');

    }
  });
  it(' || /​pathways​/{pathwayId}​/upcomingEnrolledClasses GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/2/upcomingBatches')
      .set({'Authorization': `Bearer ${token}`});

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');

    }
  });

  it(' || /pathways/{pathwayId}/upcomingEnrolledRevisionClasses GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/2/upcomingEnrolledRevisionClasses')
      .set({'Authorization': `Bearer ${token}`});

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');

    }
  });

  it(' || /pathways/{pathwayId}/userEnrolledClasses GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/2/userEnrolledClasses')
      .set({'Authorization': `Bearer ${token}`});

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');

    }
  });

  it(' || /pathways/checkIfCodeExists GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/checkIfCodeExists?code=PRGPYT')
      .set({'Authorization': `Bearer ${token}`});

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('pathway');
    }
  });

  it(' || /pathways/complete GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/complete')
      .set({ 'version-code': 52, 'Authorization': `Bearer ${token}`});

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');
    }
  });

  it(' || /pathways/courses GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/courses?courseType=json')
      .set({ 'version-code': 52, 'Authorization': `Bearer ${token}`});

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('id');
    }
  });

  // it(' || /pathways/ongoingTopic GET API test || should return status code 200', async () => {
  //   const obs = responceTimeTest()
  //   obs.observe({ entryTypes: ['measure'] });
    
  //   // Make 5 requests and measure their performance
  //   for (let i = 0; i < 5; i++) {
  //     performance.mark(`start-${i}`);
  //     const res = await chai
  //     .request(url)
  //     .get('/pathways/ongoingTopic')
  //     .set({ 'version-code': 52, 'Authorization': `Bearer ${token}`});

  //     performance.mark(`end-${i}`);
  //     performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

  //     expect(res).to.have.status(200);
  //     expect(res).to.be.json;
  //     expect(res.body).to.be.an('array');
  //   }
  // }); // /pathways/ResidentialPathway

  it(' || /pathways/ongoingTopic GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/ongoingTopic')
      .set({ 'version-code': 52, 'Authorization': `Bearer ${token}`});

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('array');
    }
  });


  it(' || /pathways/ResidentialPathway GET API test || should return status code 200', async () => {
    const obs = responceTimeTest()
    obs.observe({ entryTypes: ['measure'] });
    
    // Make 5 requests and measure their performance
    for (let i = 0; i < 5; i++) {
      performance.mark(`start-${i}`);
      const res = await chai
      .request(url)
      .get('/pathways/ResidentialPathway')
      .set({'Authorization': `Bearer ${token}`});

      performance.mark(`end-${i}`);
      performance.measure(`loadingTime-${i}`, `start-${i}`, `end-${i}`);

      expect(res).to.have.status(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
    }
  });
})