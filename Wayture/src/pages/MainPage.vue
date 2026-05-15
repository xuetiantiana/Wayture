<template>
  <section class="flex-col page-shell" aria-label="主页面">
    <div class="panel-card" style="position: relative;">
      <div class="main-tabbar">
        <div class="tab-group">
          <button class="tab-button" :class="{ active: activeTab === 'map' }" @click="setTab('map')">Map</button>
          <button class="tab-button" :class="{ active: activeTab === 'list' }" @click="setTab('list')">List</button>
        </div>
      </div>
      <div v-show="activeTab === 'map'" class="map-card">
        <div ref="mapFrameRef" class="map-frame">
          <div class="field-legend" aria-label="景点分类颜色图例">
            <div v-for="item in fieldLegend" :key="item.field" class="field-legend-item">
              <span class="field-legend-dot" :style="{ backgroundColor: item.color }"></span>
              <span class="field-legend-name">{{ item.field }}</span>
            </div>
          </div>
          <div class="map-image">
            <img class="map-img" :src="tour.mapImageUrl" alt="游览地图" />
            <button
              v-for="point in points"
              :key="point.id"
              class="map-point"
              :class="{
                active: point.id === selectedPointId,
                selected: isPointSelected(point.id)
              }"
              :style="{
                left: `${point.location[0]}%`,
                top: `${point.location[1]}%`,
                backgroundColor: getPointMarkerColor(point.id, point.field)
              }"
              type="button"
              @click="selectPoint(point.id)"
            >
              {{ getPointOrder(point.id) }}
            </button>
          </div>
          <AttractionDetailModal
            v-if="selectedPoint"
            :point="selectedPoint"
            :is-added="selectedIds.includes(selectedPoint.id)"
            :accent-color="getFieldColor(selectedPoint.field)"
            :style="detailModalStyle"
            @close="selectedPointId = null"
            @add="addPoint"
          />
        </div>
      </div>
      <AttractionListView
        class="list-view-host"
        :class="{ 'list-view-host--hidden': activeTab !== 'list' }"
        :points="points"
        :selected-ids="selectedIds"
        :field-color-map="fieldColorMap"
        :fixed-fields="fixedFields"
        @add="addPoint"
      />
    </div>

    <div class="selected-popup" :class="{ collapsed: !selectedPopupOpen }">
      <div class="selected-popup-header">
        <div>
          <p class="popup-title">当前游览列表</p>
          <p class="popup-subtitle">已选 {{ selectedPoints.length }} 项</p>
        </div>
        <button class="button-secondary small" @click="toggleSelectedPopup">
          {{ selectedPopupOpen ? '收起' : '展开' }}
        </button>
      </div>
      <template v-if="selectedPopupOpen">
        <div v-if="selectedPoints.length === 0" class="popup-empty">暂无已选景点，点击地图或列表添加。</div>
        <ul class="selected-list">
          <li v-for="(point, index) in selectedPoints" :key="point.id" class="selected-item">
            <span class="item-index">{{ index + 1 }}</span>
            <span class="item-name">{{ point.name }}</span>
            <button class="button-secondary tiny" @click="removePoint(point.id)">删除</button>
          </li>
        </ul>
        <button class="button-primary full-width" :disabled="selectedPoints.length === 0" @click="generateTour">生成游览攻略</button>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AttractionListView from '../components/AttractionListView.vue';
import AttractionDetailModal from '../components/AttractionDetailModal.vue';
import { useTourStore } from '../composables/useTourStore';
import { calculateDetailModalStyle } from '../utils/common.js';

const router = useRouter();
const tour = useTourStore();

const points = tour.points;
const activeTab = tour.activeTab;
const selectedIds = tour.selectedIds;
const selectedPoints = tour.selectedPoints;
const selectedPointId = ref<number | null>(null);
const selectedPoint = computed(() => points.value.find((item) => item.id === selectedPointId.value) ?? null);
const selectedPopupOpen = ref(true);
const mapFrameRef = ref<HTMLElement | null>(null);
const mapFrameSize = ref({ width: 0, height: 0 });

let mapFrameResizeObserver: ResizeObserver | null = null;

// 按 field 定义颜色
const fieldColorMap: Record<string, string> = {
  '魔法森林': '#10B981',
  '尺木小镇': '#8B5A2B',
  '尖叫小镇': '#1E2A9B',
  '小勇士的冒险亲子乐园': '#1E2A9B',
  '冒险者俱乐部': '#FF8A00',
  '萌宠乐园': '#7A7A7A'
};

