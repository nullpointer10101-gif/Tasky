require('dotenv').config({ path: __dirname + '/.env' });
const { TonClient, WalletContractV4, fromNano } = require('@ton/ton');
const { mnemonicToWalletKey } = require('@ton/crypto');
const { pool } = require('./db');

async function auditWallet() {
  try {
    const mnemonic = process.env.TREASURY_MNEMONIC || '';
    if (!mnemonic) {
      console.error('No TREASURY_MNEMONIC in env!');
      return;
    }

    const key = await mnemonicToWalletKey(mnemonic.trim().split(/\s+/));
    const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
    const treasuryAddress = wallet.address.toString({ bounceable: false });
    const rawAddress = wallet.address.toRawString();

    console.log('====================================');
    console.log('TREASURY WALLET AUDIT');
    console.log('Friendly Address:', treasuryAddress);
    console.log('Raw Address:     ', rawAddress);
    console.log('====================================');

    // 1. Fetch balance via TonCenter
    const client = new TonClient({
      endpoint: 'https://toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TONCENTER_API_KEY || undefined
    });

    const balanceNano = await client.getBalance(wallet.address);
    const tonBalance = fromNano(balanceNano);
    console.log(`\n💰 On-Chain TON Balance: ${tonBalance} TON (${balanceNano.toString()} nano)`);

    // 2. Fetch TonAPI account details and Jettons (GRAM, etc.)
    try {
      const tonApiRes = await fetch(`https://tonapi.io/v2/accounts/${treasuryAddress}/jettons`);
      if (tonApiRes.ok) {
        const jettonsData = await tonApiRes.json();
        console.log('\n💎 Jettons in Treasury:');
        if (jettonsData.balances && jettonsData.balances.length > 0) {
          for (const j of jettonsData.balances) {
            const sym = j.jetton?.symbol || j.jetton?.name || 'Unknown';
            const decimals = j.jetton?.decimals || 9;
            const bal = (parseFloat(j.balance) / Math.pow(10, decimals)).toFixed(4);
            console.log(`- ${sym}: ${bal} (Raw: ${j.balance})`);
          }
        } else {
          console.log('No jettons found in this wallet.');
        }
      }
    } catch (e) {
      console.log('TonAPI jettons check error:', e.message);
    }

    // 3. Fetch recent on-chain transactions via TonAPI
    console.log('\n📜 Recent On-Chain Transactions:');
    try {
      const txRes = await fetch(`https://tonapi.io/v2/blockchain/accounts/${treasuryAddress}/transactions?limit=20`);
      if (txRes.ok) {
        const txData = await txRes.json();
        const txs = txData.transactions || [];
        console.log(`Found ${txs.length} recent transactions:`);
        for (const tx of txs) {
          const date = new Date(tx.utime * 1000).toISOString();
          const inMsg = tx.in_msg;
          const outMsgs = tx.out_msgs || [];
          const totalFee = tx.total_fees ? (tx.total_fees / 1e9).toFixed(5) : '0';
          
          if (inMsg && inMsg.value > 0) {
            const src = inMsg.source?.address ? inMsg.source.address : 'External/Deposit';
            const val = (inMsg.value / 1e9).toFixed(4);
            console.log(`[${date}] 📥 INCOMING: +${val} TON from ${src} | Fee: ${totalFee} TON`);
          }

          for (const out of outMsgs) {
            const dst = out.destination?.address ? out.destination.address : 'Unknown';
            const val = (out.value / 1e9).toFixed(4);
            const comment = out.decoded_body?.text || out.message || '';
            console.log(`[${date}] 📤 OUTGOING: -${val} TON to ${dst} | Comment: "${comment}" | Hash: ${tx.hash?.substring(0, 16)}...`);
          }
        }
      }
    } catch (e) {
      console.log('TonAPI tx check error:', e.message);
    }

    // 4. DB Payout records audit
    console.log('\n📊 Database Gram Claims Paid:');
    const dbClaims = await pool.query(`
      SELECT id, telegram_id, gram_wallet_address, amount, status, tx_hash, requested_at, processed_at
      FROM gram_claims
      WHERE status = 'approved'
      ORDER BY processed_at DESC NULLS LAST
      LIMIT 15
    `);
    console.table(dbClaims.rows);

    const dbWithdrawals = await pool.query(`
      SELECT id, telegram_id, wallet_address, amount, status, tx_hash, requested_at, processed_at
      FROM gram_withdrawals
      WHERE status = 'approved'
      ORDER BY processed_at DESC NULLS LAST
      LIMIT 15
    `);
    console.log('\n📊 Database Gram Withdrawals Paid:');
    console.table(dbWithdrawals.rows);

  } catch (err) {
    console.error('Audit error:', err);
  } finally {
    pool.end();
  }
}

auditWallet();
