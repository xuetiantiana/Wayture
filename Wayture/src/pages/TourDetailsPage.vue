<template>
  <section class="flex-row tour-details-shell" style="">
    <aside class="panel-card p-24 side-panel">
      <div class="flex-row justify-between align-center mb-20">
        <div>
          <h2 class="section-title">游览详情</h2>
          <p class="subtitle">{{ routeSummary || 'AI 正在为你规划最佳游览路线。' }}</p>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="tour.routeLoading.value" class="route-loading">
        <div class="loading-spinner"></div>
        <p>正在规划最佳路线...</p>
      </div>

      <!-- 路线列表 -->
      <div v-else class="progress-list">
        <div v-for="(point, index) in orderedPoints" :key="point.id" class="progress-item"
          :class="{ active: highlightId === point.id }"
          @click="setHighlight(point.id)">
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-content">
            <span class="label">景点</span>
            <p><strong>{{ index + 1 }}.{{ point.name }}-{{ point.field }}</strong></p>
            <div class="content-detail">
              <p> 建议停留: {{ point.cost }}</p>
            <p class="step-description">{{ point.description }}</p>
            <p v-if="tipsMap.get(point.id)" class="step-tips">tips: {{ tipsMap.get(point.id) }}</p>
            </div>
          </div>
        </div>
      </div>
      <button class="button-primary mt-24" @click="toPostcard" :disabled="tour.routeLoading.value">去生成明信片</button>
    </aside>
    <section class="map-panel panel-card p-24">
      <div class="map-toolbar">
        <strong>小七幸福一家尺木神奇世界一日游</strong>
        <div class="map-actions">
          <span class="map-action map-action-edit" @click="editMap">✎ 编辑地图</span>
          <span class="map-action map-action-confirm" @click="generatePostcard()">☼ {{ postcardGenerating ? '生成中' : '确定' }}</span>
        </div>
      </div>
      <div style="flex: 1;">
        <div class="map-frame tour-map">
        <canvas ref="mapCanvas" class="map-canvas"></canvas>
        <div v-if="postcardImageUrl || postcardGenerating" class="postcard-preview">
          <!-- <span v-if="postcardGenerating">正在生成明信片...</span> -->
          <div v-if="postcardGenerating" class="postcard-loading">
            <div class="loading-icons">
              <img :src="icon1" alt="">
              <img :src="icon2" alt="">
              <img :src="icon3" alt="">
            </div>
            <p>内容正在生成中......</p>
          </div>
          <img v-else :src="postcardImageUrl" alt="明信片">
        </div>
      </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTourStore } from '../composables/useTourStore';
import icon1 from '../assets/images/icon1.png';
import icon2 from '../assets/images/icon2.png';
import icon3 from '../assets/images/icon3.png';

const router = useRouter();
const tour = useTourStore();
const points = tour.points;
const selectedPoints = tour.selectedPoints;
const highlightId = tour.highlightId;
const routeSummary = tour.routeSummary;
const mapCanvas = ref<HTMLCanvasElement | null>(null);
const postcardGenerating = ref(false);
const postcardImageUrl = ref('');
const promptParts = ref<string[]>([]);
const mapImageElement = new Image();
mapImageElement.src = tour.mapImageUrl;

const styleMap: Record<string, string> = {
  family: '全家游',
  solo: '单身游',
  couple: '情侣游',
  relaxed: '轻松游',
};

const fieldColorMap: Record<string, string> = {
  '魔法森林': '#10B981',
  '尺木小镇': '#8B5A2B',
  '尖叫小镇': '#1E2A9B',
  '小勇士的冒险亲子乐园': '#1E2A9B',
  '冒险者俱乐部': '#FF8A00',
  '萌宠乐园': '#7A7A7A'
};

function getFieldColor(field: string): string {
  return fieldColorMap[field] || '#64748B';
}

const orderedPoints = computed(() => {
  return tour.selectedIds.value
    .map((id) => selectedPoints.value.find((item) => item.id === id))
    .filter((item): item is typeof selectedPoints.value[number] => Boolean(item));
});

const currentHighlight = computed(
  () => orderedPoints.value.find((item) => item.id === highlightId.value) ?? orderedPoints.value[0] ?? null
);

const tipsMap = computed(() => {
  const map = new Map<number, string>();
  tour.routePlan.value.forEach((entry: any) => {
    const id = entry.attraction?.id;
    if (id != null && entry.tips) {
      map.set(id, entry.tips);
    }
  });
  return map;
});

function drawMap() {
  const canvas = mapCanvas.value;
  if (!canvas || !mapImageElement.complete) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.drawImage(mapImageElement, 0, 0, rect.width, rect.height);

  points.value.forEach((point) => {
    const x = (point.location[0] / 100) * rect.width;
    const y = (point.location[1] / 100) * rect.height;
    const routeEntry = tour.routePlan.value.find((entry: any) => entry.attraction?.id === point.id);
    const routeIndex = tour.selectedIds.value.indexOf(point.id);
    const routeOrder = routeEntry?.order ?? routeIndex + 1;
    const isRoutePoint = !!routeEntry || routeIndex >= 0;
    const radius = isRoutePoint ? 14 : 7;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = getFieldColor(point.field);
    ctx.fill();
    ctx.lineWidth = isRoutePoint ? 3 : 2;
    ctx.strokeStyle = isRoutePoint ? '#ffffff' : 'rgba(255, 255, 255, 0.78)';
    ctx.stroke();

    if (isRoutePoint) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 13px Inter, ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const metrics = ctx.measureText(String(routeOrder));
      const textOffsetY = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
      ctx.fillText(String(routeOrder), x, y + textOffsetY);
    }
  });
}

