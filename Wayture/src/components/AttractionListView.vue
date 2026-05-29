<template>
  <div class="list-view" style="background: #fff;">
    <div class="field-filter-bar">
      <button
        class="field-filter-trigger"
        type="button"
        :aria-expanded="fieldFilterOpen"
        @click="fieldFilterOpen = !fieldFilterOpen"
      >
        <span>{{ activeFieldFilter.label }}</span>
        <span v-if="getSelectedCount(activeFieldFilter.field) > 0" class="field-chip-count">
          {{ getSelectedCount(activeFieldFilter.field) }}
        </span>
        <el-icon class="field-filter-arrow"><ArrowDownBold /></el-icon>
      </button>
      <button
        v-for="f in fieldFilters"
        :key="String(f.field)"
        class="field-chip"
        :class="{ active: selectedField === f.field }"
        @click="selectField(f.field)"
      >
        <span>{{ f.label }}</span>
        <span v-if="getSelectedCount(f.field) > 0" class="field-chip-count">
          {{ getSelectedCount(f.field) }}
        </span>
      </button>
      <div v-if="fieldFilterOpen" class="field-filter-menu">
        <button
          v-for="f in fieldFilters"
          :key="`menu-${String(f.field)}`"
          class="field-filter-option"
          :class="{ active: selectedField === f.field }"
          type="button"
          @click="selectField(f.field)"
        >
          <span>{{ f.label }}</span>
          <span class="field-filter-option-meta">
            <span v-if="getSelectedCount(f.field) > 0" class="field-chip-count">
              {{ getSelectedCount(f.field) }}
            </span>
            <span v-if="selectedField === f.field" class="field-filter-check">✓</span>
          </span>
        </button>
      </div>
    </div>

    <Waterfall
      class="image-card-grid"
      :list="waterfallPoints"
      row-key="id"
      img-selector="src"
      :breakpoints="waterfallBreakpoints"
      :gutter="12"
      :space="12"
      :cross-origin="false"
      :load-props="waterfallLoadProps"
    >
      <template #default="{ item: point, url }">
        <article class="img-card">
          <div class="img-card-cover">
            <LazyImg v-if="url" class="img-card-img" :url="url" :alt="point.name" :ratio="waterfallImageRatio" />
            <div v-else class="img-card-placeholder"></div>
            <button
              class="img-card-select"
              :class="{ active: selectedIds.includes(point.id) }"
              type="button"
              :disabled="selectedIds.includes(point.id)"
              @click.stop="handleAdd(point.id)"
            >
              <img v-if="selectedIds.includes(point.id)" class="select-icon" :src="checkIcon" alt="" />
            </button>
            <div class="img-card-name">{{ point.name }}</div>
            <button class="img-card-detail" type="button" @click.stop="showDetail(point.id, $event)">View Details</button>
          </div>
        </article>
      </template>
    </Waterfall>

    <div v-if="selectedPoint" class="list-detail-backdrop" @click.self="closeDetail">
      <AttractionDetailModal
        :point="selectedPoint"
        :is-added="selectedIds.includes(selectedPoint.id)"
        :accent-color="getFieldColor(selectedPoint.field)"
        :style="detailModalStyle"
        @close="closeDetail"
        @add="handleAdd"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { LazyImg, Waterfall } from 'vue-waterfall-plugin-next';
import 'vue-waterfall-plugin-next/dist/style.css';
import { ArrowDownBold } from '@element-plus/icons-vue';
import checkIcon from '../assets/images/check-icon.png';
import type { TourPointData } from '../data/tourPoints';
import { calculateTriggerModalStyle } from '../utils/common.js';
import AttractionDetailModal from './AttractionDetailModal.vue';

const props = defineProps<{
  points: TourPointData[];
  selectedIds: number[];
  fieldColorMap: Record<string, string>;
  fixedFields: string[];
  fieldSelectedCounts: Record<string, number>;
  totalSelectedCount: number;
}>();

const emit = defineEmits<{
  add: [id: number];
}>();

const selectedField = ref<string | null>(null);
const fieldFilterOpen = ref(false);
const selectedPointId = ref<number | null>(null);
const detailModalStyle = ref<Record<string, string>>({});

const waterfallBreakpoints = {
  99999: { rowPerView: 5 },
  1440: { rowPerView: 4 },
  1024: { rowPerView: 3 },
  640: { rowPerView: 2 },
};

const waterfallImageRatio = 1.35;
const waterfallLoadProps = {
  log: false,
  error: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
};

function getFieldColor(field: string): string {
  return props.fieldColorMap[field] || '#64748B';
}

const fieldFilters = computed(() => [
  { label: '全部', field: null as string | null },
  ...props.fixedFields.map((field) => ({ label: field, field: field as string | null })),
]);

const activeFieldFilter = computed(
  () => fieldFilters.value.find((item) => item.field === selectedField.value) ?? fieldFilters.value[0],
);

function selectField(field: string | null) {
  selectedField.value = field;
  fieldFilterOpen.value = false;
}

