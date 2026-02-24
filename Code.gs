// ============================================================
// MyJournal App — Google Apps Script Backend
// Architecture Version 1.0
// Deploy as Web App:  Execute as "Me" | Access "Anyone"
// ============================================================

// ── CHANGE THIS TO YOUR SPREADSHEET ID ──────────────────────
var SPREADSHEET_ID = '1F5Q-RfavZpJzTKBJ9NyJHLUFOWoAjvHU7WszJXLzDQI';
// ────────────────────────────────────────────────────────────

// Sheet name constants
var S = {
  JOURNAL:       'JOURNAL_ENTRIES',
  TODOS:         'TODOS',
  INSIGHTS:      'ACTIONABLE_INSIGHTS',
  HABITS:        'HABITS',
  HABIT_LOGS:    'HABIT_LOGS',
  MEDIA:         'MEDIA_LIBRARY',
  CONFIG:        'DASHBOARD_CONFIG',
  TAGS:          'TAGS_MASTER',
  VAULT_FOLDERS: 'VAULT_FOLDERS',
  VAULT_LIKED:   'VAULT_LIKED',
  VAULT_FACES:   'VAULT_FACES',
  PASSWORDS:     'APP_PASSWORDS',
  LIFE_MAP:      'LIFE_MAP',
  TIME_CAPSULES: 'TIME_CAPSULES',
  WHO_AM_I:      'WHO_AM_I',
  THOUGHT_DUMP:  'THOUGHT_DUMP',
  STREAKS:       'STREAKS',
  STREAK_LOGS:   'STREAK_LOGS',
  READING_LIST:  'READING_LIST',
  WATCHLIST:     'WATCHLIST',
  FINANCE:       'FINANCE',
  BOOKMARKS:     'BOOKMARKS',
  WRITING:       'WRITING',
  YEARLY_REVIEWS: 'YEARLY_REVIEWS',
  TWITCH_CHANNELS: 'TWITCH_CHANNELS',
  TWITCH_DISMISSED: 'TWITCH_DISMISSED',
  TWITCH_CONFIG: 'TWITCH_CONFIG',
  SAVED_TWITCH_VIDEOS: 'SAVED_TWITCH_VIDEOS',
  LOGS: 'LOGS'
};

// Drive root folder name
var DRIVE_ROOT = 'MyJournal App';
var DRIVE_SUBFOLDERS = [
  'Journal Images',
  'Journal Audio',
  'Journal Files',
  'Todo Media',
  'Insight Media',
  'Thumbnails'
];

// ── CORS HEADERS ─────────────────────────────────────────────
function _corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function _jsonResponse(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── ENTRY POINTS ─────────────────────────────────────────────
function doGet(e) {
  // Handle CORS preflight and simple GET pings
  return _jsonResponse({ status: 'ok', message: 'MyJournal API running' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var params = body.params || {};

    var result;
    switch (action) {
      // ── Initialization ──
      case 'initializeApp':       result = initializeApp();            break;

      // ── Journal ──
      case 'getEntries':          result = getEntries(params);         break;
      case 'getEntryById':        result = getEntryById(params);       break;
      case 'createEntry':         result = createEntry(params);        break;
      case 'updateEntry':         result = updateEntry(params);        break;
      case 'deleteEntry':         result = deleteEntry(params);        break;

      // ── Todos ──
      case 'getTodos':            result = getTodos(params);           break;
      case 'createTodo':          result = createTodo(params);         break;
      case 'updateTodo':          result = updateTodo(params);         break;
      case 'completeTodo':        result = completeTodo(params);       break;
      case 'rolloverTodos':       result = rolloverTodos();            break;
      case 'snoozeTodo':          result = snoozeTodo(params);         break;

      // ── Insights ──
      case 'getInsights':         result = getInsights(params);        break;
      case 'createInsight':       result = createInsight(params);      break;
      case 'updateInsight':       result = updateInsight(params);      break;
      case 'linkInsightToTodo':   result = linkInsightToTodo(params);  break;

      // ── Habits ──
      case 'getHabits':           result = getHabits(params);         break;
      case 'createHabit':         result = createHabit(params);       break;
      case 'updateHabit':         result = updateHabit(params);       break;
      case 'archiveHabit':        result = archiveHabit(params);      break;
      case 'logHabit':            result = logHabit(params);          break;
      case 'getHabitLogs':        result = getHabitLogs(params);      break;
      case 'calculateStreaks':    result = calculateStreaks();         break;

      // ── Media ──
      case 'uploadMedia':         result = uploadMedia(params);        break;
      case 'getMediaById':        result = getMediaById(params);       break;
      case 'getMediaBySource':    result = getMediaBySource(params);   break;
      case 'getAllMedia':          result = getAllMedia(params);        break;
      case 'updateMediaRefs':     result = updateMediaRefs(params);    break;
      case 'deleteMedia':         result = deleteMedia(params);        break;
      case 'scanOrphans':         result = scanOrphans();              break;

      // ── Dashboard ──
      case 'getDashboardStats':   result = getDashboardStats();        break;
      case 'updateConfig':        result = updateConfig(params);       break;
      case 'recalculateStats':    result = recalculateStats();         break;
        
        case 'getSavedVideos':  result = getSavedVideos();         break;
      case 'saveVideo':       result = saveVideo(params);        break;
      case 'getYTChannels':   result = getYTChannels();          break;
      case 'saveYTChannel':   result = saveYTChannel(params);    break;
      case 'removeYTChannel': result = removeYTChannel(params);  break;
      case 'getYTDismissed':  result = getYTDismissed();         break;
      case 'saveYTDismissed': result = saveYTDismissed(params);  break;
      
      case 'getVaultMedia':        result = getVaultMedia(params);         break;

      // ── Vault Folders & Liked ──
      case 'getVaultFolders':      result = getVaultFolders();              break;
      case 'addVaultFolder':       result = addVaultFolder(params);         break;
      case 'removeVaultFolder':    result = removeVaultFolder(params);      break;
      case 'getLikedImages':       result = getLikedImages();               break;
       case 'toggleLikedImage':     result = toggleLikedImage(params);       break;
       case 'getFaceGroups':        result = getFaceGroups(params);          break;
       case 'saveFaceGroups':       result = saveFaceGroups(params);         break;

      // ── App Passwords ──
      case 'getAppPassword':       result = getAppPassword(params);         break;
      case 'setAppPassword':       result = setAppPassword(params);         break;
      case 'initAppPasswords':     result = initAppPasswords();             break;

      // ── Life Map ──
      case 'getLifeMap':           result = getLifeMap();                   break;
      case 'saveLifeMap':          result = saveLifeMap(params);            break;
      case 'deleteLifeMap':        result = deleteLifeMap(params);          break;

      // ── Time Capsules ──
      case 'getTimeCapsules':      result = getTimeCapsules();              break;
      case 'saveTimeCapsule':      result = saveTimeCapsule(params);        break;
      case 'deleteTimeCapsule':    result = deleteTimeCapsule(params);      break;

      // ── Who Am I ──
      case 'getWhoAmI':            result = getWhoAmI();                    break;
      case 'saveWhoAmI':           result = saveWhoAmI(params);             break;

      // ── Thought Dump ──
      case 'getThoughts':          result = getThoughts(params);            break;
      case 'saveThought':          result = saveThought(params);            break;
      case 'deleteThought':        result = deleteThought(params);          break;

      // ── Streaks ──
      case 'getStreaks':           result = getStreaks();                   break;
      case 'saveStreak':           result = saveStreak(params);             break;
      case 'deleteStreak':         result = deleteStreak(params);           break;
      case 'logStreak':            result = logStreak(params);              break;
      case 'getStreakLogs':        result = getStreakLogs(params);          break;

      // ── Reading List ──
      case 'getReadingList':       result = getReadingList();               break;
      case 'saveReadingItem':      result = saveReadingItem(params);        break;
      case 'deleteReadingItem':    result = deleteReadingItem(params);      break;

      // ── Watchlist ──
      case 'getWatchlist':         result = getWatchlist();                 break;
      case 'saveWatchItem':        result = saveWatchItem(params);          break;
      case 'deleteWatchItem':      result = deleteWatchItem(params);        break;

      // ── Finance ──
      case 'getFinance':           result = getFinance(params);             break;
      case 'saveFinanceItem':      result = saveFinanceItem(params);        break;
      case 'deleteFinanceItem':    result = deleteFinanceItem(params);      break;

      // ── Bookmarks ──
      case 'getBookmarks':         result = getBookmarks();                 break;
      case 'saveBookmark':         result = saveBookmark(params);           break;
      case 'deleteBookmark':       result = deleteBookmark(params);         break;

      // ── Writing ──
      case 'getWritings':          result = getWritings();                  break;
      case 'saveWriting':          result = saveWriting(params);            break;
      case 'deleteWriting':        result = deleteWriting(params);          break;

      // ── Yearly Reviews ──
      case 'getYearlyReviews':     result = getYearlyReviews();             break;
      case 'saveYearlyReview':     result = saveYearlyReview(params);       break;

      // ── Twitch ──
      case 'getTwitchChannels':    result = getTwitchChannels();            break;
      case 'saveTwitchChannel':    result = saveTwitchChannel(params);      break;
      case 'removeTwitchChannel':  result = removeTwitchChannel(params);    break;
      case 'getTwitchData':        result = getTwitchData(params);          break;
      case 'searchTwitchChannel':  result = searchTwitchChannel(params);    break;
      case 'getSavedTwitchVideos': result = getSavedTwitchVideos();         break;
      case 'saveTwitchVideo':      result = saveTwitchVideo(params);        break;
      case 'saveTwitchDismissed':  result = saveTwitchDismissed(params);    break;

      default:
        result = { error: 'Unknown action: ' + action };
    }

    _log(action, { params: params, result: result });
    return _jsonResponse({ success: true, data: result });
  } catch (err) {
    _log('ERROR', { message: err.message, stack: err.stack });
    return _jsonResponse({ success: false, error: err.message, stack: err.stack });
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════

function _log(action, data) {
  try {
    var ss = _ss();
    var sheet = ss.getSheetByName(S.LOGS);
    if (!sheet) {
      sheet = ss.insertSheet(S.LOGS);
      sheet.appendRow(['timestamp', 'action', 'details']);
    }
    sheet.appendRow([_now(), action, JSON.stringify(data)]);
  } catch (e) {}
}

function _ss() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function _sheet(name) {
  return _ss().getSheetByName(name);
}

function _today() {
  var d = new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function _now() {
  var d = new Date();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function _dayOfWeek(dateStr) {
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var d = new Date(dateStr + 'T00:00:00');
  return days[d.getDay()];
}

function _wordCount(text) {
  if (!text || text.trim() === '') return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Read ALL rows of a sheet and return as array of objects keyed by header.
 */
function _sheetToObjects(sheetName) {
  var sheet = _sheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      obj[h] = row[i];
    });
    return obj;
  });
}

/**
 * Get header row of a sheet as array.
 */
function _headers(sheetName) {
  return _sheet(sheetName).getRange(1, 1, 1, _sheet(sheetName).getLastColumn()).getValues()[0];
}

/**
 * Find the row index (1-based) where column `col` equals `value`.
 * Returns -1 if not found.
 */
function _findRow(sheetName, col, value) {
  var sheet = _sheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIdx = headers.indexOf(col);
  if (colIdx < 0) return -1;
  var colData = sheet.getRange(2, colIdx + 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < colData.length; i++) {
    if (String(colData[i][0]) === String(value)) return i + 2; // 1-based sheet row
  }
  return -1;
}

/**
 * Update a single row in a sheet identified by (idCol, idValue).
 * `updates` is an object of { columnName: newValue }.
 */
function _updateRow(sheetName, idCol, idValue, updates) {
  var sheet = _sheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowIdx = _findRow(sheetName, idCol, idValue);
  if (rowIdx < 0) throw new Error('Row not found: ' + idCol + '=' + idValue + ' in ' + sheetName);
  Object.keys(updates).forEach(function(col) {
    var colIdx = headers.indexOf(col);
    if (colIdx >= 0) {
      sheet.getRange(rowIdx, colIdx + 1).setValue(updates[col]);
    }
  });
}

/**
 * Get sheet by name, or create it with headers if it doesn't exist.
 */
function _getOrCreateSheet(name, headers) {
  var ss = _ss();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
  }
  return sheet;
}

/**
 * Append a new row to a sheet. `obj` must have keys matching headers.
 */
function _appendRow(sheetName, obj) {
  var sheet = _sheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}

/**
 * Auto-increment ID for a given prefix (e.g. 'JRN', 'TOD', 'INS').
 * Reads the first column of the sheet to find the max existing number.
 */
function _nextId(sheetName, prefix) {
  var sheet = _sheet(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return prefix + '-001';
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  var max = 0;
  ids.forEach(function(id) {
    var match = String(id).match(new RegExp('^' + prefix + '-(\\d+)$'));
    if (match) max = Math.max(max, parseInt(match[1], 10));
  });
  return prefix + '-' + String(max + 1).padStart(3, '0');
}

/**
 * Next media ID — each type (IMG/AUD/FIL) has its own counter within MEDIA_LIBRARY.
 */
function _nextMediaId(mediaType) {
  var prefix = mediaType === 'image' ? 'IMG' : mediaType === 'audio' ? 'AUD' : 'FIL';
  var sheet = _sheet(S.MEDIA);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return prefix + '-001';
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  var max = 0;
  ids.forEach(function(id) {
    var match = String(id).match(new RegExp('^' + prefix + '-(\\d+)$'));
    if (match) max = Math.max(max, parseInt(match[1], 10));
  });
  return prefix + '-' + String(max + 1).padStart(3, '0');
}

// ═══════════════════════════════════════════════════════════════
// DRIVE HELPERS
// ═══════════════════════════════════════════════════════════════

function _getRootFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_ROOT);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_ROOT);
}

