import handler from './api/analyze.js';

const req = {
  method: 'POST',
  body: { url: 'https://g1.globo.com' }
};

const res = {
  setHeader: () => {},
  status: (code) => {
    return {
      json: (data) => {
        console.log(`STATUS ${code}`, data);
      },
      end: () => console.log(`STATUS ${code}`)
    };
  }
};

handler(req, res).catch(console.error);
