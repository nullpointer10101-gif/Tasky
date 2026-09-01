const bot = require('./bot');
const { pool } = require('./db');

async function test() {
  // Let's test with real user ID who has not joined @TaskyPayouts: e.g. 5883782064
  const testId = 5883782064;

  const checkMembership = async (handle) => {
    try {
      if (bot && bot.getChatMember) {
        const member = await bot.getChatMember(handle, testId);
        console.log(`[Test] ${handle}: status = "${member.status}"`);
        return ['member', 'administrator', 'creator'].includes(member.status);
      }
      return false;
    } catch (e) {
      console.log(`[Test] ${handle} error:`, e.message);
      return false;
    }
  };

  console.log('--- Checking 4 channels for user ID', testId, '---');
  const [joinedChannel, joinedPayouts, joinedAlphaDrop, joinedCommunity] = await Promise.all([
    checkMembership('@Tasky_Official'),
    checkMembership('@TaskyPayouts'),
    checkMembership('@AlphaDropDaily'),
    checkMembership('@TaskyOfficialCommunity')
  ]);

  const allJoined = joinedChannel && joinedPayouts && joinedAlphaDrop && joinedCommunity;
  console.log('Results:', {
    tasky_official: joinedChannel,
    tasky_payouts: joinedPayouts,
    alphadrop: joinedAlphaDrop,
    community: joinedCommunity,
    all_joined: allJoined
  });

  process.exit(0);
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
