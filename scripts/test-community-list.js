// scripts/test-community-list.js
// A script to test the logic of fetching and processing the community list.
// This can be run with `node scripts/test-community-list.js`

console.log('--- Starting Community List Test ---');

// --- Mock Data ---

// Simulate Discord members fetched from /api/discord/members
const mockDiscordMembers = [
    { id: '1', username: 'LiveUser', avatar: 'avatar1' },
    { id: '2', username: 'liveuser', avatar: 'avatar2' }, // Case-variant duplicate
    { id: '3', username: 'OfflineUser', avatar: 'avatar3' },
    { id: '4', username: 'User With Spaces', avatar: 'avatar4' },
    { id: '5', username: 'user.with.dots', avatar: 'avatar5' },
    { id: '6', username: 'Bot_NoTwitch', avatar: 'avatar6' }, // Will not be found on Twitch
    { id: '7', username: 'AnotherLive_User', avatar: 'avatar7'},
    { id: '8', username: 'short', avatar: 'avatar8' }, // should be valid
];

console.log(`[Test] Initial mock Discord members: ${mockDiscordMembers.length}`);

// Simulate Twitch API user data (from /helix/users)
const mockTwitchUsers = {
    'liveuser': { id: '101', login: 'LiveUser', display_name: 'LiveUser', profile_image_url: 'twitch_avatar1' },
    'offlineuser': { id: '102', login: 'OfflineUser', display_name: 'OfflineUser', profile_image_url: 'twitch_avatar2' },
    'userwithspaces': { id: '103', login: 'UserWithSpaces', display_name: 'UserWithSpaces', profile_image_url: 'twitch_avatar3' },
    'userwithdots': { id: '104', login: 'userwithdots', display_name: 'userwithdots', profile_image_url: 'twitch_avatar4' },
    'anotherlive_user': {id: '105', login: 'AnotherLive_User', display_name: 'AnotherLive_User', profile_image_url: 'twitch_avatar5'},
    'short': {id: '106', login: 'short', display_name: 'short', profile_image_url: 'twitch_avatar6'}
};

// Simulate Twitch API stream data (from /helix/streams)
const mockLiveStreams = [
    { user_id: '101', user_login: 'LiveUser' }, // LiveUser is live
    { user_id: '105', user_login: 'AnotherLive_User' }, // AnotherLive_User is live
];


// --- Logic Simulation ---

/**
 * (From community-list.tsx)
 * Sanitizes a Discord username to make it a valid potential Twitch username.
 * @param {string} name
 * @returns {string}
 */
const sanitizeTwitchUsername = (name) => {
    // Twitch usernames can only contain alphanumeric characters and underscores.
    return name.replace(/[^a-zA-Z0-9_]/g, '');
};

/**
 * (From community-list.tsx - MODIFIED)
 * This is the logic we want to fix. The original de-duplicated, this one does not.
 */
const createMemberMap = (members) => {
    const memberMap = new Map();
    members.forEach(member => {
        if (member.username) {
            const sanitizedName = sanitizeTwitchUsername(member.username);
            if (sanitizedName.length >= 3) {
                // We store the original member object, keyed by the sanitized name
                // We don't use toLowerCase() to allow for case-variant lookups
                if (!memberMap.has(sanitizedName)) {
                     memberMap.set(sanitizedName, member);
                }
            }
        }
    });
    return memberMap;
};


/**
 * (Simulates /api/twitch/live - MODIFIED)
 * Mocks the batching calls to the Twitch API.
 * @param {string[]} usernames
 */
const mockFetchTwitchData = async (usernames) => {
    console.log(`\n[Mock API] Received ${usernames.length} usernames to look up.`);
    
    const allFoundUsers = [];
    const liveUserIds = new Set(mockLiveStreams.map(s => s.user_id));
    const liveStreamsFound = [];

    // Simulate batching
    const BATCH_SIZE = 100;
    for (let i = 0; i < usernames.length; i += BATCH_SIZE) {
        const batch = usernames.slice(i, i + BATCH_SIZE);
        console.log(`[Mock API] Processing batch ${i / BATCH_SIZE + 1} with ${batch.length} users.`);
        
        // Mock /helix/users call
        const usersInBatch = batch.map(name => mockTwitchUsers[name.toLowerCase()]).filter(Boolean);
        allFoundUsers.push(...usersInBatch);
        
        // Mock /helix/streams call
        const userIdsInBatch = usersInBatch.map(u => u.id);
        const liveInBatch = mockLiveStreams.filter(s => userIdsInBatch.includes(s.user_id));
        liveStreamsFound.push(...liveInBatch);
    }
    
    console.log(`[Mock API] Total found Twitch users: ${allFoundUsers.length}`);
    console.log(`[Mock API] Total live streams found: ${liveStreamsFound.length}`);

    return { allUsers: allFoundUsers, liveUsers: liveStreamsFound };
};

/**
 * (Simulates the final processing in community-list.tsx)
 */
