const { TonClient, WalletContractV4, internal, toNano, fromNano, Address } = require('@ton/ton');
const { mnemonicToWalletKey } = require('@ton/crypto');

const mnemonicStr = 'monitor attack mansion snake relief visual direct tornado noodle empty submit base behind camp trial happy quick hen memory weapon quit month steak soap';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function withRetry(fn, maxRetries = 5, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.response?.status === 429 || err.message?.includes('429') || err.message?.includes('Ratelimit')) {
        console.log(`Rate limit encountered (attempt ${i + 1}/${maxRetries}). Waiting ${delayMs * (i + 1)}ms...`);
        await sleep(delayMs * (i + 1));
      } else {
        throw err;
      }
    }
  }
  return await fn();
}

async function testSend() {
  const mnemonic = mnemonicStr.trim().split(' ');
  const key = await mnemonicToWalletKey(mnemonic);
  
  const client = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC'
  });

  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
  const contract = client.open(wallet);
  
  console.log('1. Checking balance...');
  const balance = await withRetry(() => contract.getBalance());
  console.log('Balance:', fromNano(balance), 'TON');
  await sleep(1500);

  console.log('2. Fetching seqno...');
  const seqno = await withRetry(() => contract.getSeqno());
  console.log('Current seqno:', seqno);
  await sleep(1500);

  const toAddress = Address.parse('UQAze-LczD7xz4WKAh5AtBXbR7wkbzdUp1ndKz58-b2KCPqR');
  console.log('3. Sending 0.02 TON to:', toAddress.toString());

  await withRetry(() => contract.sendTransfer({
    secretKey: key.secretKey,
    seqno: seqno,
    messages: [
      internal({
        to: toAddress,
        value: toNano('0.02'),
        bounce: false,
        body: 'TASKY Daily Gram Payout',
      }),
    ],
  }));
  console.log('Transfer broadcasted successfully!');

  // Poll for seqno update
  let confirmed = false;
  for (let i = 0; i < 8; i++) {
    await sleep(4000);
    try {
      const curSeq = await contract.getSeqno();
      console.log(`Poll seqno (${i + 1}): ${curSeq}`);
      if (curSeq > seqno) {
        confirmed = true;
        console.log('🎉 CONFIRMED on TON blockchain! New seqno:', curSeq);
        break;
      }
    } catch (e) {
      console.log('Poll retry notice:', e.message);
    }
  }

  process.exit(0);
}
testSend();