function _getSubfolder(subfolderName) {
  var root = _getRootFolder();
  var subs = root.getFoldersByName(subfolderName);
  if (subs.hasNext()) return subs.next();
  return root.createFolder(subfolderName);
}

function _sourceFolderName(uploadedFrom) {
  var map = {
    journal: 'Journal Files',
    journal_image: 'Journal Images',
    journal_audio: 'Journal Audio',
    todo: 'Todo Media',
    insight: 'Insight Media'
  };
  return map[uploadedFrom] || 'Journal Files';
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

function initializeApp() {
  var ss = _ss();

  // ── Create sheets if they don't exist ──
  var sheetDefs = {};

  sheetDefs[S.JOURNAL] = [
    'entry_id','date','day_of_week','time_created','time_modified','title',
    'text_content','mood','energy_level','weather','word_count',
    'audio_refs','image_refs','file_refs','tags','location',
    'is_private','actionable_insight_id','streak_day','status'
  ];

  sheetDefs[S.TODOS] = [
    'todo_id','title','description','priority','category',
    'date_created','time_created','due_date','original_due_date',
    'rollover_count','rollover_history','status','completion_date',
    'conclusion_remarks','conclusion_audio_refs','conclusion_image_refs',
    'conclusion_file_refs','actionable_insight_id','snooze_until',
    'recurring','recurring_parent_id','tags','estimated_time_mins',
    'actual_time_mins','notes'
  ];

  sheetDefs[S.INSIGHTS] = [
    'insight_id','date_created','time_created','date_modified','time_modified',
    'title','text_content','audio_refs','image_refs','file_refs',
    'source_type','source_id','source_title','category','tags',
    'impact_level','is_actioned','action_date','review_date',
    'linked_todo_id','starred','status'
  ];

  sheetDefs[S.HABITS] = [
    'habit_id','name','description','category','frequency','custom_days',
    'is_measurable','target_per_day','unit','color','icon',
    'date_created','start_date','is_active','current_streak',
    'longest_streak','total_completions','last_completed_date',
    'reminder_time','notes','archived_date'
  ];

  sheetDefs[S.HABIT_LOGS] = [
    'log_id','habit_id','habit_name','date','day_of_week','status',
    'value_logged','completion_time','note','mood_at_completion','streak_at_time'
  ];

  sheetDefs[S.MEDIA] = [
    'media_id','media_type','filename','display_name','drive_file_id',
    'drive_link','thumbnail_link','file_extension','file_size_kb',
    'duration_seconds','date_uploaded','time_uploaded','uploaded_from',
    'source_id','referenced_in','tags','notes','is_orphan',
    'drive_folder','status'
  ];

  sheetDefs[S.CONFIG] = [
    'config_id','user_name','timezone','theme','week_start_day',
    'music_behavior','default_volume','journal_streak','longest_journal_streak',
    'total_journal_entries','total_todos_completed','total_todos_created',
    'total_insights','total_habits_logged','default_mood_options',
    'default_categories','last_stats_updated','last_rollover_run'
  ];

  sheetDefs[S.TAGS] = [
    'tag_id','tag_name','tag_color','used_in','usage_count','date_created','last_used'
  ];

  // ── 11 NEW FEATURES ──
  sheetDefs[S.LIFE_MAP]      = ['id', 'title', 'description', 'lat', 'lng', 'date', 'emoji', 'color', 'updatedAt'];
  sheetDefs[S.TIME_CAPSULES] = ['id', 'title', 'message', 'created_at', 'unlock_date', 'is_unlocked', 'updatedAt'];
  sheetDefs[S.WHO_AM_I]      = ['section', 'content', 'updated_at'];
  sheetDefs[S.THOUGHT_DUMP]  = ['id', 'content', 'tags', 'mood', 'created_at', 'updatedAt'];
  sheetDefs[S.STREAKS]       = ['id', 'name', 'emoji', 'description', 'created_at', 'updatedAt'];
  sheetDefs[S.STREAK_LOGS]   = ['streak_id', 'date'];
  sheetDefs[S.READING_LIST]  = ['id', 'title', 'author', 'status', 'rating', 'notes', 'started', 'finished', 'cover_url', 'updatedAt'];
  sheetDefs[S.WATCHLIST]     = ['id', 'title', 'type', 'status', 'rating', 'notes', 'year', 'poster_url', 'tmdb_id', 'updatedAt'];
  sheetDefs[S.FINANCE]       = ['id', 'date', 'type', 'category', 'amount', 'description', 'updatedAt'];
  sheetDefs[S.BOOKMARKS]     = ['id', 'url', 'title', 'description', 'tags', 'favicon', 'created_at', 'is_read', 'updatedAt'];
  sheetDefs[S.WRITING]       = ['id', 'title', 'content', 'tags', 'word_count', 'created_at', 'updatedAt'];
  sheetDefs[S.YEARLY_REVIEWS] = ['id', 'year', 'section', 'content', 'updatedAt'];
  sheetDefs[S.TWITCH_CHANNELS] = ['id', 'login', 'display_name', 'profile_image_url', 'added_at'];
  sheetDefs[S.TWITCH_DISMISSED] = ['item_id', 'dismissed_at'];
  sheetDefs[S.TWITCH_CONFIG] = ['client_id', 'client_secret'];

  var created = [];
  Object.keys(sheetDefs).forEach(function(name) {
    var existing = ss.getSheetByName(name);
    if (!existing) {
      var newSheet = ss.insertSheet(name);
      newSheet.appendRow(sheetDefs[name]);
      created.push(name);
    }
  });

  // ── Create Drive folder structure ──
  var root = _getRootFolder();
  DRIVE_SUBFOLDERS.forEach(function(sub) {
    var subs = root.getFoldersByName(sub);
    if (!subs.hasNext()) root.createFolder(sub);
  });

  // ── Create initial DASHBOARD_CONFIG row ──
  var configSheet = _sheet(S.CONFIG);
  var configRows = configSheet.getLastRow();
  if (configRows < 2) {
    var tz = Session.getScriptTimeZone();
    _appendRow(S.CONFIG, {
      config_id:               'CONFIG-001',
      user_name:               'You',
      timezone:                tz,
      theme:                   'dark',
      week_start_day:          'Monday',
      music_behavior:          'duck',
      default_volume:          80,
      journal_streak:          0,
      longest_journal_streak:  0,
      total_journal_entries:   0,
      total_todos_completed:   0,
      total_todos_created:     0,
      total_insights:          0,
      total_habits_logged:     0,
      default_mood_options:    'happy,calm,neutral,anxious,sad,excited',
      default_categories:      'work,personal,health,learning,finance,other',
      last_stats_updated:      _now(),
      last_rollover_run:       ''
    });
  }

  return { message: 'App initialized', sheets_created: created };
}

// ═══════════════════════════════════════════════════════════════
// JOURNAL ACTIONS
// ═══════════════════════════════════════════════════════════════

function getEntries(params) {
  var rows = _sheetToObjects(S.JOURNAL);
  // Filter out deleted entries
  rows = rows.filter(function(r) { return r.status !== 'deleted'; });
  // Sort newest first
  rows.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
  if (params && params.limit) rows = rows.slice(0, params.limit);
  return rows;
}

function getEntryById(params) {
  var rows = _sheetToObjects(S.JOURNAL);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].entry_id === params.entry_id) return rows[i];
  }
  throw new Error('Entry not found: ' + params.entry_id);
}