function getSelectedCount(field: string | null): number {
  if (!field) {
    return props.totalSelectedCount;
  }

  return props.fieldSelectedCounts[field] ?? 0;
}

const filteredPoints = computed(() => {
  if (!selectedField.value) {
    return props.points;
  }
  return props.points.filter((p) => p.field === selectedField.value);
});

const waterfallPoints = computed(() =>
  filteredPoints.value.map((point) => ({
    ...point,
    src: point.images[0] ?? '',
  })),
);

const selectedPoint = computed(() => props.points.find((item) => item.id === selectedPointId.value) ?? null);

function showDetail(id: number, event: MouseEvent) {
  event.stopPropagation();
  detailModalStyle.value = calculateTriggerModalStyle(event.currentTarget as HTMLElement);
  selectedPointId.value = id;
}

function closeDetail() {
  selectedPointId.value = null;
  detailModalStyle.value = {};
}

function handleAdd(id: number) {
  emit('add', id);
  if (selectedPointId.value === id) {
    closeDetail();
  }
}
</script>

<style scoped lang="scss">
.list-view {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  padding-top: 5rem;
}

.field-filter-bar {
  position: relative;
  display: flex;
  gap: 0.625rem;
  padding: 1.25rem 1.5rem 1rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.field-filter-bar::-webkit-scrollbar {
  display: none;
}

.field-filter-trigger,
.field-filter-menu {
  display: none;
}

.field-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 2.2em;
  padding: 0 1.5rem;
  border: 1px solid rgba(185, 197, 139, 0.72);
  border-radius: 0.75rem;
  background: rgba(250, 250, 241, 0.92);
  color: #2b331d;
  font-size: 1.25rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: inset 0 0 1.25rem rgba(189, 198, 148, 0.16);
}

.field-chip-count {
  color: inherit;
  font-weight: 600;
}

.field-chip.active {
  border-color: rgba(196, 206, 153, 0.95);
  background: rgba(214, 221, 177, 0.94);
  color: rgba(23, 68, 58, 1);
}

.image-card-grid {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.img-card {
  width: 100%;
  border-radius: .75rem;
  overflow: hidden;
  background-color: #eee;
}

.img-card-cover {
  position: relative;
}

.img-card-img {
  display: block;
  width: 100%;
  height: auto;
}

.img-card-placeholder {
  width: 100%;
  aspect-ratio: 1.3 / 1;
  background: #24303d;
}

.img-card-select {
  position: absolute;
  right: 12px;
  top: 12px;
  width: 2rem;
  height: 2rem;
  border: 2px solid rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.img-card-select.active {
  background: #0f75ff;
}

.select-icon {
  width: 60%;
  object-fit: contain;
}

.img-card-name {
  position: absolute;
  left: 10px;
  bottom: 42px;
  max-width: calc(100% - 20px);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.65);
}

.img-card-detail {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.62);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
}

.list-detail-backdrop {
  position: absolute;
  inset: 0;
  z-index: 70;
  background: rgba(3, 7, 18, 0.42);
}

@media (max-width: 640px) {
  .list-view {
    padding-top: 4.5rem;
  }

  .field-filter-bar {
    z-index: 30;
    display: block;
    padding: 0.75rem 1rem 0.625rem;
    overflow: visible;
  }

  .field-filter-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 8.75rem;
    min-height: 2.75rem;
    padding: 0 0.875rem;
    border: 1px solid rgba(185, 197, 139, 0.72);
    border-radius: 0.75rem;
    background: rgba(250, 250, 241, 0.92);
    color: #2b331d;
    font-size: 1rem;
    font-weight: 600;
    box-shadow: inset 0 0 1.25rem rgba(189, 198, 148, 0.16);
    cursor: pointer;
  }

  .field-filter-arrow {
    margin-left: auto;
    font-size: 1.1rem;
    line-height: 1;
    transition: transform 0.18s ease;
  }

  .field-filter-trigger[aria-expanded='false'] {
    .field-filter-arrow {
      transform: rotate(180deg);
    }
  }

  .field-chip {
    display: none;
  }

  .field-filter-menu {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 1rem;
    z-index: 35;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: min(22rem, calc(100vw - 2rem));
    padding: 0.75rem;
    border: 0.0625rem solid #e5e5e5;
    border-radius: 0.75rem;
    background: #fff;
    box-shadow: 0 0.75rem 1.75rem rgba(15, 23, 42, 0.16);
  }

  .field-filter-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 3rem;
    padding: 0 0.75rem;
    border: 0;
    border-radius: 0.625rem;
    background: transparent;
    color: #374151;
    font-size: 1rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;

    &.active {
      background: #f3f4f6;
      color: #111827;
    }
  }

  .field-filter-option-meta {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .field-filter-check {
    color: #111827;
    font-size: 1.1rem;
    font-weight: 700;
    line-height: 1;
  }

  .image-card-grid {
    padding-top: 0.25rem;
  }
}
</style>