const fixedFields = [
  '魔法森林',
  '尺木小镇',
  '尖叫小镇',
  '小勇士的冒险亲子乐园',
  '冒险者俱乐部',
  '萌宠乐园',
];

function getFieldColor(field: string): string {
  return fieldColorMap[field] || '#64748B';
}

function getPointOrder(id: number): string {
  const order = selectedIds.value.indexOf(id);
  return order >= 0 ? String(order + 1) : '';
}

function isPointSelected(id: number): boolean {
  return selectedIds.value.includes(id);
}

function getPointMarkerColor(id: number, field: string): string {
  return isPointSelected(id) ? '#ef4444' : getFieldColor(field);
}

function updateMapFrameSize() {
  if (!mapFrameRef.value) {
    return;
  }

  const rect = mapFrameRef.value.getBoundingClientRect();
  mapFrameSize.value = {
    width: rect.width,
    height: rect.height,
  };
}

function observeMapFrame() {
  mapFrameResizeObserver?.disconnect();
  updateMapFrameSize();

  if (!mapFrameRef.value || typeof ResizeObserver === 'undefined') {
    return;
  }

  mapFrameResizeObserver = new ResizeObserver(updateMapFrameSize);
  mapFrameResizeObserver.observe(mapFrameRef.value);
}

const detailModalStyle = computed<Record<string, string>>(() => {
  if (!selectedPoint.value) {
    return {};
  }

  return calculateDetailModalStyle(selectedPoint.value.location, mapFrameSize.value);
});

const fieldLegend = computed(() =>
  fixedFields.map((field) => ({
    field,
    color: getFieldColor(field),
  })),
);

function setTab(tab: 'map' | 'list') {
  tour.setTab(tab);
}

function addPoint(id: number) {
  tour.addPoint(id);
  if (selectedPointId.value === id) {
    selectedPointId.value = null;
  }
}

function removePoint(id: number) {
  tour.removePoint(id);
}

async function generateTour() {
  if (selectedPoints.value.length === 0) {
    return;
  }
  router.push('/tour');
}

function toggleSelectedPopup() {
  selectedPopupOpen.value = !selectedPopupOpen.value;
}

function selectPoint(id: number) {
  selectedPointId.value = selectedPointId.value === id ? null : id;
}

onMounted(async () => {
  await tour.loadTourPoints();
  await nextTick();
  observeMapFrame();
  window.addEventListener('resize', updateMapFrameSize);
});

watch(activeTab, async (tab) => {
  if (tab !== 'map') {
    return;
  }

  // await nextTick();
  // observeMapFrame();
});

onBeforeUnmount(() => {
  mapFrameResizeObserver?.disconnect();
  window.removeEventListener('resize', updateMapFrameSize);
});
</script>

<style scoped lang="scss">
.p-24 { padding: 24px; }
.mt-24 { margin-top: 24px; }
.mb-16 { margin-bottom: 16px; }
.mb-14 { margin-bottom: 14px; }
.p-20 { padding: 20px; }
.p-18 { padding: 18px; }
.align-center { align-items: center; }
.justify-between { justify-content: space-between; }
.wrap { flex-wrap: wrap; }

.flex-col {
  position: relative;
}

.panel-card {
  &.p-24 {
    position: relative;
    padding-top: 0;
  }
}

.main-tabbar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  display: flex;
  justify-content: center;

  .tab-group {
    display: inline-flex;
    gap: 0;
    padding: 2px;
    border: 1px solid rgba(255, 255, 255, 0.38);
    border-radius: 8px;
    background: rgba(237, 239, 205, 0.45);
    overflow: hidden;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);

    .tab-button {
      min-width: 58px;
      height: 42px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: rgba(63, 87, 67, 0.72);
      font-size: 16px;
      font-weight: 700;
      transition: background-color 0.2s ease, color 0.2s ease;

      &.active {
        color: white;
        background: #d3a820;
        box-shadow: 0 1px 4px rgba(68, 52, 10, 0.18);
      }
    }
  }
}


