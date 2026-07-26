fetch('https://t.me/s/Tasky_Official').then(r => r.text()).then(t => {
  const matches = [...t.matchAll(/data-post="Tasky_Official\/(\d+)"/g)];
  console.log(matches.map(m => m[1]).pop());
});
