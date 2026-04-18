// ============================================================
// MyJournal — Apps Script API Service
// All communication with the Google Apps Script backend goes
// through this file. Set your deployment URL below.
// ============================================================

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyuJ4EeUZzbQEI738wSIEUd8ghJ_EvC2pDskyR9MAzaYtxy8A3nHJjySshLQRTWEj8b/exec';

async function _call(action, params = {}) {
    console.log(`[API Request] ${action}`, params);
    const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // Apps Script CORS requires text/plain for simple requests
        body: JSON.stringify({ action, params }),
        redirect: 'follow',
    });
    const json = await res.json();
    console.log(`[API Response] ${action}`, json);
    if (!json.success) throw new Error(json.error || 'API error');
    return json.data;
}

// ─── Initialization ──────────────────────────────────────────
export const initializeApp = () => _call('initializeApp');

// ─── Journal ─────────────────────────────────────────────────
export const getEntries = (params) => _call('getEntries', params);
export const getEntryById = (entry_id) => _call('getEntryById', { entry_id });
export const createEntry = (params) => _call('createEntry', params);
export const updateEntry = (params) => _call('updateEntry', params);
export const deleteEntry = (entry_id) => _call('deleteEntry', { entry_id });

// ─── Todos ───────────────────────────────────────────────────
export const getTodos = (params) => _call('getTodos', params);
export const createTodo = (params) => _call('createTodo', params);
export const updateTodo = (params) => _call('updateTodo', params);
export const completeTodo = (params) => _call('completeTodo', params);
export const rolloverTodos = () => _call('rolloverTodos');
export const snoozeTodo = (params) => _call('snoozeTodo', params);

// ─── Insights ────────────────────────────────────────────────
export const getInsights = (params) => _call('getInsights', params);
export const createInsight = (params) => _call('createInsight', params);
export const updateInsight = (params) => _call('updateInsight', params);
export const linkInsightToTodo = (params) => _call('linkInsightToTodo', params);

// ─── Habits ──────────────────────────────────────────────────
export const getHabits = (params) => _call('getHabits', params);
export const createHabit = (params) => _call('createHabit', params);
export const updateHabit = (params) => _call('updateHabit', params);
export const archiveHabit = (habit_id) => _call('archiveHabit', { habit_id });
export const logHabit = (params) => _call('logHabit', params);
export const getHabitLogs = (params) => _call('getHabitLogs', params);
export const calculateStreaks = () => _call('calculateStreaks');

// ─── Media ───────────────────────────────────────────────────
export const uploadMedia = (params) => _call('uploadMedia', params);
export const getMediaById = (media_id) => _call('getMediaById', { media_id });
export const getThumbnailBase64 = (media_id) => _call('getMediaThumbnailBase64', { media_id });
export const getMediaBySource = (source_id) => _call('getMediaBySource', { source_id });
export const getAllMedia = (params) => _call('getAllMedia', params);
export const updateMediaRefs = (params) => _call('updateMediaRefs', params);
export const deleteMedia = (media_id) => _call('deleteMedia', { media_id });
export const scanOrphans = () => _call('scanOrphans');

// ─── Dashboard ───────────────────────────────────────────────
export const getDashboardStats = () => _call('getDashboardStats');
export const updateConfig = (params) => _call('updateConfig', params);
export const recalculateStats = () => _call('recalculateStats');

// ─── Saved Videos & Sync ──────────────────────────────────────
export const getSavedVideos = () => _call('getSavedVideos');
export const saveVideo = (params) => _call('saveVideo', params);
export const getYTChannels = () => _call('getYTChannels');
export const saveYTChannel = (params) => _call('saveYTChannel', params);
export const removeYTChannel = (id) => _call('removeYTChannel', { id });
export const getYTDismissed = () => _call('getYTDismissed');
export const saveYTDismissed = (video_id) => _call('saveYTDismissed', { video_id });
export const getYTLiked = () => _call('getYTLiked');
export const toggleYTLiked = (params) => _call('toggleYTLiked', params);
export const getTwitchLiked = () => _call('getTwitchLiked');
export const toggleTwitchLiked = (params) => _call('toggleTwitchLiked', params);


// ─── Vault ──────────────────────────────────────────────────
// Raw call — returns full response (used for vault endpoints that don't wrap in {success, data})
async function _rawCall(action, params = {}) {
    const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, params }),
        redirect: 'follow',
    });
    return res.json();
}

export const getVaultMedia = (folderId, continuationToken) => _rawCall('getVaultMedia', { folderId, continuationToken });
export const getVaultFolders = () => _rawCall('getVaultFolders');
export const addVaultFolder = (name, folderId) => _rawCall('addVaultFolder', { name, folderId });
export const removeVaultFolder = (id) => _rawCall('removeVaultFolder', { id });
export const getLikedImages = () => _rawCall('getLikedImages');
export const toggleLikedImage = (params) => _rawCall('toggleLikedImage', params);
export const getFaceGroups = (folderId) => _rawCall('getFaceGroups', { folderId });
export const saveFaceGroups = (folderId, groups) => _rawCall('saveFaceGroups', { folderId, groups });
export const getFileTextContent = (fileId) => _call('getFileTextContent', { fileId });