function createEntry(params) {
  var today = _today();
  // Calculate streak
  var existingEntries = _sheetToObjects(S.JOURNAL).filter(function(r) { return r.status !== 'deleted'; });
  var streak = _calculateJournalStreak(existingEntries, today);

  var entry_id = _nextId(S.JOURNAL, 'JRN');
  var now = _now();
  var entry = {
    entry_id:              entry_id,
    date:                  params.date        || today,
    day_of_week:           _dayOfWeek(params.date || today),
    time_created:          now,
    time_modified:         now,
    title:                 params.title        || '',
    text_content:          params.text_content || '',
    mood:                  params.mood         || '',
    energy_level:          params.energy_level || '',
    weather:               params.weather      || '',
    word_count:            _wordCount(params.text_content || ''),
    audio_refs:            params.audio_refs   || '',
    image_refs:            params.image_refs   || '',
    file_refs:             params.file_refs    || '',
    tags:                  params.tags         || '',
    location:              params.location     || '',
    is_private:            params.is_private   || false,
    actionable_insight_id: '',
    streak_day:            streak,
    status:                params.status       || 'draft'
  };
  _appendRow(S.JOURNAL, entry);

  // Update config stats
  _updateConfigStats({ journal_streak: streak });

  return entry;
}

function updateEntry(params) {
  if (!params.entry_id) throw new Error('entry_id required');
  var updates = Object.assign({}, params);
  delete updates.entry_id;
  updates.time_modified = _now();
  if (updates.text_content !== undefined) {
    updates.word_count = _wordCount(updates.text_content);
  }
  if (updates.date) {
    updates.day_of_week = _dayOfWeek(updates.date);
  }
  _updateRow(S.JOURNAL, 'entry_id', params.entry_id, updates);
  return { updated: params.entry_id };
}

function deleteEntry(params) {
  if (!params.entry_id) throw new Error('entry_id required');
  _updateRow(S.JOURNAL, 'entry_id', params.entry_id, { status: 'deleted', time_modified: _now() });
  return { deleted: params.entry_id };
}