function setHighlight(id: number) {
  tour.setHighlight(id);
}

function toPostcard() {
  router.push('/postcard');
}

function editMap() {
  router.push('/main');
}

function normalizeImageUrl(url: string): string {
  if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${tour.apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
}

async function generatePostcard(additionPrompt = promptParts.value.join('\n')) {
  if (postcardGenerating.value) {
    return;
  }

  postcardGenerating.value = true;
  try {
    const resp = await fetch(`${tour.apiBase}/api/generate-postcard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: tour.currentUsername.value,
        route_plan: tour.routePlan.value,
        attractions: tour.selectedPoints.value,
        addition_prompt: additionPrompt,
      }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    postcardImageUrl.value = data.image_url ? normalizeImageUrl(data.image_url) : '';
  } catch (error) {
    console.error('生成明信片出错:', error);
  } finally {
    postcardGenerating.value = false;
  }
}

function resizeCanvas() {
  drawMap();
}

function initPostcardPrompt() {
  const nickname = tour.userSettings.value.nickname;
  const tourStyle = tour.userSettings.value.tourStyle;
  const parts: string[] = [];
  if (nickname) parts.push(`昵称/标题: ${nickname}`);
  if (tourStyle) parts.push(`游览风格: ${styleMap[tourStyle] || tourStyle}`);
  promptParts.value = parts;
}

onMounted(async () => {
  // if (tour.selectedIds.value.length === 0) {
  //   router.replace('/main');
  //   return;
  // }

  // if (tour.points.value.length === 0) {
  //   await tour.loadTourPoints();
  // }

  initPostcardPrompt();

  if (points.value.length === 0) {
    await tour.loadTourPoints();
  }

  if (selectedPoints.value.length === 0) {
    router.replace('/main');
    return;
  }

  // 调用 API 规划路线，再根据接口返回的 route/order 重绘选中点
  await tour.planRoute();
  await nextTick();
  drawMap();

  if (!highlightId.value) {
    tour.setHighlight(orderedPoints.value[0]?.id ?? null);
  }
  if (mapImageElement.complete) {
    await nextTick();
    drawMap();
  } else {
    mapImageElement.onload = async () => {
      await nextTick();
      drawMap();
    };
  }
  window.addEventListener('resize', resizeCanvas);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
});

watch([points, orderedPoints, highlightId], async () => {
  await nextTick();
  drawMap();
});
</script>

<style scoped>
.tour-details-shell {
  position: relative;
  gap: 24px;
  height: 100vh;padding: 4em 2em 2em;box-sizing: border-box;
  background: #fff;
  color: #000;
  line-height: 1.6;
}
.side-panel {
  width: 27%;
  min-width: 400px;
  max-width: 600px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.map-panel {
  flex: 1;
  background-color: rgba(198, 185, 153, 1);
  display: flex;
  flex-direction: column;
}

.map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  background: #f7f7f7;
}

.map-toolbar strong {
  color: #111827;
  font-size: 1rem;
}

.map-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.map-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 7px;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
}

.map-action-edit {
  color: #4b5563;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
}

.map-action-confirm {
  color: #fff;
  background: #e2b82f;
  box-shadow: 0 2px 8px rgba(161, 111, 0, 0.22);
}

.route-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 16px;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(59, 130, 246, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-list {
  gap: 14px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2em 0;
  
  padding-right: 1em;
  padding-bottom: 4em;
}
.progress-item {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 14px;
  width: 100%;
  border-radius: 24px;
  color: inherit;
  text-align: left;
}


.step-number {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: rgba(59, 130, 246, 0.14);
  color: #eff6ff;
  font-weight: 700;
}

.step-content strong {
  display: block;
  font-size: 1rem;
  margin-bottom: 6px;
}

.step-content .label{
  font-size: 12px;
  border-radius: 4px;
  padding: .2em .4em;
  color: green;

}

.step-description {
  margin-top: 8px;
}

.content-detail{
  background:  rgba(59, 130, 246, 0.08);;
  padding: .5em .8em;
  border-radius: 16px;
  font-size: .875em;
}

 .step-tips {
  /* margin-top: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.08); */

   margin-top: 8px;
}

.subtitle {
  margin: 20px 0;
}

.station-count,
.current-label {
  font-size: 0.95rem;
}

.map-frame {
  position: relative;
  min-height: 560px;
  border-radius: 28px;
  overflow: hidden;
}

.map-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.postcard-preview {
 
  background: #fff;
  border: 2px dashed rgba(198, 196, 196, 1);

}

.postcard-preview img {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.postcard-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #333;
}

.postcard-loading p {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.loading-icons {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 14px;
}

.loading-icons img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  animation: loading-bounce 0.9s ease-in-out infinite;
}

.loading-icons img:nth-child(2) {
  animation-delay: 0.12s;
}

.loading-icons img:nth-child(3) {
  animation-delay: 0.24s;
}

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: translateY(0);
  }

  40% {
    transform: translateY(-10px);
  }
}

.info-card-overlay {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(520px, calc(100% - 40px));
  background: rgba(15, 23, 42, 0.97);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 36px 80px rgba(12, 30, 50, 0.35);
  backdrop-filter: blur(18px);
  z-index: 10;
}

.info-card-image {
  height: 220px;
  background-size: cover;
  background-position: center;
  background-color: #1e293b;
}

.info-card-body {
  padding: 22px 24px 24px;
}

.info-card-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.info-card-top h3 {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.2;
}

.info-card-body p {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.8;
}

.info-duration {
  color: #e0f2fe;
  font-weight: 700;
  white-space: nowrap;
}

@media (max-width: 980px) {
  .tour-details-shell {
    flex-direction: column;
  }
  .side-panel {
    width: 100%;
  }
}
</style>
