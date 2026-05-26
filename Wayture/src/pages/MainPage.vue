<template>
  <section class="flex-col" aria-label="主页面" style="height: 100%;">
    <div class="panel-card" style="position: relative;">
      <div class="main-tabbar">
        <div class="tab-group">
          <button class="tab-button" :class="{ active: activeTab === 'map' }" @click="setTab('map')">地图</button>
          <button class="tab-button" :class="{ active: activeTab === 'list' }" @click="setTab('list')">列表</button>
        </div>
      </div>
      <div v-show="activeTab === 'map'" class="map-card">
        <div class="map-container">
          <div class="field-legend" aria-label="景点分类颜色图例">
            <div v-for="item in fieldLegend" :key="item.field" class="field-legend-item">
              <span class="field-legend-dot" :style="{ backgroundColor: item.color }"></span>
              <span class="field-legend-name">{{ item.field }}</span>
              <span v-if="item.count > 0" class="field-legend-count">{{ item.count }}</span>
            </div>
          </div>
          <div class="map-viewport">
            <div class="map-image">
            <img class="map-img" :src="tour.mapImageUrl" alt="游览地图" />
            <button
              v-for="point in points"
              :key="point.id"
              class="map-point-wrap"
              :class="{
                active: point.id === selectedPointId,
                selected: isPointSelected(point.id)
              }"
              :style="{
                left: `${point.location[0]}%`,
                top: `${point.location[1]}%`
              }"
              type="button"
              @click="selectPoint(point.id, $event)"
            >
              <span class="map-point-label">{{ point.name }}</span>
              <span
                class="map-point"
                :style="{
                  backgroundColor: getPointMarkerColor(point.id, point.field)
                }"
              >
                <span class="map-point-order">{{ getPointOrder(point.id) }}</span>
              </span>
            </button>
          </div>
          </div>
          <AttractionDetailModal
            v-if="selectedPoint"
            :point="selectedPoint"
            :is-added="selectedIds.includes(selectedPoint.id)"
            :accent-color="getFieldColor(selectedPoint.field)"
            :style="detailModalStyle"
            @close="closeSelectedPoint"
            @add="addPoint"
          />
        </div>
      </div>
      <AttractionListView
        class="list-view-host"
        v-show="activeTab === 'list'"
        :points="points"
        :selected-ids="selectedIds"
        :field-color-map="fieldColorMap"
        :fixed-fields="fixedFields"
        :field-selected-counts="fieldSelectedCounts"
        :total-selected-count="totalSelectedCount"
        @add="addPoint"
      />
      <ul class="tour-list-case">
        <p>主题路线</p>
        <li v-for="item in tourCases" :key="item.name" @click="applyTourCase(item.ids)">{{ item.label }}</li>
      </ul>
    </div>

    <div class="selected-popup" :class="{ collapsed: !selectedPopupOpen }">
      <button class="route-map-entry" type="button" @click="goTourDetails">
        <span class="route-map-title">路线地图</span>
        <span class="route-map-count">{{ allTourList.length }}</span>
        <el-icon class="route-map-icon"><ArrowRightBold /></el-icon>
      </button>
      <div class="selected-list-panel">
        <div class="selected-popup-header">
          <div>
            <p class="popup-title">当前游览列表</p>
            <p class="popup-subtitle">已选 {{ selectedPoints.length }} 项</p>
          </div>
          <span class="toggle-icon" @click="toggleSelectedPopup">
            {{ selectedPopupOpen ? '收起' : '展开' }}
          </span>
        </div>
        <template v-if="selectedPopupOpen">
          <div v-if="selectedPoints.length === 0" class="popup-empty">点击地图上的点位开始规划</div>
          <ul v-else class="selected-list">
            <li v-for="(point, index) in selectedPoints" :key="point.id" class="selected-item">
              <span class="item-index" :style="{ backgroundColor: getFieldColor(point.field) }">{{ index + 1 }}</span>
              <span class="item-name">{{ point.name }}</span>
              <span class="delete-icon" aria-label="删除景点" @click="removePoint(point.id)">
                <el-icon><CloseBold /></el-icon>
              </span>
            </li>
          </ul>
          <div class="popup-footer">
            <button class="button-clear" type="button" :disabled="selectedPoints.length === 0 || routeLoading" @click="clearSelectedPoints">
              清空
            </button>
            <el-button
              class="button-generate"
              :loading="routeLoading"
              :disabled="selectedPoints.length === 0 || routeLoading"
              type="primary"
              @click="generateTour"
            >
              生成地图
            </el-button>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRightBold, CloseBold } from '@element-plus/icons-vue';
import AttractionListView from '../components/AttractionListView.vue';
import AttractionDetailModal from '../components/AttractionDetailModal.vue';
import { useTourStore } from '../composables/useTourStore';
import { calculateTriggerModalStyle } from '../utils/common.js';
import { fieldColorMap, fixedFields, getFieldColor } from '../data/fieldConfig';

