(function initCloudStorage(global) {
    'use strict';

    const firebaseConfig = global.firebaseConfig;
    if (!firebaseConfig) {
        console.warn('[cloud-storage] firebaseConfig not found. Local storage will be used only.');
        return;
    }

    if (!global.firebase) {
        console.warn('[cloud-storage] Firebase SDK not loaded. Please ensure firebase-app-compat/auth/firestore scripts are included.');
        return;
    }

    const app = global.firebase.apps && global.firebase.apps.length
        ? global.firebase.app()
        : global.firebase.initializeApp(firebaseConfig);
    const auth = global.firebase.auth();
    const db = global.firebase.firestore();
    const FieldValue = global.firebase.firestore.FieldValue;

    const original = {
        setItem: Storage.prototype.setItem,
        getItem: Storage.prototype.getItem,
        removeItem: Storage.prototype.removeItem,
        clear: Storage.prototype.clear,
        key: Storage.prototype.key
    };

    const state = {
        cache: {},
        pendingWrites: {},
        pendingClear: false,
        writeTimer: null,
        docRef: null,
        syncedKeys: new Set(),
        unsubscribe: null,
        derivedUpdates: {},
        derivedSignatures: {}
    };

    const BUILDING_KEYS = ['library', 'factory', 'storage', 'print'];
    const BUILDING_LABELS = {
        library: 'Библиотека',
        factory: 'Завод',
        storage: 'Почта',
        print: 'Типография'
    };

    function registerKey(key) {
        if (typeof key === 'string') {
            state.syncedKeys.add(key);
        }
    }

    function stringifyValue(value) {
        if (value === undefined || value === null) {
            return value;
        }
        return typeof value === 'string' ? value : String(value);
    }

    function isObject(value) {
        return Object.prototype.toString.call(value) === '[object Object]';
    }

    function computeBuildingsSummary(rawValue) {
        let parsed = {};
        if (rawValue) {
            try {
                parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
            } catch (error) {
                console.warn('[cloud-storage] Cannot parse buildingsData', error);
                parsed = {};
            }
        }

        const summary = {
            label: '0/4',
            totalOwned: 0,
            owned: [],
            upgraded: [],
            status: {},
            updatedAt: Date.now()
        };

        BUILDING_KEYS.forEach((key) => {
            const data = isObject(parsed[key]) ? parsed[key] : null;
            if (data && data.isOwned) {
                summary.totalOwned += 1;
                summary.owned.push(key);
                const level = parseInt(data.level, 10) || 1;
                const hasUpgrade = level > 1 || Boolean(data.upgradeLevel) || Boolean(data.hasUpgrade);
                summary.status[key] = hasUpgrade ? 'upgraded' : 'owned';
                if (hasUpgrade) {
                    summary.upgraded.push({
                        id: key,
                        name: data.name || BUILDING_LABELS[key] || key,
                        level
                    });
                }
            } else {
                summary.status[key] = 'not_owned';
            }
        });

        summary.label = `${summary.totalOwned}/${BUILDING_KEYS.length}`;
        return summary;
    }

    function stageDerivedUpdate(path, value) {
        const signature = JSON.stringify(value);
        if (state.derivedSignatures[path] === signature) {
            return;
        }
        state.derivedSignatures[path] = signature;
        state.derivedUpdates[path] = value;
        scheduleFlush();
    }

    function handleDerivedKey(key, value) {
        switch (key) {
        case 'buildingsData': {
            const summary = computeBuildingsSummary(value);
            stageDerivedUpdate('buildingsSummary', summary);
            break;
        }
        case 'profile.username': {
            stageDerivedUpdate('profile.username', value || '');
            break;
        }
        case 'uniqueUserId': {
            const normalized = value ? parseInt(value, 10) || value : null;
            stageDerivedUpdate('profile.publicUserId', normalized);
            break;
        }
        default:
            break;
        }
    }

    function primeDerivedFromRemote(docData) {
        if (!docData) {
            return;
        }
        if (docData.buildingsSummary) {
            state.derivedSignatures.buildingsSummary = JSON.stringify(docData.buildingsSummary);
        }
        if (docData.profile) {
            if (Object.prototype.hasOwnProperty.call(docData.profile, 'username')) {
                state.derivedSignatures['profile.username'] = JSON.stringify(docData.profile.username || '');
            }
            if (Object.prototype.hasOwnProperty.call(docData.profile, 'publicUserId')) {
                state.derivedSignatures['profile.publicUserId'] = JSON.stringify(docData.profile.publicUserId || null);
            }
        }
    }

    function ensureDerivedFromCache() {
        if (!state.derivedSignatures.buildingsSummary) {
            handleDerivedKey('buildingsData', state.cache.buildingsData || null);
        }
        if (!state.derivedSignatures['profile.username'] && state.cache['profile.username']) {
            handleDerivedKey('profile.username', state.cache['profile.username']);
        }
        if (!state.derivedSignatures['profile.publicUserId'] && state.cache.uniqueUserId) {
            handleDerivedKey('uniqueUserId', state.cache.uniqueUserId);
        }
    }

    function queueWrite(key, value) {
        if (key == null) {
            return;
        }
        state.pendingWrites[key] = value;
        registerKey(key);
        handleDerivedKey(key, value);
        scheduleFlush();
    }

    function scheduleFlush() {
        if (state.writeTimer) {
            return;
        }
        state.writeTimer = setTimeout(flushWrites, 400);
    }

    async function flushWrites() {
        state.writeTimer = null;
        const hasUpdates = state.pendingClear
            || Object.keys(state.pendingWrites).length > 0
            || Object.keys(state.derivedUpdates).length > 0;
        if (!hasUpdates) {
            return;
        }
        await readyPromise;
        if (!state.docRef) {
            return;
        }

        const payload = { meta: { updatedAt: FieldValue.serverTimestamp(), lastClientTs: Date.now() } };
        if (state.pendingClear) {
            state.syncedKeys.forEach((key) => {
                payload[`data.${key}`] = FieldValue.delete();
            });
            state.pendingClear = false;
        }

        Object.entries(state.pendingWrites).forEach(([key, value]) => {
            payload[`data.${key}`] = value === null ? FieldValue.delete() : value;
        });
        state.pendingWrites = {};

        Object.entries(state.derivedUpdates).forEach(([path, value]) => {
            payload[path] = value;
        });
        state.derivedUpdates = {};

        state.docRef.set(payload, { merge: true }).catch((err) => {
            console.error('[cloud-storage] Failed to write data', err);
        });
    }

    function hydrateFromRemote(remoteData) {
        if (!remoteData) {
            return;
        }
        Object.entries(remoteData).forEach(([key, value]) => {
            registerKey(key);
            state.cache[key] = value;
            original.setItem.call(global.localStorage, key, value);
        });
    }

    function exportLocal() {
        const snapshot = {};
        for (let i = 0; i < global.localStorage.length; i += 1) {
            const key = original.key.call(global.localStorage, i);
            if (key == null) {
                continue;
            }
            const value = original.getItem.call(global.localStorage, key);
            snapshot[key] = value;
            registerKey(key);
        }
        return snapshot;
    }

    function wrapStoragePrototypes() {
        if (Storage.prototype.__cloudWrapped) {
            return;
        }
        Object.defineProperty(Storage.prototype, '__cloudWrapped', {
            value: true,
            writable: false,
            enumerable: false,
            configurable: false
        });

        Storage.prototype.setItem = function patchedSetItem(key, value) {
            const normalized = stringifyValue(value);
            state.cache[key] = normalized;
            queueWrite(key, normalized);
            return original.setItem.call(this, key, normalized);
        };

        Storage.prototype.getItem = function patchedGetItem(key) {
            if (Object.prototype.hasOwnProperty.call(state.cache, key)) {
                return state.cache[key];
            }
            const value = original.getItem.apply(this, arguments);
            state.cache[key] = value;
            registerKey(key);
            return value;
        };

        Storage.prototype.removeItem = function patchedRemoveItem(key) {
            delete state.cache[key];
            queueWrite(key, null);
            return original.removeItem.apply(this, arguments);
        };

        Storage.prototype.clear = function patchedClear() {
            state.pendingClear = true;
            state.cache = {};
            state.pendingWrites = {};
            state.syncedKeys.forEach((key) => {
                state.pendingWrites[key] = null;
            });
            state.syncedKeys.clear();
            handleDerivedKey('buildingsData', null);
            handleDerivedKey('profile.username', '');
            handleDerivedKey('uniqueUserId', null);
            scheduleFlush();
            return original.clear.apply(this, arguments);
        };
    }

    async function initDocReference(uid) {
        const docRef = db.collection('players').doc(uid);
        state.docRef = docRef;

        const snapshot = await docRef.get();
        if (snapshot.exists) {
            const docData = snapshot.data() || {};
            hydrateFromRemote(docData.data || {});
            primeDerivedFromRemote(docData);
        } else {
            const bootstrap = exportLocal();
            const summary = computeBuildingsSummary(bootstrap.buildingsData || null);
            const username = bootstrap['profile.username'] || '';
            const publicUserId = bootstrap.uniqueUserId ? parseInt(bootstrap.uniqueUserId, 10) || bootstrap.uniqueUserId : null;
            docRef.set({
                data: bootstrap,
                meta: {
                    createdAt: FieldValue.serverTimestamp(),
                    version: 1,
                    lastClientTs: Date.now()
                },
                profile: {
                    username,
                    publicUserId
                },
                buildingsSummary: summary
            }).catch((err) => console.error('[cloud-storage] Initial document write failed', err));
            state.derivedSignatures.buildingsSummary = JSON.stringify(summary);
            state.derivedSignatures['profile.username'] = JSON.stringify(username);
            state.derivedSignatures['profile.publicUserId'] = JSON.stringify(publicUserId);
        }
        ensureDerivedFromCache();

        if (state.unsubscribe) {
            state.unsubscribe();
        }
        state.unsubscribe = docRef.onSnapshot((snap) => {
            const remote = snap.data();
            if (!remote || !remote.data) {
                return;
            }
            Object.entries(remote.data).forEach(([key, value]) => {
                if (state.cache[key] === value) {
                    return;
                }
                state.cache[key] = value;
                registerKey(key);
                original.setItem.call(global.localStorage, key, value);
            });
            primeDerivedFromRemote(remote);
            ensureDerivedFromCache();
        });
    }

    async function initFirebase() {
        try {
            const credential = await auth.signInAnonymously();
            const uid = credential.user.uid;
            global.cloudStorageUid = uid;
            await initDocReference(uid);
            document.dispatchEvent(new CustomEvent('cloud-storage-ready', { detail: { uid } }));
            return uid;
        } catch (error) {
            console.error('[cloud-storage] Firebase initialization failed', error);
            throw error;
        }
    }

    wrapStoragePrototypes();
    const readyPromise = initFirebase();
    global.cloudStorage = {
        ready: readyPromise,
        flush: flushWrites,
        exportLocalState: exportLocal,
        getCache: () => ({ ...state.cache })
    };
})(window);

