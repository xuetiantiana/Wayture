<template>
  <div class="list-view" style="background: #fff;">
    <div class="field-filter-bar">
      <button
        v-for="f in fieldFilters"
        :key="String(f.field)"
        class="field-chip"
        :class="{ active: selectedField === f.field }"
        @click="selectedField = f.field"
      >
        {{ f.label }}
      </button>
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
            <button class="img-card-detail" type="button" @click.stop="showDetail(point.id, $event)">详情介绍</button>
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
import checkIcon from '../assets/images/check-icon.png';
import type { TourPointData } from '../data/tourPoints';
import { calculateTriggerModalStyle } from '../utils/common.js';
import AttractionDetailModal from './AttractionDetailModal.vue';

const props = defineProps<{
  points: TourPointData[];
  selectedIds: number[];
  fieldColorMap: Record<string, string>;
  fixedFields: string[];
}>();

const emit = defineEmits<{
  add: [id: number];
}>();

const selectedField = ref<string | null>(null);
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
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  scrollbar-width: none;
}

.field-filter-bar::-webkit-scrollbar {
  display: none;
}

.field-chip {
  height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.55);
  color: #e2e8f0;
  font-size: 16px;
  cursor: pointer;
  white-space: nowrap;
}

.field-chip.active {
  border-color: rgb(255, 183, 0);
  background: rgb(255, 183, 0);
  color: #fff;
}

.image-card-grid {
  flex: 1;
  padding: 4px 16px 20px;
  overflow-y: auto;
  overflow-x: hidden;
}

.img-card {
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
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
  width: 32px;
  height: 32px;
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
  font-weight: 700;
  cursor: pointer;
}

.list-detail-backdrop {
  position: absolute;
  inset: 0;
  z-index: 70;
  background: rgba(3, 7, 18, 0.42);
}
</style>