const processCommunityList = (discordMembers, twitchData) => {
    const { allUsers, liveUsers } = twitchData;
    const liveUserLogins = new Set(liveUsers.map(u => u.user_login.toLowerCase()));

    // Create a map of found Twitch users by their lowercase login for easy lookup
    const twitchUserMap = new Map();
    allUsers.forEach(u => twitchUserMap.set(u.login.toLowerCase(), u));

    const finalCommunityMembers = discordMembers.map(member => {
        const sanitizedName = sanitizeTwitchUsername(member.username);
        const twitchUser = twitchUserMap.get(sanitizedName.toLowerCase());
        const isLive = twitchUser ? liveUserLogins.has(twitchUser.login.toLowerCase()) : false;

        if (twitchUser) {
            // A matching user was found on Twitch
            return {
                id: member.id, // Keep original Discord ID
                username: twitchUser.display_name, // Use correctly cased name from Twitch
                avatar: twitchUser.profile_image_url,
                isActive: isLive,
                source: 'Twitch',
            };
        } else {
            // No user found on Twitch, use Discord data
            return {
                id: member.id,
                username: member.username,
                avatar: member.avatar,
                isActive: false,
                source: 'Discord',
            };
        }
    });

    // De-duplicate the final list based on Twitch username, preferring live users
    const uniqueUsers = new Map();
    finalCommunityMembers.forEach(user => {
        const key = user.username.toLowerCase();
        const existing = uniqueUsers.get(key);
        if (!existing || (!existing.isActive && user.isActive)) {
            uniqueUsers.set(key, user);
        }
    });

    return Array.from(uniqueUsers.values());
};


// --- Main Test Execution ---

async function runTest() {
    // 1. Sanitize and prepare usernames from Discord list (the "fixed" way)
    const memberMap = createMemberMap(mockDiscordMembers);
    const usernamesToQuery = Array.from(memberMap.keys());
    console.log(`\n[Step 1] Sanitized and de-duplicated Discord names. Usernames to query: ${usernamesToQuery.length}`);
    console.log(usernamesToQuery);


    // 2. Fetch data from our mock Twitch API
    console.log(`\n[Step 2] Fetching data from mock Twitch API...`);
    const twitchData = await mockFetchTwitchData(usernamesToQuery);


    // 3. Process and merge the lists
    console.log(`\n[Step 3] Merging Discord and Twitch data...`);
    const finalUsers = processCommunityList(mockDiscordMembers, twitchData);


    // 4. Assertions
    console.log(`\n[Step 4] --- Test Results ---`);
    console.log(`Final user count: ${finalUsers.length}`);
    console.log(finalUsers);

    const liveUsers = finalUsers.filter(u => u.isActive);
    const offlineUsers = finalUsers.filter(u => !u.isActive);

    console.log(`\nLive Users (${liveUsers.length}):`);
    console.log(liveUsers.map(u => u.username));
    
    console.log(`\nOffline Users (${offlineUsers.length}):`);
    console.log(offlineUsers.map(u => u.username));

    // Check assertions
    let success = true;

    if (finalUsers.length !== 6) {
        console.error(`\n[FAIL] Expected 6 final users, but got ${finalUsers.length}. The list should contain one entry for each unique person.`);
        success = false;
    }

    if (liveUsers.length !== 2) {
        console.error(`\n[FAIL] Expected 2 live users, but got ${liveUsers.length}.`);
        success = false;
    }

    if (!liveUsers.some(u => u.username === 'LiveUser')) {
        console.error(`\n[FAIL] 'LiveUser' should be in the live list.`);
        success = false;
    }
    
     if (!liveUsers.some(u => u.username === 'AnotherLive_User')) {
        console.error(`\n[FAIL] 'AnotherLive_User' should be in the live list.`);
        success = false;
    }

    if (!offlineUsers.some(u => u.username === 'OfflineUser')) {
        console.error(`\n[FAIL] 'OfflineUser' should be in the offline list.`);
        success = false;
    }

    if (!finalUsers.some(u => u.username === 'UserWithSpaces' && u.source === 'Twitch')) {
         console.error(`\n[FAIL] 'User With Spaces' should have been found on Twitch as 'UserWithSpaces'.`);
         success = false;
    }
    
    if (!finalUsers.some(u => u.username === 'user.with.dots' && u.source === 'Twitch')) {
         console.error(`\n[FAIL] 'user.with.dots' should have been found on Twitch as 'userwithdots'.`);
         success = false;
    }
    
    if (!finalUsers.some(u => u.username === 'Bot_NoTwitch' && u.source === 'Discord')) {
        console.error(`\n[FAIL] 'Bot_NoTwitch' should be in the final list with its Discord data.`);
        success = false;
    }

    if (success) {
        console.log('\n✅ --- All Assertions Passed! ---');
    } else {
        console.error('\n❌ --- Test Failed ---');
    }
    
    return success;
}

runTest();