function _calculateJournalStreak(entries, targetDate) {
  // Build a set of dates that have at least one non-deleted, published/draft entry
  var dateSet = {};
  entries.forEach(function(e) { dateSet[String(e.date).substring(0, 10)] = true; });

  var streak = 0;
  var d = new Date(targetDate + 'T00:00:00');
  // Start from today, go backward
  while (true) {
    var key = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (!dateSet[key]) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ═══════════════════════════════════════════════════════════════
// TODO ACTIONS
// ═══════════════════════════════════════════════════════════════

function getTodos(params) {
  var rows = _sheetToObjects(S.TODOS);
  var today = _today();

  if (params && params.filter === 'today') {
    rows = rows.filter(function(r) {
      return r.status === 'pending' && String(r.due_date).substring(0, 10) === today;
    });
  } else if (params && params.filter === 'pending') {
    rows = rows.filter(function(r) { return r.status === 'pending'; });
  } else if (params && params.filter === 'completed') {
    rows = rows.filter(function(r) { return r.status === 'completed'; });
  } else {
    // Return all non-cancelled
    rows = rows.filter(function(r) { return r.status !== 'cancelled'; });
  }

  // Handle snoozed todos — hide them if snooze_until is in the future
  rows = rows.filter(function(r) {
    if (r.status === 'snoozed') {
      var snooze = String(r.snooze_until).substring(0, 10);
      return snooze <= today;
    }
    return true;
  });

  // Sort by due_date ascending
  rows.sort(function(a, b) { return String(a.due_date).localeCompare(String(b.due_date)); });
  return rows;
}

function createTodo(params) {
  if (!params.title) throw new Error('title required');
  var now = _now();
  var today = _today();
  var todo_id = _nextId(S.TODOS, 'TOD');
  var due = params.due_date || today;
  var todo = {
    todo_id:               todo_id,
    title:                 params.title,
    description:           params.description          || '',
    priority:              params.priority             || 'medium',
    category:              params.category             || 'other',
    date_created:          today,
    time_created:          now,
    due_date:              due,
    original_due_date:     due,
    rollover_count:        0,
    rollover_history:      '',
    status:                'pending',
    completion_date:       '',
    conclusion_remarks:    '',
    conclusion_audio_refs: '',
    conclusion_image_refs: '',
    conclusion_file_refs:  '',
    actionable_insight_id: '',
    snooze_until:          '',
    recurring:             params.recurring            || 'none',
    recurring_parent_id:   params.recurring_parent_id || '',
    tags:                  params.tags                 || '',
    estimated_time_mins:   params.estimated_time_mins  || '',
    actual_time_mins:      '',
    notes:                 params.notes                || ''
  };
  _appendRow(S.TODOS, todo);
  _updateConfigStats({ total_todos_created_increment: 1 });
  return todo;
}

function updateTodo(params) {
  if (!params.todo_id) throw new Error('todo_id required');
  var updates = Object.assign({}, params);
  delete updates.todo_id;
  _updateRow(S.TODOS, 'todo_id', params.todo_id, updates);
  return { updated: params.todo_id };
}

function completeTodo(params) {
  if (!params.todo_id) throw new Error('todo_id required');
  if (!params.conclusion_remarks || params.conclusion_remarks.trim() === '') {
    throw new Error('conclusion_remarks is required to complete a todo');
  }
  var updates = {
    status:              'completed',
    completion_date:     _today(),
    conclusion_remarks:  params.conclusion_remarks,
    actual_time_mins:    params.actual_time_mins    || ''
  };
  if (params.conclusion_audio_refs) updates.conclusion_audio_refs = params.conclusion_audio_refs;
  if (params.conclusion_image_refs) updates.conclusion_image_refs = params.conclusion_image_refs;
  if (params.conclusion_file_refs)  updates.conclusion_file_refs  = params.conclusion_file_refs;
  _updateRow(S.TODOS, 'todo_id', params.todo_id, updates);
  _updateConfigStats({ total_todos_completed_increment: 1 });
  return { completed: params.todo_id };
}

function rolloverTodos() {
  var config = _getConfig();
  var today = _today();

  if (String(config.last_rollover_run).substring(0, 10) === today) {
    return { message: 'Rollover already run today', skipped: true };
  }

  var rows = _sheetToObjects(S.TODOS);
  var rolled = [];

  rows.forEach(function(row) {
    var dueStr = String(row.due_date).substring(0, 10);
    if (row.status === 'pending' && dueStr < today) {
      var oldDue = dueStr;
      var newHistory = row.rollover_history
        ? row.rollover_history + ',' + oldDue
        : oldDue;
      var newCount = (parseInt(row.rollover_count, 10) || 0) + 1;
      _updateRow(S.TODOS, 'todo_id', row.todo_id, {
        due_date:         today,
        rollover_count:   newCount,
        rollover_history: newHistory
      });
      rolled.push(row.todo_id);
    }
  });

  _updateRow(S.CONFIG, 'config_id', 'CONFIG-001', {
    last_rollover_run: today
  });

  return { rolled: rolled, count: rolled.length };
}

function snoozeTodo(params) {
  if (!params.todo_id) throw new Error('todo_id required');
  if (!params.snooze_until) throw new Error('snooze_until date required');
  _updateRow(S.TODOS, 'todo_id', params.todo_id, {
    status:      'snoozed',
    snooze_until: params.snooze_until
  });
  return { snoozed: params.todo_id, until: params.snooze_until };
}

// ═══════════════════════════════════════════════════════════════
// INSIGHT ACTIONS
// ═══════════════════════════════════════════════════════════════

function getInsights(params) {
  var rows = _sheetToObjects(S.INSIGHTS);
  rows = rows.filter(function(r) { return r.status !== 'archived'; });

  if (params) {
    if (params.category)    rows = rows.filter(function(r) { return r.category === params.category; });
    if (params.impact_level) rows = rows.filter(function(r) { return r.impact_level === params.impact_level; });
    if (params.starred === true || params.starred === 'true')
      rows = rows.filter(function(r) { return r.starred === true || r.starred === 'TRUE'; });
    if (params.is_actioned === true || params.is_actioned === 'true')
      rows = rows.filter(function(r) { return r.is_actioned === true || r.is_actioned === 'TRUE'; });
    if (params.is_actioned === false || params.is_actioned === 'false')
      rows = rows.filter(function(r) { return !(r.is_actioned === true || r.is_actioned === 'TRUE'); });
  }

  rows.sort(function(a, b) { return String(b.date_created).localeCompare(String(a.date_created)); });
  return rows;
}

function createInsight(params) {
  if (!params.title) throw new Error('title required');
  var now = _now();
  var today = _today();
  var insight_id = _nextId(S.INSIGHTS, 'INS');
  var insight = {
    insight_id:    insight_id,
    date_created:  today,
    time_created:  now,
    date_modified: today,
    time_modified: now,
    title:         params.title,
    text_content:  params.text_content  || '',
    audio_refs:    params.audio_refs    || '',
    image_refs:    params.image_refs    || '',
    file_refs:     params.file_refs     || '',
    source_type:   params.source_type   || 'standalone',
    source_id:     params.source_id     || '',
    source_title:  params.source_title  || '',
    category:      params.category      || 'other',
    tags:          params.tags          || '',
    impact_level:  params.impact_level  || 'medium',
    is_actioned:   false,
    action_date:   '',
    review_date:   params.review_date   || '',
    linked_todo_id:'',
    starred:       false,
    status:        'active'
  };
  _appendRow(S.INSIGHTS, insight);
  _updateConfigStats({ total_insights_increment: 1 });
  return insight;
}

function updateInsight(params) {
  if (!params.insight_id) throw new Error('insight_id required');
  var updates = Object.assign({}, params);
  delete updates.insight_id;
  updates.date_modified = _today();
  updates.time_modified = _now();
  if (updates.is_actioned === true && !updates.action_date) {
    updates.action_date = _today();
  }
  _updateRow(S.INSIGHTS, 'insight_id', params.insight_id, updates);
  return { updated: params.insight_id };
}

function linkInsightToTodo(params) {
  if (!params.insight_id) throw new Error('insight_id required');
  // Create new todo from insight
  var insight = _sheetToObjects(S.INSIGHTS).find(function(r) { return r.insight_id === params.insight_id; });
  if (!insight) throw new Error('Insight not found: ' + params.insight_id);

  var todo = createTodo({
    title:       params.todo_title || insight.title,
    description: params.description || ('From insight: ' + insight.insight_id),
    notes:       'linked_insight_id:' + params.insight_id,
    due_date:    params.due_date || _today(),
    priority:    params.priority || 'medium'
  });

  // Link back
  _updateRow(S.INSIGHTS, 'insight_id', params.insight_id, {
    linked_todo_id: todo.todo_id,
    date_modified:  _today(),
    time_modified:  _now()
  });

  return { todo_id: todo.todo_id, insight_id: params.insight_id };
}

// ═══════════════════════════════════════════════════════════════
// HABIT ACTIONS
// ═══════════════════════════════════════════════════════════════

function getHabits(params) {
  var rows = _sheetToObjects(S.HABITS);
  if (!params || params.include_archived !== true) {
    rows = rows.filter(function(r) { return r.is_active === true || r.is_active === 'TRUE'; });
  }
  return rows;
}

function createHabit(params) {
  if (!params.name) throw new Error('name required');
  var today = _today();
  var habit_id = _nextId(S.HABITS, 'HAB');
  var habit = {
    habit_id:           habit_id,
    name:               params.name,
    description:        params.description       || '',
    category:           params.category          || 'other',
    frequency:          params.frequency         || 'daily',
    custom_days:        params.custom_days        || '',
    is_measurable:      params.is_measurable     || false,
    target_per_day:     params.target_per_day    || '',
    unit:               params.unit              || '',
    color:              params.color             || '#4caf7d',
    icon:               params.icon              || '⭐',
    date_created:       today,
    start_date:         params.start_date        || today,
    is_active:          true,
    current_streak:     0,
    longest_streak:     0,
    total_completions:  0,
    last_completed_date:'',
    reminder_time:      params.reminder_time     || '',
    notes:              params.notes             || '',
    archived_date:      ''
  };
  _appendRow(S.HABITS, habit);
  return habit;
}

function updateHabit(params) {
  if (!params.habit_id) throw new Error('habit_id required');
  var updates = Object.assign({}, params);
  delete updates.habit_id;
  _updateRow(S.HABITS, 'habit_id', params.habit_id, updates);
  return { updated: params.habit_id };
}

function archiveHabit(params) {
  if (!params.habit_id) throw new Error('habit_id required');
  _updateRow(S.HABITS, 'habit_id', params.habit_id, {
    is_active:     false,
    archived_date: _today()
  });
  return { archived: params.habit_id };
}

function logHabit(params) {
  if (!params.habit_id) throw new Error('habit_id required');
  var habit = _sheetToObjects(S.HABITS).find(function(r) { return r.habit_id === params.habit_id; });
  if (!habit) throw new Error('Habit not found: ' + params.habit_id);

  var today = _today();
  var logDate = params.date || today;
  var log_id = _nextId(S.HABIT_LOGS, 'HLG');

  // Check for duplicate log today for this habit
  var existingLogs = _sheetToObjects(S.HABIT_LOGS).filter(function(r) {
    return r.habit_id === params.habit_id && String(r.date).substring(0, 10) === logDate;
  });

  if (existingLogs.length > 0 && !params.allow_update) {
    // Update existing log
    _updateRow(S.HABIT_LOGS, 'log_id', existingLogs[0].log_id, {
      status:       params.status      || 'completed',
      value_logged: params.value_logged|| '',
      note:         params.note        || '',
      mood_at_completion: params.mood_at_completion || ''
    });
  } else {
    var log = {
      log_id:             log_id,
      habit_id:           params.habit_id,
      habit_name:         habit.name,
      date:               logDate,
      day_of_week:        _dayOfWeek(logDate),
      status:             params.status       || 'completed',
      value_logged:       params.value_logged || '',
      completion_time:    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm'),
      note:               params.note         || '',
      mood_at_completion: params.mood_at_completion || '',
      streak_at_time:     0 // will be set after recalc
    };
    _appendRow(S.HABIT_LOGS, log);
  }

  // Recalculate streak for this habit
  var newStreak = _recalcHabitStreak(params.habit_id, habit);
  var newTotal  = (parseInt(habit.total_completions, 10) || 0) + (existingLogs.length === 0 ? 1 : 0);
  var newLongest = Math.max(parseInt(habit.longest_streak, 10) || 0, newStreak);

  _updateRow(S.HABITS, 'habit_id', params.habit_id, {
    current_streak:      newStreak,
    longest_streak:      newLongest,
    total_completions:   newTotal,
    last_completed_date: logDate
  });

  _updateConfigStats({ total_habits_logged_increment: 1 });

  return { logged: params.habit_id, streak: newStreak };
}

function getHabitLogs(params) {
  if (!params.habit_id) throw new Error('habit_id required');
  var rows = _sheetToObjects(S.HABIT_LOGS).filter(function(r) { return r.habit_id === params.habit_id; });
  if (params.from_date) rows = rows.filter(function(r) { return String(r.date).substring(0, 10) >= params.from_date; });
  if (params.to_date)   rows = rows.filter(function(r) { return String(r.date).substring(0, 10) <= params.to_date; });
  rows.sort(function(a, b) { return String(a.date).localeCompare(String(b.date)); });
  return rows;
}

function calculateStreaks() {
  var habits = _sheetToObjects(S.HABITS).filter(function(r) { return r.is_active === true || r.is_active === 'TRUE'; });
  habits.forEach(function(habit) {
    var streak = _recalcHabitStreak(habit.habit_id, habit);
    var longest = Math.max(parseInt(habit.longest_streak, 10) || 0, streak);
    _updateRow(S.HABITS, 'habit_id', habit.habit_id, {
      current_streak: streak,
      longest_streak: longest
    });
  });
  return { recalculated: habits.length };
}

/**
 * Recalculate consecutive completed days for a habit, going backward from today.
 * Skipped days (not due) do not break streak.
 */
function _recalcHabitStreak(habit_id, habit) {
  var logs = _sheetToObjects(S.HABIT_LOGS).filter(function(r) {
    return r.habit_id === habit_id && (r.status === 'completed' || r.status === 'partial');
  });
  var logDates = {};
  logs.forEach(function(l) { logDates[String(l.date).substring(0, 10)] = true; });

  var streak = 0;
  var d = new Date();
  var maxDays = 365;

  for (var i = 0; i < maxDays; i++) {
    var key = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var isDue = _isHabitDue(habit, d);
    if (isDue) {
      if (logDates[key]) {
        streak++;
      } else {
        break; // missed a due day → streak over
      }
    }
    // not due today → don't break streak, just skip
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function _isHabitDue(habit, date) {
  var freq = habit.frequency;
  var dow = date.getDay(); // 0=Sun, 1=Mon … 6=Sat
  if (freq === 'daily') return true;
  if (freq === 'weekdays') return dow >= 1 && dow <= 5;
  if (freq === 'weekends') return dow === 0 || dow === 6;
  if (freq === 'custom') {
    var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var custom = String(habit.custom_days).split(',').map(function(s) { return s.trim(); });
    return custom.indexOf(dayNames[dow]) >= 0;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
// MEDIA ACTIONS
// ═══════════════════════════════════════════════════════════════

function uploadMedia(params) {
  if (!params.base64data) throw new Error('base64data required');
  if (!params.filename)   throw new Error('filename required');
  if (!params.media_type) throw new Error('media_type required (image|audio|file)');

  var bytes   = Utilities.base64Decode(params.base64data);
  var blob    = Utilities.newBlob(bytes, params.mime_type || 'application/octet-stream', params.filename);
  var ext     = params.filename.split('.').pop().toLowerCase();

  // Determine subfolder
  var subfolderName;
  if (params.media_type === 'image') subfolderName = params.uploaded_from === 'journal' ? 'Journal Images' : 'Insight Media';
  else if (params.media_type === 'audio') subfolderName = 'Journal Audio';
  else subfolderName = params.uploaded_from === 'todo' ? 'Todo Media' : params.uploaded_from === 'insight' ? 'Insight Media' : 'Journal Files';

  if (params.uploaded_from === 'todo') subfolderName = 'Todo Media';

  var folder   = _getSubfolder(subfolderName);
  var file     = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId        = file.getId();
  var driveLink     = 'https://drive.google.com/file/d/' + fileId + '/view?usp=sharing';
  var thumbnailLink = params.media_type === 'image'
    ? 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w400'
    : '';
  var fileSizeKb    = Math.round(blob.getBytes().length / 1024);
  var media_id      = _nextMediaId(params.media_type);
  var now           = _now();
  var today         = _today();

  var mediaRow = {
    media_id:         media_id,
    media_type:       params.media_type,
    filename:         params.filename,
    display_name:     params.display_name || params.filename,
    drive_file_id:    fileId,
    drive_link:       driveLink,
    thumbnail_link:   thumbnailLink,
    file_extension:   ext,
    file_size_kb:     fileSizeKb,
    duration_seconds: params.duration_seconds || '',
    date_uploaded:    today,
    time_uploaded:    now,
    uploaded_from:    params.uploaded_from   || 'standalone',
    source_id:        params.source_id       || '',
    referenced_in:    params.source_id       || '',
    tags:             params.tags            || '',
    notes:            params.notes           || '',
    is_orphan:        !params.source_id,
    drive_folder:     subfolderName,
    status:           'active'
  };
  _appendRow(S.MEDIA, mediaRow);

  return {
    media_id:       media_id,
    drive_link:     driveLink,
    thumbnail_link: thumbnailLink,
    file_size_kb:   fileSizeKb
  };
}

function getMediaById(params) {
  if (!params.media_id) throw new Error('media_id required');
  var rows = _sheetToObjects(S.MEDIA);
  var found = rows.find(function(r) { return r.media_id === params.media_id; });
  if (!found) throw new Error('Media not found: ' + params.media_id);
  return found;
}

function getMediaBySource(params) {
  if (!params.source_id) throw new Error('source_id required');
  return _sheetToObjects(S.MEDIA).filter(function(r) {
    return r.source_id === params.source_id && r.status === 'active';
  });
}

function getAllMedia(params) {
  var rows = _sheetToObjects(S.MEDIA).filter(function(r) { return r.status === 'active'; });
  if (params && params.media_type) {
    rows = rows.filter(function(r) { return r.media_type === params.media_type; });
  }
  if (params && params.sort === 'source') {
    rows.sort(function(a, b) { return String(a.uploaded_from).localeCompare(String(b.uploaded_from)); });
  } else {
    rows.sort(function(a, b) { return String(b.date_uploaded).localeCompare(String(a.date_uploaded)); });
  }
  return rows;
}

function updateMediaRefs(params) {
  if (!params.source_id) throw new Error('source_id required');
  if (!params.media_ids || !params.media_ids.length) return { updated: 0 };

  params.media_ids.forEach(function(mediaId) {
    var row = _sheetToObjects(S.MEDIA).find(function(r) { return r.media_id === mediaId; });
    if (!row) return;
    var refs = row.referenced_in ? row.referenced_in.split(',').map(function(s) { return s.trim(); }) : [];
    if (refs.indexOf(params.source_id) < 0) {
      refs.push(params.source_id);
      _updateRow(S.MEDIA, 'media_id', mediaId, {
        referenced_in: refs.join(','),
        is_orphan:     false
      });
    }
  });

  return { updated: params.media_ids.length };
}

function deleteMedia(params) {
  if (!params.media_id) throw new Error('media_id required');
  var row = _sheetToObjects(S.MEDIA).find(function(r) { return r.media_id === params.media_id; });
  if (!row) throw new Error('Media not found: ' + params.media_id);

  // Delete from Drive
  try {
    var file = DriveApp.getFileById(row.drive_file_id);
    file.setTrashed(true);
  } catch(e) {
    // File may already be deleted
  }

  // Mark as deleted in sheet
  _updateRow(S.MEDIA, 'media_id', params.media_id, { status: 'deleted' });

  // Remove reference from all journal entries, todos, insights
  _removeMediaRef(S.JOURNAL,   'image_refs',  params.media_id);
  _removeMediaRef(S.JOURNAL,   'audio_refs',  params.media_id);
  _removeMediaRef(S.JOURNAL,   'file_refs',   params.media_id);
  _removeMediaRef(S.TODOS,     'conclusion_image_refs', params.media_id);
  _removeMediaRef(S.TODOS,     'conclusion_audio_refs', params.media_id);
  _removeMediaRef(S.TODOS,     'conclusion_file_refs',  params.media_id);
  _removeMediaRef(S.INSIGHTS,  'image_refs',  params.media_id);
  _removeMediaRef(S.INSIGHTS,  'audio_refs',  params.media_id);
  _removeMediaRef(S.INSIGHTS,  'file_refs',   params.media_id);

  return { deleted: params.media_id };
}

function _removeMediaRef(sheetName, colName, mediaId) {
  var sheet   = _sheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIdx  = headers.indexOf(colName);
  var idCol   = headers.indexOf(sheetName === S.JOURNAL ? 'entry_id' : sheetName === S.TODOS ? 'todo_id' : 'insight_id');
  if (colIdx < 0) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var data = sheet.getRange(2, colIdx + 1, lastRow - 1, 1).getValues();
  data.forEach(function(row, i) {
    var val = String(row[0]);
    if (val.indexOf(mediaId) >= 0) {
      var cleaned = val.split(',').map(function(s) { return s.trim(); })
                       .filter(function(s) { return s !== mediaId; }).join(',');
      sheet.getRange(i + 2, colIdx + 1).setValue(cleaned);
    }
  });
}

function scanOrphans() {
  var media = _sheetToObjects(S.MEDIA).filter(function(r) { return r.status === 'active'; });
  var journalEntries = _sheetToObjects(S.JOURNAL);
  var todos          = _sheetToObjects(S.TODOS);
  var insights       = _sheetToObjects(S.INSIGHTS);

  function buildRefSet(rows, fields) {
    var set = {};
    rows.forEach(function(row) {
      fields.forEach(function(f) {
        if (row[f]) {
          row[f].split(',').forEach(function(id) {
            var t = id.trim();
            if (t) set[t] = true;
          });
        }
      });
    });
    return set;
  }

  var refSet = {};
  Object.assign(refSet, buildRefSet(journalEntries, ['audio_refs','image_refs','file_refs']));
  Object.assign(refSet, buildRefSet(todos, ['conclusion_audio_refs','conclusion_image_refs','conclusion_file_refs']));
  Object.assign(refSet, buildRefSet(insights, ['audio_refs','image_refs','file_refs']));

  var updated = 0;
  media.forEach(function(m) {
    var isOrphan = !refSet[m.media_id];
    if ((m.is_orphan === true || m.is_orphan === 'TRUE') !== isOrphan) {
      _updateRow(S.MEDIA, 'media_id', m.media_id, { is_orphan: isOrphan });
      updated++;
    }
  });

  return { scanned: media.length, updated: updated };
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD ACTIONS
// ═══════════════════════════════════════════════════════════════

function _getConfig() {
  var rows = _sheetToObjects(S.CONFIG);
  return rows.length > 0 ? rows[0] : {};
}

function getDashboardStats() {
  var config  = _getConfig();
  var today   = _today();

  var todayTodos = _sheetToObjects(S.TODOS).filter(function(r) {
    return r.status === 'pending' && String(r.due_date).substring(0, 10) === today;
  });

  var activeHabits = _sheetToObjects(S.HABITS).filter(function(r) {
    return r.is_active === true || r.is_active === 'TRUE';
  });

  var todayHabitLogs = _sheetToObjects(S.HABIT_LOGS).filter(function(r) {
    return String(r.date).substring(0, 10) === today;
  });

  var recentEntries = _sheetToObjects(S.JOURNAL)
    .filter(function(r) { return r.status !== 'deleted'; })
    .sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
  var latestEntry = recentEntries.length > 0 ? recentEntries[0] : null;

  var overdueInsights = _sheetToObjects(S.INSIGHTS).filter(function(r) {
    return r.status === 'active' && r.review_date && String(r.review_date).substring(0, 10) <= today;
  });

  // Weekly strip — last 7 days
  var weeklyStrip = [];
  var thoughtActivity = [];
  var streakActivity = [];
  var allThoughts = _sheetToObjects(S.THOUGHT_DUMP);
  var streakLogs = _sheetToObjects(S.STREAK_LOGS);

  for (var i = 29; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var dStr = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // Only for the last 7 days (weekly strip)
    if (i < 7) {
      var hasJournal = recentEntries.some(function(e) { return String(e.date).substring(0, 10) === dStr; });
      var dayLogs = _sheetToObjects(S.HABIT_LOGS).filter(function(r) { return String(r.date).substring(0, 10) === dStr; });
      var dayHabits = activeHabits.filter(function(h) { return _isHabitDue(h, d); });
      var habitPct = dayHabits.length > 0 ? Math.round(dayLogs.filter(function(l) { return l.status === 'completed'; }).length / dayHabits.length * 100) : 0;
      var hasTodo = _sheetToObjects(S.TODOS).some(function(r) { return r.status === 'completed' && String(r.completion_date).substring(0, 10) === dStr; });
      weeklyStrip.push({ date: dStr, has_journal: hasJournal, habit_pct: habitPct, has_todo: hasTodo });
    }

    // For the last 30 days (activity summaries)
    var countThoughts = allThoughts.filter(function(t) { return String(t.created_at).substring(0, 10) === dStr; }).length;
    thoughtActivity.push({ date: dStr, count: countThoughts });

    var countStreaks = streakLogs.filter(function(l) { 
      var sDate = l.date;
      if (sDate instanceof Date) sDate = Utilities.formatDate(sDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      return String(sDate).substring(0, 10) === dStr; 
    }).length;
    streakActivity.push({ date: dStr, count: countStreaks });
  }

  return {
    config:           config,
    today_todos:      todayTodos,
    active_habits:    activeHabits,
    today_habit_logs: todayHabitLogs,
    latest_entry:     latestEntry,
    overdue_insights: overdueInsights,
    weekly_strip:     weeklyStrip,
    thought_activity: thoughtActivity,
    streak_activity:  streakActivity
  };
}

function updateConfig(params) {
  var updates = Object.assign({}, params);
  _updateRow(S.CONFIG, 'config_id', 'CONFIG-001', updates);
  return { updated: true };
}

function recalculateStats() {
  var entries = _sheetToObjects(S.JOURNAL).filter(function(r) { return r.status !== 'deleted'; });
  var todos   = _sheetToObjects(S.TODOS);
  var insights= _sheetToObjects(S.INSIGHTS);
  var hlogs   = _sheetToObjects(S.HABIT_LOGS);

  var today   = _today();
  var streak  = _calculateJournalStreak(entries, today);

  var allStreaks = [0];
  // Rough longest streak: run from earliest date forward
  // (simplified — just take max of current streak)
  entries.forEach(function(e) {
    allStreaks.push(_calculateJournalStreak(entries, String(e.date).substring(0, 10)));
  });
  var longestStreak = Math.max.apply(null, allStreaks);

  var stats = {
    journal_streak:          streak,
    longest_journal_streak:  longestStreak,
    total_journal_entries:   entries.length,
    total_todos_completed:   todos.filter(function(r) { return r.status === 'completed'; }).length,
    total_todos_created:     todos.length,
    total_insights:          insights.length,
    total_habits_logged:     hlogs.length,
    last_stats_updated:      _now()
  };

  _updateRow(S.CONFIG, 'config_id', 'CONFIG-001', stats);
  return stats;
}

// ── Internal: partial config stats update ───────────────────
function _updateConfigStats(changes) {
  var config = _getConfig();
  var updates = {};
  if (changes.journal_streak !== undefined)          updates.journal_streak = changes.journal_streak;
  if (changes.total_insights_increment)              updates.total_insights = (parseInt(config.total_insights, 10) || 0) + 1;
  if (changes.total_todos_completed_increment)       updates.total_todos_completed = (parseInt(config.total_todos_completed, 10) || 0) + 1;
  if (changes.total_todos_created_increment)         updates.total_todos_created = (parseInt(config.total_todos_created, 10) || 0) + 1;
  if (changes.total_habits_logged_increment)         updates.total_habits_logged = (parseInt(config.total_habits_logged, 10) || 0) + 1;
  if (Object.keys(updates).length > 0) {
    updates.last_stats_updated = _now();
    _updateRow(S.CONFIG, 'config_id', 'CONFIG-001', updates);
  }
}

var S_VIDEOS = 'SAVED_VIDEOS';
var S_YT_CHANS = 'YT_CHANNELS';
var S_YT_DISMISSED = 'YT_DISMISSED';

/**
 * Ensure the YouTube-related sheets exist.
 */
function initYouTubeSync() {
  var ss = _ss();
  var defs = {};
  defs[S_VIDEOS] = ['video_id', 'title', 'channel_title', 'channel_id', 'thumbnail', 'published_at', 'saved_at'];
  defs[S_YT_CHANS] = ['id', 'title', 'thumbnail', 'uploadsId', 'subs', 'added_at'];
  defs[S_YT_DISMISSED] = ['video_id', 'dismissed_at'];

  Object.keys(defs).forEach(function(name) {
    if (!ss.getSheetByName(name)) {
      var sheet = ss.insertSheet(name);
      sheet.appendRow(defs[name]);
    }
  });
}

// --- Saved Library ---
function getSavedVideos() {
  initYouTubeSync();
  return _sheetToObjects(S_VIDEOS).sort(function(a, b) {
    return String(b.saved_at).localeCompare(String(a.saved_at));
  });
}

function saveVideo(params) {
  initYouTubeSync();
  if (_findRow(S_VIDEOS, 'video_id', params.video_id) > 0) return { success: true, exists: true };
  params.saved_at = _now();
  _appendRow(S_VIDEOS, params);
  return { success: true };
}

// --- Channels Sync ---
function getYTChannels() {
  initYouTubeSync();
  return _sheetToObjects(S_YT_CHANS);
}

function saveYTChannel(params) {
  initYouTubeSync();
  if (_findRow(S_YT_CHANS, 'id', params.id) > 0) return { success: true, exists: true };
  params.added_at = _now();
  _appendRow(S_YT_CHANS, params);
  return { success: true };
}

function removeYTChannel(params) {
  initYouTubeSync();
  var sheet = _sheet(S_YT_CHANS);
  var row = _findRow(S_YT_CHANS, 'id', params.id);
  if (row > 0) {
    sheet.deleteRow(row);
    return { success: true };
  }
  return { success: false, error: 'Channel not found' };
}

// --- Dismissed Videos Sync ---
function getYTDismissed() {
  initYouTubeSync();
  return _sheetToObjects(S_YT_DISMISSED).map(function(r) { return r.video_id; });
}

function saveYTDismissed(params) {
  initYouTubeSync();
  if (_findRow(S_YT_DISMISSED, 'video_id', params.video_id) > 0) return { success: true, exists: true };
  _appendRow(S_YT_DISMISSED, {
    video_id: params.video_id,
    dismissed_at: _now()
  });
  return { success: true };
}
// ═══════════════════════════════════════════════════════════════
// VAULT ACTIONS (LINK-BASED)
// ═══════════════════════════════════════════════════════════════

function getVaultMedia(params) {
  var folderId = params.folderId;
  var token = params.continuationToken;
  var batchSize = 300; // Snappier initial load
  
  var files;
  var folderName = '';
  
  if (token) {
    files = DriveApp.continueFileIterator(token);
  } else {
    if (!folderId) throw new Error('folderId required');
    try {
      var folder = DriveApp.getFolderById(folderId);
      folderName = folder.getName();
      // Search only for images and videos within the folder
      var query = "'" + folderId + "' in parents and (mimeType contains 'image/' or mimeType contains 'video/')";
      files = DriveApp.searchFiles(query);
    } catch (e) {
      throw new Error('Folder not found or access denied. Error: ' + e.message);
    }
  }
  
  var media = [];
  var totalChecked = 0;
  
  while (files.hasNext() && totalChecked < batchSize) {
    var file = files.next();
    totalChecked++;
    
    var mime = file.getMimeType() || '';
    var isImage = mime.indexOf('image/') !== -1;
    var id = file.getId();
    
    media.push({
      id: id,
      name: file.getName(),
      mimeType: mime,
      thumbnailLink: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w300', // Small by default
      viewLink: isImage 
        ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w2000'
        : 'https://drive.google.com/file/d/' + id + '/preview',
      createdTime: file.getDateCreated() ? file.getDateCreated().toISOString() : ''
    });
  }
  
  // Sort this batch (most recent first)
  media.sort(function(a, b) { 
    return (b.createdTime || '').localeCompare(a.createdTime || '');
  });
  
  var nextToken = files.hasNext() ? files.getContinuationToken() : null;
  
  return {
    items: media,
    continuationToken: nextToken,
    folderName: folderName,
    diagnostics: {
      checkedInBatch: totalChecked,
      mediaInBatch: media.length,
      hasMore: !!nextToken
    }
  };
}

// ── VAULT FOLDERS ─────────────────────────────────────────────
function _getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function getVaultFolders() {
  var sheet = _getOrCreateSheet(S.VAULT_FOLDERS, ['ID', 'Name', 'FolderID', 'CreatedAt']);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { folders: [] };
  var folders = data.slice(1).map(function(row) {
    return { id: String(row[0]), name: String(row[1]), folderId: String(row[2]), createdAt: String(row[3]) };
  }).filter(function(f) { return f.id && f.folderId; });
  return { folders: folders };
}

function addVaultFolder(params) {
  var sheet = _getOrCreateSheet(S.VAULT_FOLDERS, ['ID', 'Name', 'FolderID', 'CreatedAt']);
  var id = Date.now().toString();
  sheet.appendRow([id, params.name, params.folderId, new Date().toISOString()]);
  return { success: true, id: id };
}

function removeVaultFolder(params) {
  var sheet = _getOrCreateSheet(S.VAULT_FOLDERS, ['ID', 'Name', 'FolderID', 'CreatedAt']);
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(params.id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Folder not found' };
}

// ── VAULT LIKED ───────────────────────────────────────────────
function getLikedImages() {
  var sheet = _getOrCreateSheet(S.VAULT_LIKED, ['ID', 'Title', 'ThumbnailLink', 'LargeSrc', 'Type', 'LikedAt']);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { liked: [] };
  var liked = data.slice(1).map(function(row) {
    return { id: String(row[0]), title: String(row[1]), src: String(row[2]), largeSrc: String(row[3]), type: String(row[4]), likedAt: String(row[5]) };
  }).filter(function(l) { return l.id; });
  return { liked: liked };
}

function toggleLikedImage(params) {
  var sheet = _getOrCreateSheet(S.VAULT_LIKED, ['ID', 'Title', 'ThumbnailLink', 'LargeSrc', 'Type', 'LikedAt']);
  var data = sheet.getDataRange().getValues();
  // Check if already liked
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(params.id)) {
      // Already liked — remove it
      sheet.deleteRow(i + 1);
      return { success: true, action: 'unliked' };
    }
  }
  // Not liked yet — add it
  sheet.appendRow([
    params.id,
    params.title || '',
    params.src || '',
    params.largeSrc || '',
    params.type || 'image',
    new Date().toISOString()
  ]);
  return { success: true, action: 'liked' };
}

// ═══════════════════════════════════════════════════════════════
// APP PASSWORDS  (sheet: APP_PASSWORDS)
// Columns: id | label | hash | updatedAt
// ═══════════════════════════════════════════════════════════════

/** Convert Apps Script digest bytes to lowercase hex string */
function _bytesToHex(bytes) {
  return bytes.map(function(b) {
    return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0');
  }).join('');
}

/** SHA-256 a plaintext string and return hex */
function _sha256(text) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8
  );
  return _bytesToHex(bytes);
}

/**
 * getAppPassword({ id })
 * Returns { found, id, label, hash } for the given lock ID.
 */
function getAppPassword(params) {
  var sheet = _getOrCreateSheet(S.PASSWORDS, ['id', 'label', 'hash', 'updatedAt']);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(params.id)) {
      return { found: true, id: data[i][0], label: data[i][1], hash: data[i][2] };
    }
  }
  return { found: false };
}

/**
 * setAppPassword({ id, label, hash })
 * Upserts the password hash for the given lock ID.
 * The hash should already be SHA-256 of the plaintext (from the client).
 */
function setAppPassword(params) {
  var sheet = _getOrCreateSheet(S.PASSWORDS, ['id', 'label', 'hash', 'updatedAt']);
  var data = sheet.getDataRange().getValues();
  var now = new Date().toISOString();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(params.id)) {
      sheet.getRange(i + 1, 3).setValue(params.hash); // hash column
      sheet.getRange(i + 1, 4).setValue(now);          // updatedAt
      return { success: true, action: 'updated' };
    }
  }
  // New entry
  sheet.appendRow([params.id, params.label || params.id, params.hash, now]);
  return { success: true, action: 'created' };
}

/**
 * initAppPasswords()
 * Creates the APP_PASSWORDS sheet and seeds the vault lock
 * with demo password "demo123" if not already present.
 * Run this ONCE manually from the Apps Script editor.
 */
function initAppPasswords() {
  var sheet = _getOrCreateSheet(S.PASSWORDS, ['id', 'label', 'hash', 'updatedAt']);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === 'vault') {
      return { message: 'Already initialized — vault entry exists.' };
    }
  }
  var demoHash = _sha256('demo123');
  sheet.appendRow(['vault', 'Vault Lock', demoHash, new Date().toISOString()]);
  return { message: 'Done! Demo password is: demo123', hash: demoHash };
}