// ─── App Passwords ───────────────────────────────────────────
export const getAppPassword = (id) => _call('getAppPassword', { id });
export const setAppPassword = (id, label, hash) => _call('setAppPassword', { id, label, hash });
export const initAppPasswords = () => _call('initAppPasswords');

// ─── Life Map ───────────────────────────────────────────────
export const getLifeMap = () => _call('getLifeMap');
export const saveLifeMap = (params) => _call('saveLifeMap', params);
export const deleteLifeMap = (id) => _call('deleteLifeMap', { id });

// ─── Time Capsules ──────────────────────────────────────────
export const getTimeCapsules = () => _call('getTimeCapsules');
export const saveTimeCapsule = (params) => _call('saveTimeCapsule', params);
export const deleteTimeCapsule = (id) => _call('deleteTimeCapsule', { id });

// ─── Who Am I ───────────────────────────────────────────────
export const getWhoAmI = () => _call('getWhoAmI');
export const saveWhoAmI = (params) => _call('saveWhoAmI', params);

// ─── Thought Dump ───────────────────────────────────────────
export const getThoughts = (params) => _call('getThoughts', params);
export const saveThought = (params) => _call('saveThought', params);
export const deleteThought = (id) => _call('deleteThought', { id });

// ─── Streaks ────────────────────────────────────────────────
export const getStreaks = () => _call('getStreaks');
export const saveStreak = (params) => _call('saveStreak', params);
export const deleteStreak = (id) => _call('deleteStreak', { id });
export const logStreak = (streak_id, date) => _call('logStreak', { streak_id, date });
export const getStreakLogs = (streak_id) => _call('getStreakLogs', { streak_id });

// ─── Reading List ───────────────────────────────────────────
export const getReadingList = () => _call('getReadingList');
export const saveReadingList = (params) => _call('saveReadingItem', params);
export const saveReadingItem = saveReadingList;
export const deleteReadingItem = (id) => _call('deleteReadingItem', { id });

// ─── Watchlist ──────────────────────────────────────────────
export const getWatchlist = () => _call('getWatchlist');
export const saveWatchlist = (params) => _call('saveWatchItem', params);
export const saveWatchItem = saveWatchlist;
export const deleteWatchItem = (id) => _call('deleteWatchItem', { id });

// ─── Finance ────────────────────────────────────────────────
export const getFinance = (params) => _call('getFinance', params);
export const saveFinance = (params) => _call('saveFinanceItem', params);
export const saveFinanceItem = saveFinance;
export const deleteFinanceItem = (id) => _call('deleteFinanceItem', { id });

// ─── Bookmarks ──────────────────────────────────────────────
export const getBookmarks = () => _call('getBookmarks');
export const saveBookmark = (params) => _call('saveBookmark', params);
export const deleteBookmark = (id) => _call('deleteBookmark', { id });

// ─── Writing ────────────────────────────────────────────────
export const getWritings = () => _call('getWritings');
export const saveWriting = (params) => _call('saveWriting', params);
export const deleteWriting = (id) => _call('deleteWriting', { id });

// ─── Yearly Reviews ─────────────────────────────────────────
export const getYearlyReviews = () => _call('getYearlyReviews');
export const saveYearlyReview = (params) => _call('saveYearlyReview', params);

// ─── Twitch ─────────────────────────────────────────────────
export const getTwitchChannels = () => _call('getTwitchChannels');
export const saveTwitchChannel = (params) => _call('saveTwitchChannel', params);
export const removeTwitchChannel = (id) => _call('removeTwitchChannel', { id });
export const getTwitchData = (params) => _call('getTwitchData', params);
export const searchTwitchChannel = (query) => _call('searchTwitchChannel', { query });
export const getSavedTwitchVideos = () => _call('getSavedTwitchVideos');
export const saveTwitchVideo = (params) => _call('saveTwitchVideo', params);
export const removeSavedTwitchVideo = (video_id) => _call('removeSavedTwitchVideo', { video_id });
export const saveTwitchDismissed = (item_id) => _call('saveTwitchDismissed', { item_id });

// ─── Delegation ──────────────────────────────────────────────
export const getDelegation = () => _call('getDelegation');
export const saveDelegationItem = (params) => _call('saveDelegationItem', params);
export const deleteDelegationItem = (id) => _call('deleteDelegationItem', { id });
export const updateDelegationRank = (id, rank) => _call('updateDelegationRank', { id, rank });

// ─── Notifications ───────────────────────────────────────────
export const getNotifications = () => _call('getNotifications');
export const saveNotification = (params) => _call('saveNotification', params);
export const deleteNotification = (id) => _call('deleteNotification', { id });
export const checkNewContent = (lastCheck) => _call('checkNewContent', { lastCheck });



// ─── Helper: file → base64 ───────────────────────────────────
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // result is "data:mime/type;base64,XXXXX" – strip prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ─── Helper: Local Date Utilities ───────────────────────────
export function getLocalDate(date = new Date()) {
    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

export function sanitizeDate(dateVal) {
    if (!dateVal) return getLocalDate();

    // Robustly handle Date objects or valid date strings
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Fallback: If it's a string, try a simple regex match for YYYY-MM-DD
    const match = String(dateVal).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) return match[0];

    return getLocalDate();
}

export const todayStr = () => getLocalDate();