.map-card {
  &.mt-24 {
    margin-top: 0;
  }

  .map-frame {
    position: relative;
    min-height: 520px;
    height: 100%;
    border-radius: 26px;

    .field-legend {
      position: absolute;
      top: 5rem;
      left: 16px;
      z-index: 12;
      display: grid;
      gap: 6px;
      min-width: 132px;
      padding: 10px 12px;
      border: 1px solid rgba(255, 255, 255, 0.45);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.36);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);

      .field-legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #f8fafc;
        font-size: 13px;
        line-height: 1.2;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
        white-space: nowrap;
      }

      .field-legend-dot {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 255, 255, 0.9);
        border-radius: 999px;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.28);
        flex-shrink: 0;
      }

      .field-legend-name {
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .map-image {
      position: relative;
      width: 100%;

      .map-img {
        display: block;
        width: 100%;
      }

      .map-point {
        position: absolute;
        width: 24px;
        height: 24px;
        transform: translate(-50%, -50%);
        display: grid;
        place-items: center;
        border: 2px solid rgba(255, 255, 255, 0.86);
        border-radius: 999px;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.26);
        z-index: 4;
        transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background-color 0.16s ease;

        &.selected {
          color: #fff7ed;
          border-color: rgba(255, 255, 255, 0.96);
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18), 0 10px 22px rgba(127, 29, 29, 0.26);
        }

        &:hover,
        &.active {
          transform: translate(-50%, -50%) scale(1.18);
          border-color: #fff;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.26), 0 10px 22px rgba(15, 23, 42, 0.28);
        }
      }
    }
  }
}

.list-panel {
  display: grid;
  gap: 16px;

  &.mt-24 {
    margin-top: 0;
  }
}

.group-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
}

.point-id-badge {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  flex-shrink: 0;
}

.selected-popup {
  position: fixed;
  right: 22px;
  bottom: 22px;
  width: min(360px, calc(100% - 32px));
  max-width: 360px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.92));
  border: 1px solid rgba(96, 165, 250, 0.35);
  border-radius: 24px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35), 0 10px 24px rgba(59, 130, 246, 0.08);
  backdrop-filter: blur(20px);
  z-index: 40;
  overflow: hidden;

  &.collapsed {
    width: min(220px, calc(100% - 32px));
  }

  .selected-popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
    background: rgba(30, 41, 59, 0.98);
    border-bottom: 1px solid rgba(96, 165, 250, 0.18);

    .popup-title {
      margin: 0;
      font-size: 0.98rem;
      color: #e2e8f0;
      font-weight: 700;
    }

    .popup-subtitle {
      margin: 4px 0 0;
      font-size: 0.82rem;
      color: #94a3b8;
    }
  }

  .popup-empty {
    padding: 18px;
    color: #94a3b8;
  }

  .selected-list {
    list-style: none;
    margin: 0;
    padding: 12px 18px 0;
    display: grid;
    gap: 10px;
    max-height: 220px;
    overflow-y: auto;

    .selected-item {
      display: grid;
      grid-template-columns: 24px 1fr auto;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 18px;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(96, 165, 250, 0.14);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 8px 18px rgba(15, 23, 42, 0.18);

      .item-index {
        width: 26px;
        height: 26px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        background: rgba(59, 130, 246, 0.22);
        color: #dbeafe;
        font-size: 0.86rem;
        font-weight: 700;
      }

      .item-name {
        color: #e2e8f0;
        font-size: 0.95rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .popup-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: auto;
  }
}

.full-width {
  width: 100%;
  border-radius: 0 0 24px 24px;
  margin-top: 12px;
}

.info-card {
  h4 {
    margin: 0;
    font-size: 1.1rem;
  }

  p {
    margin: 8px 0 0;
    color: #cbd5e1;
  }
}

.grid-list {
  display: grid;
  gap: 16px;
}

.text-muted {
  color: #94a3b8;
  font-size: 0.92rem;
}

.tour-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 14px;

  .tour-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 20px;

    .tour-item-left {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      min-width: 0;
    }

    .tour-thumbnail {
      width: 84px;
      height: 84px;
      border-radius: 18px;
      background-color: rgba(148, 163, 184, 0.12);
      background-position: center;
      background-size: cover;
      flex-shrink: 0;
    }

    .tour-description {
      margin: 8px 0 0;
      color: #cbd5e1;
      line-height: 1.5;
      max-width: 420px;
    }
  }
}

.empty-state {
  padding: 24px;
  border-radius: 20px;
  border: 1px dashed rgba(148, 163, 184, 0.22);
  text-align: center;
  color: #9ca3af;
}

button {
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.list-view-host--hidden {
  position: absolute;
  inset: 0;
  z-index: -1;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