// ═══════════════════════════════════════════════════════════════
// NEW FEATURES BACKEND
// ═══════════════════════════════════════════════════════════════

// ── Shared Helpers ──
function _getAllFromSheet(sheetName, headers) {
  var sheet = _getOrCreateSheet(sheetName, headers);
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }
  return result;
}

function _upsertToSheet(sheetName, headers, idColName, params) {
  var sheet = _getOrCreateSheet(sheetName, headers);
  var data = sheet.getDataRange().getValues();
  var idColIndex = headers.indexOf(idColName);
  var now = new Date().toISOString();
  params.updatedAt = now;
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(params[idColName])) {
      var rowData = [];
      for (var j = 0; j < headers.length; j++) {
        var val = params[headers[j]];
        rowData.push(val !== undefined ? val : data[i][j]);
      }
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([rowData]);
      return { success: true, action: 'updated' };
    }
  }
  
  var newRow = [];
  for (var j = 0; j < headers.length; j++) {
    newRow.push(params[headers[j]] || '');
  }
  sheet.appendRow(newRow);
  return { success: true, action: 'created' };
}

function _deleteFromSheet(sheetName, headers, idColName, idValue) {
  var sheet = _getOrCreateSheet(sheetName, headers);
  var data = sheet.getDataRange().getValues();
  var idColIndex = headers.indexOf(idColName);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(idValue)) {
      sheet.deleteRow(i + 1);
      return { success: true, action: 'deleted' };
    }
  }
  return { success: false, error: 'Item not found' };
}