const router = useRouter();
const tour = useTourStore();

const points = tour.points;
const activeTab = tour.activeTab;
const selectedIds = tour.selectedIds;
const selectedPoints = tour.selectedPoints;
const allTourList = tour.allTourList;
const selectedPointId = ref<number | null>(null);
const selectedPoint = computed(() => points.value.find((item) => item.id === selectedPointId.value) ?? null);
const selectedPopupOpen = ref(true);
const routeLoading = ref(false);
const mapFrameRef = ref<HTMLElement | null>(null);
const detailModalStyle = ref<Record<string, string>>({});

const tourCases = [
  {
    name: 'parent-kid-day',
    label: '🧸 萌娃陪伴线',
    ids: [21,1,2,3,4,25,7,8,20,35,34,33,30,31,29,24,26],
  },
  {
    name: 'relax-wander',
    label: '🌿 悠游漫享线',
    ids: [35,21,22,25,19,9,15],
  },
  {
    name: 'thrill-seeker',
    label: '🎢 心跳挑战线',
    ids: [11, 12, 17, 13, 16, 32],
  },
];

function getPointOrder(id: number): string {
  const order = selectedIds.value.indexOf(id);
  return order >= 0 ? String(order + 1) : '';
}

function isPointSelected(id: number): boolean {
  return selectedIds.value.includes(id);
}

function getPointMarkerColor(id: number, field: string): string {
  return getFieldColor(field);
}

const fieldSelectedCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {};

  fixedFields.forEach((field) => {
    counts[field] = 0;
  });

  points.value.forEach((point) => {
    if (selectedIds.value.includes(point.id)) {
      counts[point.field] = (counts[point.field] ?? 0) + 1;
    }
  });

  return counts;
});

const fieldLegend = computed(() =>
  fixedFields.map((field) => ({
    field,
    color: getFieldColor(field),
    count: fieldSelectedCounts.value[field] ?? 0,
  })),
);

const totalSelectedCount = computed(() =>
  Object.values(fieldSelectedCounts.value).reduce((total, count) => total + count, 0),
);

function setTab(tab: 'map' | 'list') {
  tour.setTab(tab);
}

function addPoint(id: number) {
  tour.addPoint(id);
  if (selectedPointId.value === id) {
    closeSelectedPoint();
  }
}

function removePoint(id: number) {
  tour.removePoint(id);
}

function clearSelectedPoints() {
  tour.setSelectedIds([]);
  closeSelectedPoint();
}

function goTourDetails() {
  router.push('/tour-list');
}

async function generateTour() {
  if (selectedPoints.value.length === 0 || routeLoading.value) {
    return;
  }

  routeLoading.value = true;
  try {
    const planned = await tour.planRoute();
    if (!planned) {
      return;
    }

    router.push('/tour');
  } finally {
    routeLoading.value = false;
  }
}

function toggleSelectedPopup() {
  selectedPopupOpen.value = !selectedPopupOpen.value;
}

function closeSelectedPoint() {
  selectedPointId.value = null;
  detailModalStyle.value = {};
}

function selectPoint(id: number, event: MouseEvent) {
  if (selectedPointId.value === id) {
    closeSelectedPoint();
    return;
  }

  const point = points.value.find((item) => item.id === id);
  if (!point) {
    return;
  }

  const triggerElement = event.currentTarget as HTMLElement;
  const pointElement = triggerElement.querySelector('.map-point') as HTMLElement | null;
  detailModalStyle.value = calculateTriggerModalStyle(pointElement ?? triggerElement);
  selectedPointId.value = id;
}

function applyTourCase(ids: number[]) {
  tour.setSelectedIds(ids);
  closeSelectedPoint();
  selectedPopupOpen.value = true;
}

onMounted(async () => {
  await tour.loadTourPoints();
});
</script>

<style scoped lang="scss">
.p-24 { padding: 1.5rem; }
.mt-24 { margin-top: 1.5rem; }
.mb-16 { margin-bottom: 1rem; }
.mb-14 { margin-bottom: 0.875rem; }
.p-20 { padding: 1.25rem; }
.p-18 { padding: 1.125rem; }
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

.panel-card{
  height: 100%;
  .map-card, .list-view-host {
    height: 100%;
    overflow: hidden;
  }
}

.main-tabbar {
  position: absolute;
  top: 1.375rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  display: flex;
  justify-content: center;

  .tab-group {
    display: inline-flex;
    gap: 0;
    border-radius: 0.5rem;
    background: rgba(245, 245, 245, 1);
    overflow: hidden;
    backdrop-filter: blur(0.25rem);
    -webkit-backdrop-filter: blur(0.25rem);

    .tab-button {
      min-width: 3.625rem;
      height: 2.625rem;
      font-size: 1.125em;
      border: none;
      background: transparent;
      color: #000;
      transition: background-color 0.2s ease, color 0.2s ease;

      &.active {
        background: rgba(255, 183, 0, 1);
      }
    }
  }
}


