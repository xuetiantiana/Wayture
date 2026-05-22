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
        <div class="map-container">
          <div class="field-legend" aria-label="景点分类颜色图例">
            <div v-for="item in fieldLegend" :key="item.field" class="field-legend-item">
              <span class="field-legend-dot" :style="{ backgroundColor: item.color }"></span>
              <span class="field-legend-name">{{ item.field }}</span>
            </div>
          </div>
          <div style="overflow: auto;">
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
          <ul class="tour-list-case">
            <li v-for="item in tourCases" :key="item.name" @click="applyTourCase(item.ids)">{{ item.label }}</li>
          </ul>
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
        <span class="toggle-icon" @click="toggleSelectedPopup">
          {{ selectedPopupOpen ? '收起' : '展开' }}
        </span>
      </div>
      <template v-if="selectedPopupOpen">
        <div v-if="selectedPoints.length === 0" class="popup-empty">点击地图上的点位开始规划</div>
        <ul v-else class="selected-list">
          <li v-for="(point, index) in selectedPoints" :key="point.id" class="selected-item">
            <span class="item-index">{{ index + 1 }}</span>
            <span class="item-name">{{ point.name }}</span>
            <span class="delete-icon" aria-label="删除景点" @click="removePoint(point.id)">
              <el-icon><CloseBold /></el-icon>
            </span>
          </li>
        </ul>
        <button class="button-primary full-width" :disabled="selectedPoints.length === 0" @click="generateTour">生成完整路线 →</button>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { CloseBold } from '@element-plus/icons-vue';
import AttractionListView from '../components/AttractionListView.vue';
import AttractionDetailModal from '../components/AttractionDetailModal.vue';
import { useTourStore } from '../composables/useTourStore';
import { calculateTriggerModalStyle } from '../utils/common.js';

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
const detailModalStyle = ref<Record<string, string>>({});

// 按 field 定义颜色
const fieldColorMap: Record<string, string> = {
  'MSRA专区':"rgba(168, 27, 128, 1)",
  '魔法森林': 'rgba(27, 168, 102, 1)',
  '尖叫小镇': 'rgba(23, 37, 126, 1)',
  '小勇士的冒险亲子乐园': 'rgba(10, 151, 229, 1)',
  '冒险者俱乐部': 'rgba(247, 143, 8, 1)',
  '萌宠乐园': 'rgba(49, 120, 35, 1)'
};

const fixedFields = [
  'MSRA专区',
  '魔法森林',
  '尖叫小镇',
  '小勇士的冒险亲子乐园',
  '冒险者俱乐部',
  '萌宠乐园',
];

const tourCases = [
  {
    name: 'parent-kid-day',
    label: '🧸 Parent & Kid Day',
    ids: [21, 22, 25, 35, 29, 24,26,1,2,3,4,5,7,8],
  },
  {
    name: 'thrill-seeker',
    label: '🎢 Thrill Seeker',
    ids: [11, 12, 17, 13, 16, 32],
  },
  {
    name: 'relax-wander',
    label: '🌿 Relax & Wander',
    ids: [32, 25, 35, 15,9],
  },
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
  return getFieldColor(field);
}

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
    closeSelectedPoint();
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
      border: none;
      background: transparent;
      color: rgba(23, 68, 58, 1);
      font-weight: 700;
      transition: background-color 0.2s ease, color 0.2s ease;

      &.active {
        color: white;
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
    min-height: 32.5rem;
    height: 100%;
    border-radius: 1.625rem;

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

        &:hover,
        &.active {
          .map-point {
            border-color: #fff;
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
        background: rgba(13, 13, 13, 0.4);
        color: #fff;
        font-weight: 400;
        line-height: 1.2;
        white-space: nowrap;
        position: absolute;
        bottom: calc(100% + 0.375rem);

      }
    }

    .tour-list-case{
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      z-index: 12;
      right: 0.625rem;

      li {
        list-style: none;
        padding: 1em;
        border-radius: 1rem;
        background: rgba(40, 40, 40, 1);
        color: #f8fafc;
        color: #fff;
        cursor: pointer;
      }
    }
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
  right: 0.625rem;
  bottom: 0.625rem;
  width: min(22.5rem, calc(100% - 2rem));
  max-width: 22.5rem;
  background: rgba(0,0,0,0.42);
  border: 0.0625rem solid rgba(96, 165, 250, 0.35);
  border-radius: 1.5rem;
  backdrop-filter: blur(1.25rem);
  z-index: 40;
  overflow: hidden;

  &.collapsed {
    width: min(13.75rem, calc(100% - 2rem));
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
      color: #94a3b8;
    }
  }

  .popup-empty {
    padding: 0.5rem 1rem;
    color: #94a3b8;
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
        background: rgba(230, 85, 44, 1);
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
      }
    }
  }

  .popup-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: auto;
  }

  .button-primary.full-width {
    background: linear-gradient(90deg, #ffc400 0%, #ff9f0a 100%);
  }
}

.full-width {
  width: 100%;
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
</style>