// ── 1. Life Map ──
var LIFE_MAP_HEADERS = ['id', 'title', 'description', 'lat', 'lng', 'date', 'emoji', 'color', 'updatedAt'];
function getLifeMap() { return _getAllFromSheet(S.LIFE_MAP, LIFE_MAP_HEADERS); }
function saveLifeMap(params) { return _upsertToSheet(S.LIFE_MAP, LIFE_MAP_HEADERS, 'id', params); }
function deleteLifeMap(params) { return _deleteFromSheet(S.LIFE_MAP, LIFE_MAP_HEADERS, 'id', params.id); }

// ── 2. Time Capsule ──
var TIME_CAPSULE_HEADERS = ['id', 'title', 'message', 'created_at', 'unlock_date', 'is_unlocked', 'updatedAt'];
function getTimeCapsules() { return _getAllFromSheet(S.TIME_CAPSULES, TIME_CAPSULE_HEADERS); }
function saveTimeCapsule(params) { return _upsertToSheet(S.TIME_CAPSULES, TIME_CAPSULE_HEADERS, 'id', params); }
function deleteTimeCapsule(params) { return _deleteFromSheet(S.TIME_CAPSULES, TIME_CAPSULE_HEADERS, 'id', params.id); }

// ── 4. Who Am I ──
var WHO_AM_I_HEADERS = ['section', 'content', 'updated_at'];
function getWhoAmI() { return _getAllFromSheet(S.WHO_AM_I, WHO_AM_I_HEADERS); }
function saveWhoAmI(params) { return _upsertToSheet(S.WHO_AM_I, WHO_AM_I_HEADERS, 'section', params); }