.map-card {
  &.mt-24 {
    margin-top: 0;
  }

  .map-container {
    position: relative;
    height: 100%;
    border-radius: 1.625rem;

    .map-viewport {
      height: 100%;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }

    .field-legend {
      position: absolute;
      top: 5rem;
      left: 1rem;
      z-index: 12;
      display: grid;
      gap: 0.375rem;
      min-width: 8.25rem;
      padding: 0.625rem 0.75rem;
      border: 0.0625rem solid rgba(255, 255, 255, 0.45);
      border-radius: 0.5rem;
      background: rgba(15, 23, 42, 0.36);
      backdrop-filter: blur(0.25rem);
      -webkit-backdrop-filter: blur(0.25rem);

      .field-legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #f8fafc;
        line-height: 1.2;
        text-shadow: 0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.45);
        white-space: nowrap;
      }

      .field-legend-dot {
        width: 0.75rem;
        height: 0.75rem;
        border: 0.125rem solid rgba(255, 255, 255, 0.9);
        border-radius: 999rem;
        box-shadow: 0 0.125rem 0.375rem rgba(15, 23, 42, 0.28);
        flex-shrink: 0;
      }

      .field-legend-name {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .field-legend-count {
        display: grid;
        place-items: center;
        min-width: 1.25rem;
        height: 1.25rem;
        margin-left: auto;
        padding: 0 0.25rem;
        border-radius: 999rem;
        color: #fff;
        font-size: 0.875rem;
        line-height: 1;
        box-sizing: border-box;
      }
    }

    .map-image {
      position: relative;
      width: 100%;

      .map-img {
        display: block;
        width: 100%;
      }

      .map-point-wrap {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        width: max-content;
        height: auto;
        transform: translate(-50%, -50%);
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
        z-index: 4;

        &.selected {
          z-index: 5;
        }

        &.active {
          z-index: 6;
        }

        &:hover,
        &.active {
          .map-point {
            border-color: #fff;
            transform: scale(2);
            box-shadow: 0 0 0 0.25rem rgba(255, 255, 255, 0.26), 0 0.625rem 1.375rem rgba(15, 23, 42, 0.28);
          }
        }
      }

      .map-point {
        width: 1rem;
        height: 1rem;
        display: grid;
        place-items: center;
        border: 0.125rem solid rgba(255, 255, 255, 0.86);
        border-radius: 999rem;
        color: #fff;
        font-size: 0.4375rem;
        font-weight: 700;
        line-height: 1;
        box-shadow: 0 0.375rem 0.875rem rgba(15, 23, 42, 0.26);
        transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background-color 0.16s ease;

        .map-point-order {
          position: relative;
          z-index: 1;
        }

      }

      .map-point-wrap.selected {
        .map-point {
          color: #fff7ed;
          border-color: rgba(255, 255, 255, 0.96);
          transform: scale(2);
        }
      }

      .map-point-label {
        padding: 0.25rem;
        border-radius: 0.5rem;
        background: rgba(31, 31, 31, 0.6);
        color: #fff;
        font-weight: 400;
        line-height: 1.2;
        white-space: nowrap;
        position: absolute;
        bottom: calc(100% + 0.375rem);
        font-size: .875rem;

      }
    }

  }
}

.tour-list-case{
  position: absolute;
  top: 30%;
  right: 1.625rem;
  z-index: 12;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.6);
  padding: .5rem;
  border-radius: 12px;
  backdrop-filter: blur(6px);

  p {
    margin: 0;
    color: #000;
    font-weight: 400;
  }

  li {
    list-style: none;
    padding: 1em;
    border-radius: 1rem;
    background: rgba(40, 40, 40, 1);
    color: #fff;
    cursor: pointer;
  }
}

.list-panel {
  display: grid;
  gap: 1rem;

  &.mt-24 {
    margin-top: 0;
  }
}

.group-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 999rem;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  box-shadow: 0 0.5rem 1.25rem rgba(15, 23, 42, 0.18);
}

.point-id-badge {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border-radius: 0.5rem;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  flex-shrink: 0;
}

