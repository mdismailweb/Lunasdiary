import { getVaultMedia, getVaultFolders } from './api';

/**
 * Concurrency Limiter for parallel fetches
 */
async function limitConcurrency(tasks, limit, onProgress) {
    const results = [];
    const executing = new Set();
    let completed = 0;

    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        executing.add(p);

        const clean = () => {
            executing.delete(p);
            completed++;
            onProgress(completed, tasks.length);
        };
        p.then(clean).catch(clean);

        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }
    return Promise.all(results);
}

/**
 * Preloader Service - Upgraded with Shuffle & Manual Logic
 */
export const Preloader = {
    async start(onProgress) {
        try {
            console.log('[Preloader] Starting manual sync...');
            
            // 1. Get folders
            const foldersRes = await getVaultFolders();
            const folders = foldersRes.data?.folders || foldersRes.folders || [];
            if (folders.length === 0) return;

            // 2. Prioritize "newdisk"
            let targetFolder = folders.find(f => f.name?.toLowerCase() === 'newdisk') ||
                               folders.find(f => f.name?.toLowerCase().includes('newdisk')) ||
                               folders[0];

            console.log(`[Preloader] Shuffling folder: ${targetFolder.name}`);

            // 3. Fetch a larger pool of items to shuffle from (~1000 items)
            let pool = [];
            let nextToken = null;
            for (let i = 0; i < 10; i++) {
                const res = await getVaultMedia(targetFolder.folderId, nextToken);
                const items = res?.data?.items || res?.items || (Array.isArray(res) ? res : []);
                pool = [...pool, ...items];
                nextToken = res?.data?.continuationToken || res?.continuationToken || null;
                if (!nextToken || pool.length >= 1000) break;
            }

            console.log(`[Preloader] Pool size: ${pool.length}. Picking 500 random items...`);

            // 4. Fisher-Yates Shuffle
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }

            const targetMedia = pool.slice(0, 500);

            // 5. Save the list for Instant Loading
            localStorage.setItem(`luna_vault_cache_${targetFolder.folderId}`, JSON.stringify({
                items: targetMedia,
                updatedAt: Date.now()
            }));

            // 6. Queue Parallel Fetches
            const tasks = targetMedia.map((item, idx) => async () => {
                const url = `https://drive.google.com/thumbnail?id=${item.id || item.googleId}&sz=w400`;
                try {
                    await fetch(url, { mode: 'no-cors' });
                } catch (e) { console.error(`[Preloader] Item ${idx} skip:`, e); }
            });

            await limitConcurrency(tasks, 6, onProgress);
            console.log(`[Preloader] Sync Complete! ${targetMedia.length} new items cached.`);
        } catch (e) {
            console.error('[Preloader] Engine Error:', e);
        }
    }
};

