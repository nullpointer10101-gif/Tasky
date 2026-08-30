const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

async function twitterApiCall(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${BEARER_TOKEN}`
            }
        });

        if (response.status === 429) {
            return { error: 'Rate limit exceeded', fallback: true };
        }

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            return { error: `Twitter API returned status ${response.status}: ${JSON.stringify(errBody)}`, fallback: true };
        }

        const data = await response.json();
        return { data };
    } catch (e) {
        return { error: e.message, fallback: true };
    }
}

async function getUserIdByUsername(username) {
    const cleanUsername = username.replace(/^@/, '').trim();
    const result = await twitterApiCall(`https://api.twitter.com/2/users/by/username/${cleanUsername}`);
    if (result.fallback) return result;
    if (!result.data || !result.data.data) {
        return { error: `Twitter user @${cleanUsername} not found`, fallback: false };
    }
    return { id: result.data.data.id };
}

function parseXUsername(url) {
    if (!url) return null;
    const match = url.match(/(?:x|twitter)\.com\/([a-zA-Z0-9_]{1,15})/i);
    // Ignore status part of URL if it exists
    if (match && match[1] && match[1].toLowerCase() !== 'status') {
        return match[1];
    }
    return null;
}

function parseTweetId(url) {
    if (!url) return null;
    const match = url.match(/(?:status|statuses)\/(\d+)/i);
    return match ? match[1] : null;
}

async function verifyFollow(username, actionUrl) {
    if (!BEARER_TOKEN) return { fallback: true, error: 'Twitter Bearer Token not configured' };

    const targetUsername = parseXUsername(actionUrl);
    if (!targetUsername) {
        return { error: 'Could not parse target Twitter username from task action URL', fallback: true };
    }

    // 1. Get user ID
    const userRes = await getUserIdByUsername(username);
    if (userRes.fallback) return userRes;
    if (userRes.error) return userRes;
    const userId = userRes.id;

    // 2. Get target ID
    const targetRes = await getUserIdByUsername(targetUsername);
    if (targetRes.fallback) return targetRes;
    if (targetRes.error) return targetRes;
    const targetId = targetRes.id;

    // 3. Get following list of user
    const followingResult = await twitterApiCall(`https://api.twitter.com/2/users/${userId}/following?max_results=1000`);
    if (followingResult.fallback) return followingResult;

    const followingList = followingResult.data?.data || [];
    const isFollowing = followingList.some(user => user.id === targetId);

    if (isFollowing) {
        return { verified: true };
    } else {
        return { verified: false, error: `We could not verify that @${username.replace(/^@/, '')} follows @${targetUsername}.` };
    }
}

async function verifyLike(username, actionUrl) {
    if (!BEARER_TOKEN) return { fallback: true, error: 'Twitter Bearer Token not configured' };

    const tweetId = parseTweetId(actionUrl);
    if (!tweetId) {
        return { error: 'Could not parse Tweet ID from task action URL', fallback: true };
    }

    // 1. Get user ID
    const userRes = await getUserIdByUsername(username);
    if (userRes.fallback) return userRes;
    if (userRes.error) return userRes;
    const userId = userRes.id;

    // 2. Get liking users of the tweet
    const likingResult = await twitterApiCall(`https://api.twitter.com/2/tweets/${tweetId}/liking_users?max_results=100`);
    if (likingResult.fallback) return likingResult;

    const likingList = likingResult.data?.data || [];
    const hasLiked = likingList.some(user => user.id === userId);

    if (hasLiked) {
        return { verified: true };
    } else {
        return { verified: false, error: `We could not verify that @${username.replace(/^@/, '')} liked the tweet.` };
    }
}

async function verifyRetweet(username, actionUrl) {
    if (!BEARER_TOKEN) return { fallback: true, error: 'Twitter Bearer Token not configured' };

    const tweetId = parseTweetId(actionUrl);
    if (!tweetId) {
        return { error: 'Could not parse Tweet ID from task action URL', fallback: true };
    }

    // 1. Get user ID
    const userRes = await getUserIdByUsername(username);
    if (userRes.fallback) return userRes;
    if (userRes.error) return userRes;
    const userId = userRes.id;

    // 2. Get users who retweeted
    const retweetResult = await twitterApiCall(`https://api.twitter.com/2/tweets/${tweetId}/retweeted_by?max_results=100`);
    if (retweetResult.fallback) return retweetResult;

    const retweetList = retweetResult.data?.data || [];
    const hasRetweeted = retweetList.some(user => user.id === userId);

    if (hasRetweeted) {
        return { verified: true };
    } else {
        return { verified: false, error: `We could not verify that @${username.replace(/^@/, '')} retweeted/reposted the tweet.` };
    }
}

module.exports = {
    verifyFollow,
    verifyLike,
    verifyRetweet
};