.selected-popup {
  position: fixed;
  right: 1.625rem;
  bottom: 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: min(19rem, calc(100% - 2rem));
  max-width: 22.5rem;
  z-index: 40;
  overflow: visible;

  &.collapsed {
    width: min(13.75rem, calc(100% - 2rem));
  }

  .route-map-entry {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 1rem;
    width: 100%;
    min-height: 3.25rem;
    padding: 0 1.125rem;
    border: none;
    border-radius: 15px;
    background: rgba(0, 0, 0, 0.42);
    color: #fff;
    cursor: pointer;
    text-align: left;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(1.25rem);

    .route-map-title {
      font-size: 1rem;
      font-weight: 500;
    }

    .route-map-count {
      min-width: 1rem;
      color: rgba(255, 255, 255, 0.78);
      text-align: center;
    }

    .route-map-icon {
      color: #fff;
      font-size: 1rem;
    }
  }

  .selected-list-panel {
    overflow: hidden;
    border-radius: 15px;
    background: rgba(0, 0, 0, 0.42);
    backdrop-filter: blur(1.25rem);
  }

  .selected-popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1.125rem;
    .toggle-icon{
      cursor: pointer;
      background-color: rgba(15, 23, 42, 0.2);
      padding: .5em 1em;
      border-radius: 1em;
      color: #e2e8f0;
      font-size: .75em;
    }
   

    .popup-title {
      margin: 0;
      font-size: 0.98rem;
      color: #e2e8f0;
      font-weight: 700;
    }

    .popup-subtitle {
      margin: 0.25rem 0 0;
      font-size: 0.82rem;
      color: #e2e8f0;
    }
  }

  .popup-empty {
    padding: 0.5rem 1rem;
    color: #e2e8f0;
  }

  .selected-list {
    list-style: none;
    margin: 0;
    padding: 0.5625rem 1.125rem;
    display: grid;
    gap: 0.625rem;
    max-height: 13.75rem;
    overflow-y: auto;

    .selected-item {
      display: grid;
      grid-template-columns: 1.5rem 1fr auto;
      align-items: center;
      gap: 0.625rem;
      border-radius: 1.125rem;
      
      .item-index {
        width: 1.375rem;
        height: 1.375rem;
        display: grid;
        place-items: center;
        border-radius: 100%;
        color: #dbeafe;
        font-weight: 700;
        border: 0.125rem solid rgba(255, 255, 255, 1);
        box-sizing: border-box;
        font-size: .8em;
      }

      .item-name {
        color: #e2e8f0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .delete-icon{
        cursor: pointer;
        color: rgba(255, 255, 255, .8);
      }
    }
  }

  .popup-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: auto;
    padding: 1.5rem 1.125rem 1rem;
    button,
    .el-button {
      border-radius: 8px;
      height: 2.5rem;
      border: none;
    }
    .button-generate{
      background: rgb(255, 183, 0);
      color: #000;
      flex: 1;
    }
    .button-clear {
    padding: 0 1rem;
    border: 0;
    background: rgba(255, 255, 255, 0.18);
    color: #fff;
    cursor: pointer;
    height:3em!important;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
  }
  }

  


}

.full-width {
  width: auto;
  border-radius: 0 0 1.5rem 1.5rem;
  margin-top: 0.75rem;
}

.info-card {
  h4 {
    margin: 0;
    font-size: 1.1rem;
  }

  p {
    margin: 0.5rem 0 0;
    color: #cbd5e1;
  }
}

.grid-list {
  display: grid;
  gap: 1rem;
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
  gap: 0.875rem;

  .tour-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    border: 0.0625rem solid rgba(148, 163, 184, 0.12);
    border-radius: 1.25rem;

    .tour-item-left {
      display: flex;
      gap: 0.875rem;
      align-items: flex-start;
      min-width: 0;
    }

    .tour-thumbnail {
      width: 5.25rem;
      height: 5.25rem;
      border-radius: 1.125rem;
      background-color: rgba(148, 163, 184, 0.12);
      background-position: center;
      background-size: cover;
      flex-shrink: 0;
    }

    .tour-description {
      margin: 0.5rem 0 0;
      color: #cbd5e1;
      line-height: 1.5;
      max-width: 26.25rem;
    }
  }
}

.empty-state {
  padding: 1.5rem;
  border-radius: 1.25rem;
  border: 0.0625rem dashed rgba(148, 163, 184, 0.22);
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

@media (max-width: 980px) {
  .map-card {
    .map-container {
      .map-viewport {
        height: 100%;
        overflow: auto;
      }

      .map-image {
        width: max(100%, 56rem);
        min-width: 56rem;
      }
    }
  }
}

@media (max-width: 640px) {
  .main-tabbar {
    top: 0.75rem;
  }

  .map-card {
    .map-container {
      .field-legend {
        top: 4rem;
        left: 0.75rem;
        max-width: calc(100% - 1.5rem);
      }

      .map-image {
        width: 62rem;
        min-width: 62rem;
      }
    }
  }

  .selected-popup {
    right: 0.75rem;
    bottom: 0.75rem;
    width: min(18rem, calc(100% - 1.5rem));
  }

  .tour-list-case {
    right: 0.75rem;
  }
}
</style>
