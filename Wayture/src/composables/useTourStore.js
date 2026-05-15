import { computed, ref } from 'vue';
import { useAuth } from './useAuth';
const apiBase = import.meta.env.VITE_API_BASE_URL || '';
const mapImageUrl = `${apiBase}/static/map.png`;
const userSettingsStorageKey = 'wayture:userSettings';
const auth = useAuth();
const currentUsername = computed(() => auth.account.value?.name || auth.account.value?.username || 'guest');
const points = ref([]);
const pointsLoading = ref(false);
let pointsLoadPromise = null;
const activeTab = ref('map');
const selectedIds = ref([]);
const highlightId = ref(null);
function loadUserSettingsFromStorage() {
    try {
        const raw = localStorage.getItem(userSettingsStorageKey);
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
        localStorage.setItem(userSettingsStorageKey, JSON.stringify(settings));
    }
    catch (e) {
        console.warn('Failed to save user settings to localStorage:', e);
    }
}
// 用户设置
const userSettings = ref(loadUserSettingsFromStorage());
// 路线规划
const routePlan = ref([]);
const routeLoading = ref(false);
const gallerySessions = ref([]);
const selectedPoints = computed(() => points.value.filter((item) => selectedIds.value.includes(item.id)));
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
        return;
    routeLoading.value = true;
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
        routePlan.value = data.route || [];
        if (routePlan.value.length > 0) {
            const orderedIds = routePlan.value
                .sort((a, b) => a.order - b.order)
                .map(r => r.attraction?.id)
                .filter((id) => id != null);
            if (orderedIds.length > 0) {
                selectedIds.value = orderedIds;
            }
        }
    }
    catch (e) {
        console.warn('Failed to plan route, keeping original order:', e);
        routePlan.value = [];
    }
    finally {
        routeLoading.value = false;
    }
}
function addGallerySession(session) {
    gallerySessions.value.unshift(session);
}
async function loadGallerySessions() {
    try {
        const resp = await fetch(`${apiBase}/api/memories/${encodeURIComponent(currentUsername.value)}`);
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        gallerySessions.value = await resp.json();
    }
    catch (e) {
        console.warn('Failed to load gallery sessions:', e);
    }
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
function setHighlight(id) {
    highlightId.value = id;
}
function clearSelection() {
    selectedIds.value = [];
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
        routePlan,
        routeLoading,
        gallerySessions,
        activeTab,
        selectedIds,
        selectedPoints,
        highlightId,
        userSettings,
        normalizeImageUrl,
        loadTourPoints,
        planRoute,
        addGallerySession,
        loadGallerySessions,
        setTab,
        addPoint,
        removePoint,
        setHighlight,
        clearSelection,
        setUserSettings,
        hasUserSettings,
    };
}
//# sourceMappingURL=useTourStore.js.map