// ── 7. Thought Dump ──
var THOUGHT_DUMP_HEADERS = ['id', 'content', 'tags', 'mood', 'created_at', 'updatedAt'];
function getThoughts(params) { 
  // params could include limit or search query later
  return _getAllFromSheet(S.THOUGHT_DUMP, THOUGHT_DUMP_HEADERS); 
}
function saveThought(params) { return _upsertToSheet(S.THOUGHT_DUMP, THOUGHT_DUMP_HEADERS, 'id', params); }
function deleteThought(params) { return _deleteFromSheet(S.THOUGHT_DUMP, THOUGHT_DUMP_HEADERS, 'id', params.id); }

// ── 9. Streaks ──
var STREAK_HEADERS = ['id', 'name', 'emoji', 'description', 'created_at', 'updatedAt'];
var STREAK_LOG_HEADERS = ['streak_id', 'date'];
function getStreaks() { return _getAllFromSheet(S.STREAKS, STREAK_HEADERS); }
function saveStreak(params) { return _upsertToSheet(S.STREAKS, STREAK_HEADERS, 'id', params); }
function deleteStreak(params) { 
  // Also clean up logs? For now just streak
  return _deleteFromSheet(S.STREAKS, STREAK_HEADERS, 'id', params.id); 
}
function logStreak(params) {
  var sheet = _getOrCreateSheet(S.STREAK_LOGS, STREAK_LOG_HEADERS);
  var data = sheet.getDataRange().getValues();
  var logDate = params.date; // Expecting YYYY-MM-DD
  
  // Check if already logged for this date
  for (var i = 1; i < data.length; i++) {
    var sheetDate = data[i][1];
    if (sheetDate instanceof Date) {
      sheetDate = sheetDate.toISOString().split('T')[0];
    }
    if (String(data[i][0]) === String(params.streak_id) && String(sheetDate).split('T')[0] === logDate) {
       return { success: true, action: 'already_logged' };
    }
  }
  sheet.appendRow([params.streak_id, logDate]);
  return { success: true, action: 'logged' };
}
function getStreakLogs(params) {
  var sheet = _getOrCreateSheet(S.STREAK_LOGS, STREAK_LOG_HEADERS);
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (!params.streak_id || String(data[i][0]) === String(params.streak_id)) {
      var d = data[i][1];
      if (d instanceof Date) d = d.toISOString().split('T')[0];
      result.push({ streak_id: data[i][0], date: String(d).split('T')[0] });
    }
  }
  return result;
}

// ── 10. Reading List ──
var READING_LIST_HEADERS = ['id', 'title', 'author', 'status', 'rating', 'notes', 'started', 'finished', 'cover_url', 'updatedAt'];
function getReadingList() { return _getAllFromSheet(S.READING_LIST, READING_LIST_HEADERS); }
function saveReadingItem(params) { return _upsertToSheet(S.READING_LIST, READING_LIST_HEADERS, 'id', params); }
function deleteReadingItem(params) { return _deleteFromSheet(S.READING_LIST, READING_LIST_HEADERS, 'id', params.id); }

// ── 11. Watchlist ──
var WATCHLIST_HEADERS = ['id', 'title', 'type', 'status', 'rating', 'notes', 'year', 'poster_url', 'tmdb_id', 'updatedAt'];
function getWatchlist() { return _getAllFromSheet(S.WATCHLIST, WATCHLIST_HEADERS); }
function saveWatchItem(params) { return _upsertToSheet(S.WATCHLIST, WATCHLIST_HEADERS, 'id', params); }
function deleteWatchItem(params) { return _deleteFromSheet(S.WATCHLIST, WATCHLIST_HEADERS, 'id', params.id); }

// ── 12. Finance ──
var FINANCE_HEADERS = ['id', 'date', 'type', 'category', 'amount', 'description', 'updatedAt'];
function getFinance(params) { 
  // params could include startDate, endDate
  return _getAllFromSheet(S.FINANCE, FINANCE_HEADERS); 
}
function saveFinanceItem(params) { return _upsertToSheet(S.FINANCE, FINANCE_HEADERS, 'id', params); }
function deleteFinanceItem(params) { return _deleteFromSheet(S.FINANCE, FINANCE_HEADERS, 'id', params.id); }

