import { computed, ref, watch } from 'vue';
import { TourPointData } from '../data/tourPoints';
import { useAuth } from './useAuth';

type TourPoint = TourPointData;
type UserSettings = {
  nickname: string;
  tourStyle: string;
};

const apiBase = import.meta.env.VITE_API_BASE_URL || '';
const mapImageUrl = `${apiBase}/static/map.jpg`;
const userSettingsStorageKeyPrefix = 'wayture:userSettings';

const auth = useAuth();
const currentUsername = computed(() => auth.account.value?.name || auth.account.value?.username || 'guest');
const userSettingsStorageKey = computed(() => `${userSettingsStorageKeyPrefix}:${encodeURIComponent(currentUsername.value)}`);

const points = ref<TourPoint[]>([]);
const pointsLoading = ref(false);
let pointsLoadPromise: Promise<void> | null = null;

const activeTab = ref<'map' | 'list'>('map');
const selectedIds = ref<number[]>([]);
const highlightId = ref<number | null>(null);

function loadUserSettingsFromStorage(): UserSettings {
  try {
    const raw = localStorage.getItem(userSettingsStorageKey.value);
    if (!raw) {
      return { nickname: '', tourStyle: '' };
    }
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      nickname: parsed.nickname || '',
      tourStyle: parsed.tourStyle || '',
    };
  } catch (e) {
    console.warn('Failed to load user settings from localStorage:', e);
    return { nickname: '', tourStyle: '' };
  }
}

function saveUserSettingsToStorage(settings: UserSettings) {
  try {
    localStorage.setItem(userSettingsStorageKey.value, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save user settings to localStorage:', e);
  }
}

// 用户设置
const userSettings = ref<UserSettings>(loadUserSettingsFromStorage());

watch(currentUsername, () => {
  userSettings.value = loadUserSettingsFromStorage();
});

// 路线规划
const routePlan = ref<Array<{ order: number; attraction: any; tips: string }>>([]);
const routeSummary = ref('');
const routeLoading = ref(false);

// 回忆图册
export interface GalleryImage {
  index: number;
  generated_url: string;
  description: string;
  source_photo?: any;
}

export interface GallerySession {
  id: string;
  title: string;
  created_at: string;
  images: GalleryImage[];
  source_photo_count: number;
  generated_image_count: number;
}

const gallerySessions = ref<GallerySession[]>([]);

const selectedPoints = computed(() =>
  selectedIds.value
    .map((id) => points.value.find((item) => item.id === id))
    .filter((item): item is TourPoint => !!item),
);

function normalizeImageUrl(url: string): string {
  if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalizeTourPoints(data: any[]): TourPointData[] {
  return data.map((item, index) => ({
    id: item.id ?? index + 1,
    location: item.location ?? [0, 0],
    name: item.name ?? '',
    description: item.description ?? '',
    field: item.field ?? '',
    cost: item.cost ?? '',
    images: (item.images ?? []).map((img: string) => normalizeImageUrl(img)),
    position: item.position ?? { top: '0%', left: '0%' },
    color: item.color ?? '#64748B',
  }));
}

async function loadTourPoints(): Promise<void> {
  if (pointsLoadPromise) return pointsLoadPromise;

  pointsLoadPromise = (async () => {
    pointsLoading.value = true;
    try {
      const resp = await fetch(`${apiBase}/api/map-meta`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      points.value = normalizeTourPoints(data);
    } catch (e) {
      console.warn('Failed to load tour points from API, using defaults:', e);
    } finally {
      pointsLoading.value = false;
    }
  })();

  return pointsLoadPromise;
}

async function planRoute(): Promise<boolean> {
  const selected = selectedPoints.value;
  if (selected.length === 0) return false;

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
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    routePlan.value = data.route || [];
    routeSummary.value = data.summary || '';

    if (routePlan.value.length > 0) {
      const orderedIds = routePlan.value
        .sort((a, b) => a.order - b.order)
        .map(r => r.attraction?.id)
        .filter((id): id is number => id != null);
      if (orderedIds.length > 0) {
        selectedIds.value = orderedIds;
      }
    }
    return true;
  } catch (e) {
    console.warn('Failed to plan route, keeping original order:', e);
    routePlan.value = [];
    routeSummary.value = '';
    return false;
  } finally {
    routeLoading.value = false;
  }
}

function addGallerySession(session: GallerySession) {
  gallerySessions.value.unshift(session);
}

async function loadGallerySessions(): Promise<void> {
  try {
    const resp = await fetch(`${apiBase}/api/memories/${encodeURIComponent(currentUsername.value)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    gallerySessions.value = await resp.json();
  } catch (e) {
    console.warn('Failed to load gallery sessions:', e);
  }
}

function setTab(tab: 'map' | 'list') {
  activeTab.value = tab;
}

function addPoint(id: number) {
  if (!selectedIds.value.includes(id)) {
    selectedIds.value.push(id);
  }
}

function removePoint(id: number) {
  selectedIds.value = selectedIds.value.filter((item) => item !== id);
}

function setSelectedIds(ids: number[]) {
  selectedIds.value = [...ids];
}

function setHighlight(id: number | null) {
  highlightId.value = id;
}

function clearSelection() {
  selectedIds.value = [];
}

function setUserSettings(settings: UserSettings) {
  userSettings.value = { ...settings };
  saveUserSettingsToStorage(userSettings.value);
}

function hasUserSettings(): boolean {
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
    routeSummary,
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
    setSelectedIds,
    setHighlight,
    clearSelection,
    setUserSettings,
    hasUserSettings,
  };
}
