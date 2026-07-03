// In Node 18+ we can just use global fetch.

/**
 * Fetches the TASKY Jetton balance for a given TON wallet address.
 * Uses toncenter.com public API (v3).
 * @param {string} walletAddress - The user's TON wallet address
 * @returns {Promise<number>} - The balance of TASKY in the wallet, or 0 on error
 */
async function getWalletTaskyBalance(walletAddress) {
  const taskyAddress = process.env.TASKY_JETTON_ADDRESS;

  // If token address is not set, return a mock balance for development
  if (!taskyAddress) {
    console.log(`[tonBalance] TASKY_JETTON_ADDRESS not set. Returning mock balance for ${walletAddress}`);
    // Mock balance between 0 and 20000
    return Math.floor(Math.random() * 20000);
  }

  try {
    // Call Toncenter V3 API for Jetton wallets
    const url = `https://toncenter.com/api/v3/jetton/wallets?owner_address=${encodeURIComponent(walletAddress)}&jetton_address=${encodeURIComponent(taskyAddress)}`;
    
    // In Node 18, global fetch is available. Node-fetch isn't strictly necessary if Node >= 18.
    // The backend seems to use global fetch in bot.js.
    const response = await global.fetch(url);
    
    if (!response.ok) {
      console.error(`[tonBalance] Error fetching from toncenter: ${response.status} ${response.statusText}`);
      return 0;
    }
    
    const data = await response.json();
    
    if (data && data.jetton_wallets && data.jetton_wallets.length > 0) {
      const balanceStr = data.jetton_wallets[0].balance;
      // Assuming TASKY has 9 decimals like TON:
      const decimals = process.env.TASKY_JETTON_DECIMALS ? parseInt(process.env.TASKY_JETTON_DECIMALS) : 9;
      const balance = Number(balanceStr) / (10 ** decimals);
      return balance;
    } else {
      // Wallet has no jetton wallet for this token (balance is 0)
      return 0;
    }
  } catch (error) {
    console.error(`[tonBalance] Exception querying balance for ${walletAddress}:`, error.message);
    return 0;
  }
}

module.exports = { getWalletTaskyBalance };
