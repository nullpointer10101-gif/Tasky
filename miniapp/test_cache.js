const api = {
  get: async (url) => {
    console.log('originalGet called for', url);
    return new Promise(resolve => setTimeout(() => resolve({ data: 'hello ' + url }), 100));
  }
};

const getCache = new Map();
const CACHE_TTL = 30000;

const originalGet = api.get;
api.get = async (url, config) => {
  const key = url + JSON.stringify(config || {});
  if (getCache.has(key)) {
    const cached = getCache.get(key);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return Promise.resolve(cached.res);
    }
  }
  const res = await originalGet(url, config);
  getCache.set(key, { res, timestamp: Date.now() });
  return res;
};

const wrap = async (fn) => {
  const res = await fn();
  return { data: res.data };
};

async function test() {
  console.log('Call 1');
  let res1 = await wrap(() => api.get('/test'));
  console.log(res1);
  
  console.log('Call 2');
  let res2 = await wrap(() => api.get('/test'));
  console.log(res2);
}

test();