// ── 15. Bookmarks ──
var BOOKMARK_HEADERS = ['id', 'url', 'title', 'description', 'tags', 'favicon', 'created_at', 'is_read', 'updatedAt'];
function getBookmarks() { return _getAllFromSheet(S.BOOKMARKS, BOOKMARK_HEADERS); }
function saveBookmark(params) { return _upsertToSheet(S.BOOKMARKS, BOOKMARK_HEADERS, 'id', params); }
function deleteBookmark(params) { return _deleteFromSheet(S.BOOKMARKS, BOOKMARK_HEADERS, 'id', params.id); }

// ── 17. Writing ──
var WRITING_HEADERS = ['id', 'title', 'content', 'tags', 'word_count', 'created_at', 'updatedAt'];
function getWritings() { return _getAllFromSheet(S.WRITING, WRITING_HEADERS); }
function saveWriting(params) { return _upsertToSheet(S.WRITING, WRITING_HEADERS, 'id', params); }
function deleteWriting(params) { return _deleteFromSheet(S.WRITING, WRITING_HEADERS, 'id', params.id); }

// ── 19. Yearly Reviews ──
var YEARLY_REVIEW_HEADERS = ['id', 'year', 'section', 'content', 'updatedAt'];
function getYearlyReviews() { return _getAllFromSheet(S.YEARLY_REVIEWS, YEARLY_REVIEW_HEADERS); }
function saveYearlyReview(params) { return _upsertToSheet(S.YEARLY_REVIEWS, YEARLY_REVIEW_HEADERS, 'id', params); }

// ── 20. Twitch Integration ──
function getTwitchAccessToken() {
  if (!_sheet(S.TWITCH_CONFIG)) return null;
  var rows = _sheetToObjects(S.TWITCH_CONFIG);
  if (rows.length === 0) return null;
  
  var clientId = rows[0].client_id;
  var clientSecret = rows[0].client_secret;
  
  if (!clientId || !clientSecret) return null;

  var url = 'https://id.twitch.tv/oauth2/token';
  var payload = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials'
  };

  var options = {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var resText = response.getContentText();
  _log('getTwitchAccessToken_response', { status: response.getResponseCode(), body: resText });
  var data = JSON.parse(resText);
  return data.access_token || null;
}

function getTwitchChannels() {
  if (!_sheet(S.TWITCH_CHANNELS)) return [];
  return _sheetToObjects(S.TWITCH_CHANNELS);
}

function saveTwitchChannel(params) {
  _initTwitch(); // Ensure sheet exists before operation
  if (_findRow(S.TWITCH_CHANNELS, 'id', params.id) > 0) return { success: true, exists: true };
  params.added_at = _now();
  _appendRow(S.TWITCH_CHANNELS, params);
  return { success: true };
}

function removeTwitchChannel(params) {
  if (!_sheet(S.TWITCH_CHANNELS)) return { success: true };
  var row = _findRow(S.TWITCH_CHANNELS, 'id', params.id);
  if (row > 0) {
    _ss().getSheetByName(S.TWITCH_CHANNELS).deleteRow(row);
  }
  return { success: true };
}

function getTwitchData() {
  initTwitchSync();
  var token = getTwitchAccessToken();
  if (!token) return { error: 'Twitch credentials missing in Settings.' };

  var dismissedIds = getTwitchDismissedIds();

  var channels = getTwitchChannels();
  if (channels.length === 0) return { streams: [], videos: [] };

  var ids = channels.map(function(c) { return c.id; });
  // Get Live Streams
  var streamsUrl = 'https://api.twitch.tv/helix/streams?user_id=' + ids.join('&user_id=');
  var twitchCfg = _sheetToObjects(S.TWITCH_CONFIG)[0] || {};
  var options = {
    headers: {
      'Client-ID': twitchCfg.client_id,
      'Authorization': 'Bearer ' + token
    },
    muteHttpExceptions: true
  };
  var streamsRes = UrlFetchApp.fetch(streamsUrl, options);
  var streamsData = [];
  try {
    var resText = streamsRes.getContentText();
    var resJson = JSON.parse(resText);
    if (streamsRes.getResponseCode() !== 200) return { error: 'Twitch API Error: ' + (resJson.message || resText) };
    streamsData = resJson.data || [];
  } catch (e) {
    return { error: 'Twitch response parse error' };
  }

  // Get Recent Videos for each channel
  var allVideos = [];
  channels.forEach(function(chan) {
    var videosUrl = 'https://api.twitch.tv/helix/videos?user_id=' + chan.id + '&first=3';
    try {
      var res = UrlFetchApp.fetch(videosUrl, options);
      var vData = JSON.parse(res.getContentText()).data || [];
      allVideos = allVideos.concat(vData);
    } catch (e) {}
  });

  return {
    streams: streamsData,
    videos: allVideos,
    dismissed: dismissedIds
  };
}

function searchTwitchChannel(params) {
  var token = getTwitchAccessToken();
  if (!token) return { error: 'Twitch credentials missing.' };
  
  var twitchCfg = _sheetToObjects(S.TWITCH_CONFIG)[0] || {};
  var url = 'https://api.twitch.tv/helix/search/channels?query=' + encodeURIComponent(params.query) + '&first=1';
  var options = {
    headers: {
      'Client-ID': twitchCfg.client_id,
      'Authorization': 'Bearer ' + token
    },
    muteHttpExceptions: true
  };
  var res = UrlFetchApp.fetch(url, options);
  var resText = res.getContentText();
  _log('searchTwitchChannel_response', { query: params.query, status: res.getResponseCode(), body: resText });
  try {
    var resJson = JSON.parse(resText);
    if (res.getResponseCode() !== 200) return { error: 'Twitch API Error: ' + (resJson.message || resText) };
    var data = resJson.data || [];
    return data.length > 0 ? data[0] : null;
  } catch (e) {
    return { error: 'Twitch search parse error' };
  }
}
function _initTwitch() {
  var ss = _ss();
  if (!ss.getSheetByName(S.TWITCH_CHANNELS)) {
    var sheet = ss.insertSheet(S.TWITCH_CHANNELS);
    sheet.appendRow(['id', 'login', 'display_name', 'profile_image_url', 'added_at']);
  }
}

function initTwitchSync() {
  var ss = _ss();
  var defs = {};
  defs[S.SAVED_TWITCH_VIDEOS] = ['video_id', 'title', 'user_name', 'user_id', 'thumbnail_url', 'created_at', 'type', 'url', 'duration', 'saved_at'];
  defs[S.TWITCH_DISMISSED] = ['item_id', 'dismissed_at'];

  Object.keys(defs).forEach(function(name) {
    if (!ss.getSheetByName(name)) {
      var sheet = ss.insertSheet(name);
      sheet.appendRow(defs[name]);
      sheet.getRange(1, 1, 1, defs[name].length).setFontWeight('bold');
    }
  });
}

function getSavedTwitchVideos() {
  initTwitchSync();
  return _sheetToObjects(S.SAVED_TWITCH_VIDEOS).sort(function(a, b) {
    return String(b.saved_at).localeCompare(String(a.saved_at));
  });
}

function saveTwitchVideo(params) {
  initTwitchSync();
  // id could be stream_id or video_id
  if (_findRow(S.SAVED_TWITCH_VIDEOS, 'video_id', params.video_id) > 0) return { success: true, exists: true };
  params.saved_at = _now();
  _appendRow(S.SAVED_TWITCH_VIDEOS, params);
  return { success: true };
}

function saveTwitchDismissed(params) {
  initTwitchSync();
  if (_findRow(S.TWITCH_DISMISSED, 'item_id', params.item_id) > 0) return { success: true, exists: true };
  _appendRow(S.TWITCH_DISMISSED, {
    item_id: params.item_id,
    dismissed_at: _now()
  });
  return { success: true, item_id: params.item_id };
}

function getTwitchDismissedIds() {
  initTwitchSync();
  return _sheetToObjects(S.TWITCH_DISMISSED).map(function(r) { return r.item_id; });
}

// ── VAULT FACE RECOGNITION ────────────────────────────────────
function getFaceGroups(params) {
  var folderId = params.folderId;
  if (!folderId) return { groups: [] };
  
  var sheet = _getOrCreateSheet(S.VAULT_FACES, ['FolderID', 'GroupID', 'Label', 'CoverImageID', 'MemberImageIDs', 'CreatedAt']);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { groups: [] };
  
  var groups = data.slice(1)
    .filter(function(row) { return String(row[0]) === String(folderId); })
    .map(function(row) {
      return {
        folderId: String(row[0]),
        groupId: String(row[1]),
        label: String(row[2]),
        coverImageId: String(row[3]),
        memberImageIds: String(row[4]).split(','),
        createdAt: String(row[5])
      };
    });
    
  return { groups: groups };
}

function saveFaceGroups(params) {
  var folderId = params.folderId;
  var groups = params.groups; // Array of group objects
  if (!folderId || !groups) throw new Error('folderId and groups required');
  
  var sheet = _getOrCreateSheet(S.VAULT_FACES, ['FolderID', 'GroupID', 'Label', 'CoverImageID', 'MemberImageIDs', 'CreatedAt']);
  var data = sheet.getDataRange().getValues();
  
  // Remove all existing groups for this folder to overwrite them
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(folderId)) {
      sheet.deleteRow(i + 1);
    }
  }
  
  // Append new group data
  groups.forEach(function(g) {
    sheet.appendRow([
      folderId,
      g.groupId,
      g.label || '(unknown)',
      g.coverImageId || '',
      (g.memberImageIds || []).join(','),
      new Date().toISOString()
    ]);
  });
  
  return { success: true, count: groups.length };
}

