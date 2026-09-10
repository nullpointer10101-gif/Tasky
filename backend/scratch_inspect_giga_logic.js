async function checkGigaInternals() {
  const res = await fetch('https://ad.gigapub.tech/script?id=8093');
  const text = await res.text();
  console.log('Script Length:', text.length);

  // Let's inspect how return values and completion work in showAd
  const showAdIdx = text.indexOf("async['showAd']");
  const sub = text.substring(showAdIdx, showAdIdx + 4000);
  console.log('--- SHOW AD LOGIC ---');
  console.log(sub);
}

checkGigaInternals();
