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
        unsubscribe: null
    };

    function registerKey(key) {
        if (typeof key === 'string') {
            state.syncedKeys.add(key);
        }
    }

    function queueWrite(key, value) {
        if (key == null) {
            return;
        }
        state.pendingWrites[key] = value;
        registerKey(key);
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
        const hasUpdates = state.pendingClear || Object.keys(state.pendingWrites).length > 0;
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
            state.cache[key] = value;
            queueWrite(key, value);
            return original.setItem.apply(this, arguments);
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
            scheduleFlush();
            return original.clear.apply(this, arguments);
        };
    }

    async function initDocReference(uid) {
        const docRef = db.collection('players').doc(uid);
        state.docRef = docRef;

        const snapshot = await docRef.get();
        if (snapshot.exists) {
            hydrateFromRemote(snapshot.data().data || {});
        } else {
            const bootstrap = exportLocal();
            docRef.set({
                data: bootstrap,
                meta: {
                    createdAt: FieldValue.serverTimestamp(),
                    version: 1,
                    lastClientTs: Date.now()
                },
                profile: {
                    username: bootstrap.username || '',
                    publicUserId: bootstrap.uniqueUserId || null
                },
                buildingsSummary: {
                    totalOwned: 0,
                    upgraded: []
                }
            }).catch((err) => console.error('[cloud-storage] Initial document write failed', err));
        }

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
        });
    }

    async function initFirebase() {
        try {
            const credential = await auth.signInAnonymously();
            const uid = credential.user.uid;
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

