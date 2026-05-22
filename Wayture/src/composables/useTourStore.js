import { computed, ref, watch } from 'vue';
import { useAuth } from './useAuth';
const apiBase = import.meta.env.VITE_API_BASE_URL || '';
const mapImageUrl = `${apiBase}/static/map.jpg`;
const userSettingsStorageKeyPrefix = 'wayture:userSettings';
const allTourListStorageKeyPrefix = 'wayture:allTourList';
const auth = useAuth();
const currentUsername = computed(() => auth.account.value?.name || auth.account.value?.username || 'guest');
const userSettingsStorageKey = computed(() => `${userSettingsStorageKeyPrefix}:${encodeURIComponent(currentUsername.value)}`);
const allTourListStorageKey = computed(() => `${allTourListStorageKeyPrefix}:${encodeURIComponent(currentUsername.value)}`);
const points = ref([]);
const pointsLoading = ref(false);
let pointsLoadPromise = null;
const activeTab = ref('map');
const selectedIds = ref([]);
function loadUserSettingsFromStorage() {
    try {
        const raw = localStorage.getItem(userSettingsStorageKey.value);
        if (!raw) {
            return { nickname: '', tourStyle: '' };
        }
        const parsed = JSON.parse(raw);
        return {
            nickname: parsed.nickname || '',
            tourStyle: parsed.tourStyle || '',
        };
    }
    catch (e) {
        console.warn('Failed to load user settings from localStorage:', e);
        return { nickname: '', tourStyle: '' };
    }
}
function saveUserSettingsToStorage(settings) {
    try {
        localStorage.setItem(userSettingsStorageKey.value, JSON.stringify(settings));
    }
    catch (e) {
        console.warn('Failed to save user settings to localStorage:', e);
    }
}
function loadAllTourListFromStorage() {
    try {
        const raw = localStorage.getItem(allTourListStorageKey.value);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (e) {
        console.warn('Failed to load allTourList from localStorage:', e);
        return [];
    }
}
function saveAllTourListToStorage(records) {
    try {
        localStorage.setItem(allTourListStorageKey.value, JSON.stringify(records));
    }
    catch (e) {
        console.warn('Failed to save allTourList to localStorage:', e);
    }
}
// 用户设置
const userSettings = ref(loadUserSettingsFromStorage());
const allTourList = ref(loadAllTourListFromStorage());
const activeTourRecordId = ref(allTourList.value[0]?.id ?? null);
watch(currentUsername, () => {
    userSettings.value = loadUserSettingsFromStorage();
    allTourList.value = loadAllTourListFromStorage();
    activeTourRecordId.value = allTourList.value[0]?.id ?? null;
});
const selectedPoints = computed(() => selectedIds.value
    .map((id) => points.value.find((item) => item.id === id))
    .filter((item) => !!item));
function normalizeImageUrl(url) {
    if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
}
function normalizeTourPoints(data) {
    return data.map((item, index) => ({
        id: item.id ?? index + 1,
        location: item.location ?? [0, 0],
        name: item.name ?? '',
        description: item.description ?? '',
        field: item.field ?? '',
        cost: item.cost ?? '',
        images: (item.images ?? []).map((img) => normalizeImageUrl(img)),
        position: item.position ?? { top: '0%', left: '0%' },
        color: item.color ?? '#64748B',
    }));
}
async function loadTourPoints() {
    if (pointsLoadPromise)
        return pointsLoadPromise;
    pointsLoadPromise = (async () => {
        pointsLoading.value = true;
        try {
            const resp = await fetch(`${apiBase}/api/map-meta`);
            if (!resp.ok)
                throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            points.value = normalizeTourPoints(data);
        }
        catch (e) {
            console.warn('Failed to load tour points from API, using defaults:', e);
        }
        finally {
            pointsLoading.value = false;
        }
    })();
    return pointsLoadPromise;
}
async function planRoute() {
    const selected = selectedPoints.value;
    if (selected.length === 0)
        return false;
    try {
        const resp = await fetch(`${apiBase}/api/plan-route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUsername.value,
                path_info: selected,
            }),
        });
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const plannedRoute = Array.isArray(data.route) ? data.route : [];
        const routeSummary = data.summary || '';
        const originalSelectedIds = selected.map((item) => item.id);
        let recordSelectedIds = originalSelectedIds;
        if (plannedRoute.length > 0) {
            const orderedIds = plannedRoute
                .slice()
                .sort((a, b) => a.order - b.order)
                .map(r => r.attraction?.id)
                .filter((id) => id != null);
            if (orderedIds.length > 0) {
                selectedIds.value = orderedIds;
                recordSelectedIds = orderedIds;
            }
        }
        const record = {
            id: `tour-${Date.now()}`,
            title: `${userSettings.value.nickname || currentUsername.value || 'Wayture'} 的路线 ${allTourList.value.length + 1}`,
            createdAt: new Date().toISOString(),
            username: currentUsername.value,
            selectedIds: recordSelectedIds,
            routePlan: plannedRoute,
            routeSummary,
            postcardStatus: 'idle',
        };
        addTourRecord(record);
        return true;
    }
    catch (e) {
        console.warn('Failed to plan route, keeping original order:', e);
        return false;
    }
}
function applyTourRecord(record) {
    activeTourRecordId.value = record.id;
    selectedIds.value = [...record.selectedIds];
}
function addTourRecord(record) {
    allTourList.value = [record, ...allTourList.value];
    saveAllTourListToStorage(allTourList.value);
    applyTourRecord(record);
}
function updateTourRecord(id, patch) {
    allTourList.value = allTourList.value.map((record) => record.id === id ? { ...record, ...patch } : record);
    saveAllTourListToStorage(allTourList.value);
    if (activeTourRecordId.value === id) {
        const updated = allTourList.value.find((record) => record.id === id);
        if (updated) {
            applyTourRecord(updated);
        }
    }
}
function setActiveTourRecord(id) {
    const record = allTourList.value.find((item) => item.id === id);
    if (!record)
        return false;
    applyTourRecord(record);
    return true;
}
function loadLatestTourRecord() {
    const latest = allTourList.value[0];
    if (!latest)
        return false;
    applyTourRecord(latest);
    return true;
}
function setTab(tab) {
    activeTab.value = tab;
}
function addPoint(id) {
    if (!selectedIds.value.includes(id)) {
        selectedIds.value.push(id);
    }
}
function removePoint(id) {
    selectedIds.value = selectedIds.value.filter((item) => item !== id);
}
function setSelectedIds(ids) {
    selectedIds.value = [...ids];
}
function setUserSettings(settings) {
    userSettings.value = { ...settings };
    saveUserSettingsToStorage(userSettings.value);
}
function hasUserSettings() {
    return !!(userSettings.value.nickname && userSettings.value.tourStyle);
}
export function useTourStore() {
    return {
        apiBase,
        mapImageUrl,
        currentUsername,
        points,
        pointsLoading,
        allTourList,
        activeTourRecordId,
        activeTab,
        selectedIds,
        selectedPoints,
        userSettings,
        normalizeImageUrl,
        loadTourPoints,
        planRoute,
        updateTourRecord,
        setActiveTourRecord,
        loadLatestTourRecord,
        setTab,
        addPoint,
        removePoint,
        setSelectedIds,
        setUserSettings,
        hasUserSettings,
    };
}
//# sourceMappingURL=useTourStore.js.map