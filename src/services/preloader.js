import { getVaultMedia, getVaultFolders, getLikedImages } from './api';

/**
 * Concurrency Limiter for parallel fetches
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
            onProgress(completed, tasks.length, tasks.status); 
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
            if (folders.length === 0) {
                console.warn('[Preloader] No folders found to sync.');
                onProgress(0, 0, 'No folders found'); 
                return;
            }

            // 2. Discovery Phase: Loop through folders until we find something
            let pool = [];
            let targetFolder = null;

            // Prioritize "newdisk" but be ready to fallback
            const sortedFolders = [...folders].sort((a, b) => {
                const aIsNew = a.name?.toLowerCase().includes('newdisk');
                const bIsNew = b.name?.toLowerCase().includes('newdisk');
                return bIsNew - aIsNew; 
            });

            for (const folder of sortedFolders) {
                console.log(`[Preloader] Discovery: Scanning ${folder.name}...`);
                let nextToken = null;
                let folderPool = [];
                
                // Fetch up to 3 pages (~300 items) per folder for discovery
                for (let i = 0; i < 3; i++) {
                    const res = await getVaultMedia(folder.folderId, nextToken);
                    const contents = res?.data?.items || res?.items || [];
                    folderPool = [...folderPool, ...contents];
                    nextToken = res?.data?.continuationToken || res?.continuationToken || null;
                    if (!nextToken || folderPool.length >= 300) break;
                }

                if (folderPool.length > 0) {
                    pool = folderPool;
                    targetFolder = folder;
                    console.log(`[Preloader] Target Found! Scanning ${folder.name} (${pool.length} items)`);
                    break; 
                }
            }

            // 3. Get Liked Images
            const likedRes = await getLikedImages();
            const likedItems = likedRes?.data?.liked || likedRes?.liked || [];
            console.log(`[Preloader] Found ${likedItems.length} liked images.`);
            
            if (pool.length === 0 && likedItems.length === 0) {
                console.warn('[Preloader] No content found in any folder.');
                onProgress(0, 0);
                return;
            }

            // 4. Shuffle & Pick
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }

            const targetMedia = pool.slice(0, 500);
            const masterPool = [...likedItems, ...targetMedia];

            // 5. Save the lists for Instant Loading
            if (targetFolder) {
                localStorage.setItem(`luna_vault_cache_${targetFolder.folderId}`, JSON.stringify({
                    items: targetMedia,
                    updatedAt: Date.now()
                }));
            }
            
            localStorage.setItem('luna_vault_liked_cache', JSON.stringify({
                items: likedItems,
                updatedAt: Date.now()
            }));

            // 6. Queue Parallel Fetches
            const tasks = masterPool.map((item, idx) => async () => {
                const id = item.id || item.googleId;
                if (!id) return;
                
                // Add a small 200ms delay to prevent 429 rate limits
                await sleep(200);

                const url = `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
                try {
                    await fetch(url, { mode: 'no-cors' });
                } catch (e) { console.error(`[Preloader] Item ${idx} skip:`, e); }
            });

            // Tag tasks with status for the UI
            tasks.status = targetFolder ? targetFolder.name : 'Liked Images';

            if (tasks.length === 0) {
                onProgress(0, 0, 'Nothing to sync');
            } else {
                await limitConcurrency(tasks, 3, onProgress); // Reduced from 6 to 3 for stability
            }

            console.log(`[Preloader] Sync Complete! ${masterPool.length} items cached.`);
        } catch (e) {
            console.error('[Preloader] Engine Error:', e);
            onProgress(0, 0); // Reset UI on error
        }
    }
};

