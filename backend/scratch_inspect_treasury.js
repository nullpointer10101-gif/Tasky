async function inspectTreasury() {
  const addr = '0:1e84166ab32e9c0464a6567daaaae3b96f8e1c9264e78664fd2b42ca71fb3280';
  const accRes = await fetch('https://tonapi.io/v2/accounts/' + addr);
  const acc = await accRes.json();
  console.log('Account Info:');
  console.log('Raw Address:    ', acc.address);
  console.log('TON Balance:    ', (acc.balance / 1e9).toFixed(4) + ' TON');
  console.log('Status:         ', acc.status);

  const txRes = await fetch('https://tonapi.io/v2/blockchain/accounts/' + addr + '/transactions?limit=40');
  const txData = await txRes.json();
  console.log('\n--- LAST 40 ON-CHAIN TRANSACTIONS FROM TREASURY ---');
  let totalOut = 0;
  let totalIn = 0;
  for (const tx of (txData.transactions || [])) {
    const time = new Date(tx.utime * 1000).toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    if (tx.in_msg && tx.in_msg.value > 0) {
      const v = tx.in_msg.value / 1e9;
      totalIn += v;
      console.log(`[${time}] 📥 INCOMING: +${v.toFixed(4)} TON from ${tx.in_msg.source?.address || 'Deposit'}`);
    }
    for (const out of (tx.out_msgs || [])) {
      const v = out.value / 1e9;
      totalOut += v;
      const comment = out.decoded_body?.text || '';
      console.log(`[${time}] 📤 OUTGOING: -${v.toFixed(4)} TON to ${out.destination?.address} | "${comment}" | Hash: ${tx.hash}`);
    }
  }
  console.log(`\nSummary: Total Incoming: +${totalIn.toFixed(4)} TON | Total Outgoing: -${totalOut.toFixed(4)} TON`);
}

inspectTreasury();
