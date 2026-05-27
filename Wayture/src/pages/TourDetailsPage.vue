<template>
  <section
    class="flex-row tour-details-shell"
    :class="{ 'tour-list-shell': isTourListPage }"
  >
    <aside v-if="isTourListPage" class="tour-record-sidebar">
      <div class="sidebar-header">
        <button
          class="back-button"
          type="button"
          aria-label="返回"
          @click="editMap"
        >
          <el-icon><ArrowLeftBold /></el-icon>
        </button>
        <div class="album-label">
          <span>{{ t('common.back') }}</span>
        </div>
      </div>
      <div class="tour-record-list">
        <div
          v-for="record in allTourList"
          :key="record.id"
          class="tour-record-item"
          :class="{ active: activeTourRecordId === record.id }"
          @click="selectTourRecordById(record.id, false)"
        >
          <p>
            <strong>{{ record.title }}</strong>
          </p>
          <p>
            <span>{{ formatRecordDate(record.createdAt) }}</span>
          </p>
        </div>
      </div>
    </aside>

    <div class="tour-content-panels">
      <div v-if="isTourListPage" class="tour-content-toolbar">
        <strong>{{ activeTourTitle }}</strong>
        <div class="map-actions">
          <el-button class="create-memories-button" @click="createMemories">
              {{ t('tour.createMemories') }}
            </el-button>
          <template v-if="postcardImageUrl && !isPostcardPending">
            <el-button
              :loading="imageDownloading"
              :disabled="imageDownloading"
              type="primary"
              @click="downloadImage"
            >
              <template #icon>
                <Download />
              </template>
              <span>{{ t('common.downloadImage') }}</span>
            </el-button>
          </template>
          <template v-else-if="isPostcardPending">
            <el-button type="primary" :loading="true" disabled>
              {{ t('tour.mapPending') }}
            </el-button>
          </template>
          <template v-else>
            <span
              class="map-action map-action-confirm"
              :class="{ disabled: !canGeneratePostcard }"
              @click="generatePostcard()"
              >{{ t('tour.generateMap') }}</span
            >
          </template>
        </div>
      </div>
      <aside class="panel-card p-24 side-panel">
        <div class="details-topbar">
          <div class="details-title-row">
            <button
              v-if="!isTourListPage"
              class="details-back-button"
              type="button"
              aria-label="返回"
              @click="editMap"
            >
              <el-icon><ArrowLeftBold /></el-icon>
            </button>
            <h2 class="section-title">{{ !isTourListPage ? activeTourTitle : '地图路线' }}</h2>
            <button
              v-if="!isTourListPage"
              class="tour-map-button"
              type="button"
              aria-label="游览地图"
              @click="isTourListOpen = !isTourListOpen"
            >
              <img :src="listIcon" alt="" />
            </button>
          </div>
          <p class="subtitle">
            {{ activeRouteSummary || "AI 正在为你规划最佳游览路线。" }}
          </p>
        </div>

        <!-- 加载状态 -->
        <div v-if="displayError" class="route-error">
          <p>{{ displayError }}</p>
          <button
            type="button"
            class="retry-button"
            @click="generatePostcard()"
          >
            {{ t('tour.retry') }}
          </button>
        </div>

        <!-- 路线列表 -->
        <div v-else class="progress-list">
          <div
            v-for="(point, index) in orderedPoints"
            :key="point.id"
            class="progress-item"
            :class="{ active: activeHighlightId === point.id }"
            @mouseenter="setHoverPoint(point.id)"
            @mouseleave="clearHoverPoint"
          >
            <div class="step-number">
              <img
                v-if="point.images?.[0]"
                :src="point.images[0]"
                :alt="point.name"
              />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="step-content">
              <span class="label">景点</span>
              <p>
                <strong
                  >{{ index + 1 }}.{{ point.name }}</strong
                >&nbsp;- {{ point.field }}
              </p>
              <div class="content-detail">
                <p>建议停留: {{ point.cost }}</p>
                <p class="step-description">{{ point.description }}</p>
                <p v-if="tipsMap.get(point.id)" class="step-tips">
                  tips: {{ tipsMap.get(point.id) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="isTourListOpen"
          class="tour-list-layer"
          @click.self="isTourListOpen = false"
        >
          <aside
            class="tour-list-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="游览列表"
          >
            <header class="tour-list-header">
              <strong>{{ activeTourTitle }}</strong>
              <button
                type="button"
                aria-label="关闭游览列表"
                @click="isTourListOpen = false"
              >
                ×
              </button>
            </header>
            <div class="tour-list-body">
              <button
                v-for="record in allTourList"
                :key="record.id"
                class="tour-list-item"
                :class="{ active: activeTourRecordId === record.id }"
                type="button"
                @click="selectTourRecordById(record.id)"
              >
                {{ record.title }}
              </button>
            </div>
          </aside>
        </div>
      </aside>
      <section class="map-panel panel-card p-24">
        <div class="map-toolbar">
          <strong>{{ activeTourTitle }}</strong>
          <div class="map-actions">
            <template v-if="postcardImageUrl && !isPostcardPending">
              <el-button class="create-memories-button" @click="createMemories">
                {{ t('tour.createMemories') }}
              </el-button>
              <el-button
                :loading="imageDownloading"
                :disabled="imageDownloading"
                type="primary"
                @click="downloadImage"
              >
                <template #icon>
                  <Download />
                </template>
                <span>{{ t('common.downloadImage') }}</span>
              </el-button>
            </template>
            <template v-else-if="isPostcardPending">
              <el-button type="primary" :loading="true" disabled>
                {{ t('tour.mapPending') }}
              </el-button>
            </template>
            <template v-else>
              <span class="map-action map-action-edit" @click="editMap"
                >{{ t('tour.editMap') }}</span
              >
              <span
                class="map-action map-action-confirm"
                :class="{ disabled: !canGeneratePostcard }"
                @click="generatePostcard()"
                >{{ t('tour.generateMap') }}</span
              >
            </template>
          </div>
        </div>
        <div class="map-scroll-area">
          <div
            ref="downloadContainer"
            :style="{
              width: '600px',
              margin: '0 auto',
            }"
            class="dowmload-container"
          >
            <div class="map-frame tour-map">
              <img class="map-image" :src="tour.mapImageUrl" alt="园区地图" />
              <div
                v-for="point in points"
                :key="point.id"
                class="map-point"
                :class="{
                  selected: routePlanned && isRoutePoint(point.id),
                  active: activeHighlightId === point.id,
                }"
                :style="getMapPointStyle(point)"
                @mouseenter="setHoverPoint(point.id)"
                @mouseleave="clearHoverPoint"
              >
                <span
                  v-if="routePlanned && isRoutePoint(point.id)"
                  class="map-point-order"
                >
                  {{ getRouteOrder(point.id) }}
                </span>
                <span
                  v-if="routePlanned && isRoutePoint(point.id)"
                  class="map-point-name"
                >
                  {{ point.name }}
                </span>
              </div>
            </div>
            <div
              v-if="postcardImageUrl || isPostcardPending"
              class="postcard-preview"
            >
              <div v-if="isPostcardPending" class="postcard-loading">
                <div class="loading-icons">
                  <img :src="icon2" alt="" />
                  <img :src="icon1" alt="" />
                  <img :src="icon3" alt="" />
                </div>
                <p>地图正在生成中，等待时间可能稍长，<br />你可以稍后查看...</p>
              </div>
              <img
                v-else
                :key="`${activeTourRecordId}-${postcardImageUrl}`"
                :src="postcardImageUrl"
                alt="明信片"
                width="100%"
              />
            </div>
            <el-button
              v-if="postcardImageUrl && !isPostcardPending"
              class="download-container-button"
              :loading="imageDownloading"
              :disabled="imageDownloading"
              type="primary"
              data-html2canvas-ignore="true"
              @click="downloadImage"
            >
              <template #icon>
                <Download />
              </template>
              <span>{{ t('common.download') }}</span>
            </el-button>
          </div>
          <p
            style="
              margin-top: 1rem;
              font-size: 0.875rem;
              color: #555;
              text-align: center;
              padding: 0 2rem 2rem;
            "
          >
            {{ t('tour.printHint') }}
          </p>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import html2canvas from "html2canvas";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeftBold, Download } from "@element-plus/icons-vue";
import { useTourStore } from "../composables/useTourStore";
import icon1 from "../assets/images/icon1.png";
import icon2 from "../assets/images/icon2.png";
import icon3 from "../assets/images/icon3.png";
import listIcon from "../assets/images/list.png";
import { getFieldColor } from "../data/fieldConfig";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const tour = useTourStore();
const points = tour.points;
const allTourList = tour.allTourList;
const activeTourRecordId = tour.activeTourRecordId;
const downloadContainer = ref<HTMLElement | null>(null);
const imageDownloading = ref(false);
const promptParts = ref<string[]>([]);
const routeError = ref("");
const hoverPointId = ref<number | null>(null);
const isTourListOpen = ref(false);
const postcardPollInterval = 30000;
let postcardPollTimer: ReturnType<typeof setTimeout> | null = null;

// 当前页面只展示 allTourList 中正在激活的路线记录。
const activeTourRecord = computed(
  () =>
    allTourList.value.find((item) => item.id === activeTourRecordId.value) ??
    null,
);

// 明信片图片地址持久化在当前路线记录中，页面展示时统一做 API base 补全。
const postcardImageUrl = computed(() =>
  activeTourRecord.value?.postcardImageUrl
    ? normalizeImageUrl(activeTourRecord.value.postcardImageUrl)
    : "",
);

const isPostcardPending = computed(
  () => activeTourRecord.value?.postcardStatus === "pending",
);
const displayError = computed(
  () => routeError.value || activeTourRecord.value?.postcardError || "",
);
const routePlanned = computed(
  () => (activeTourRecord.value?.routePlan.length ?? 0) > 0,
);
const activeHighlightId = computed(() => hoverPointId.value);
const isTourListPage = computed(() => route.path === "/tour-list");

// 生成明信片依赖当前路线记录，不再依赖临时页面状态。
const canGeneratePostcard = computed(
  () =>
    routePlanned.value &&
    !routeError.value &&
    !isPostcardPending.value &&
    !!activeTourRecord.value,
);

const userDisplayName = computed(
  () =>
    tour.userSettings.value.nickname || tour.currentUsername.value || "Wayture",
);

// 顶部标题跟随当前路线记录切换。
const activeTourTitle = computed(() => {
  const record = allTourList.value.find(
    (item) => item.id === activeTourRecordId.value,
  );
  return record?.title || `${userDisplayName.value}幸福一家尺木神奇世界一日游`;
});

const activeRouteSummary = computed(
  () => activeTourRecord.value?.routeSummary || "",
);

// 根据当前路线记录中的 selectedIds 恢复路线顺序。
const orderedPoints = computed(() => {
  return (activeTourRecord.value?.selectedIds ?? [])
    .map((id) => points.value.find((item) => item.id === id))
    .filter((item): item is (typeof points.value)[number] => Boolean(item));
});

// 规划接口返回的 tips 仍然从当前路线记录恢复到 routePlan 中读取。
const tipsMap = computed(() => {
  const map = new Map<number, string>();
  activeTourRecord.value?.routePlan.forEach((entry: any) => {
    const id = entry.attraction?.id;
    if (id != null && entry.tips) {
      map.set(id, entry.tips);
    }
  });
  return map;
});

function getMapPointStyle(point: (typeof points.value)[number]) {
  return {
    left: `${point.location[0]}%`,
    top: `${point.location[1]}%`,
    backgroundColor: getFieldColor(point.field),
  };
}

function getRouteOrder(id: number) {
  const routeEntry = activeTourRecord.value?.routePlan.find(
    (entry: any) => entry.attraction?.id === id,
  );
  const routeIndex = activeTourRecord.value?.selectedIds.indexOf(id) ?? -1;
  return routeEntry?.order ?? routeIndex + 1;
}

function isRoutePoint(id: number) {
  return activeTourRecord.value?.selectedIds.includes(id) ?? false;
}

function setHoverPoint(id: number) {
  hoverPointId.value = id;
}

function clearHoverPoint() {
  hoverPointId.value = null;
}

function formatRecordDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function selectTourRecordById(recordId: string, closeDrawer = true) {
  const selected = tour.setActiveTourRecord(recordId);
  if (!selected) return;

  if (closeDrawer) {
    isTourListOpen.value = false;
  }

  hoverPointId.value = null;
  routeError.value = "";
  stopPostcardPolling();
  autoGeneratePostcard();
}

function editMap() {
  router.push("/main");
}

function createMemories() {
  router.push("/memories");
}

function normalizeImageUrl(url: string): string {
  if (
    !url ||
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return `${tour.apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
}

// 兼容直接返回 image_url，以及任务结果中嵌套返回图片的几种结构。
function extractPostcardImageUrl(data: any): string {
  return (
    data?.image_url ||
    data?.result?.image_url ||
    data?.result?.postcard?.image_url ||
    data?.result?.memory?.images?.[0]?.generated_url ||
    ""
  );
}

function extractPostcardTitle(data: any): string {
  return data?.title || data?.result?.title || "";
}

// 页面销毁或切换路线时停止旧任务轮询，避免多个定时器同时更新记录。
function stopPostcardPolling() {
  if (postcardPollTimer) {
    clearTimeout(postcardPollTimer);
    postcardPollTimer = null;
  }
}

// 后端图片生成是异步任务，首次立即查询，后续按固定间隔查询当前任务状态。
function schedulePostcardPolling(taskId: string) {
  stopPostcardPolling();
  postcardPollTimer = setTimeout(() => {
    pollPostcardTask(taskId);
  }, postcardPollInterval);
}

// 轮询 /api/tasks/{username}/{task_id}，完成后把结果写回当前路线记录。
async function pollPostcardTask(taskId: string) {
  const record = activeTourRecord.value;
  if (!record || record.postcardTaskId !== taskId) return;

  try {
    const username = encodeURIComponent(tour.currentUsername.value);
    const resp = await fetch(
      `${tour.apiBase}/api/tasks/${username}/${encodeURIComponent(taskId)}`,
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    if (data.status === "completed") {
      const imageUrl = extractPostcardImageUrl(data);
      const title = extractPostcardTitle(data);
      tour.updateTourRecord(record.id, {
        ...(title ? { title } : {}),
        postcardStatus: "completed",
        postcardImageUrl: imageUrl,
        postcardData: data.result ?? data,
        postcardError: "",
      });
      stopPostcardPolling();
      return;
    }

    if (data.status === "failed" || data.status === "error") {
      tour.updateTourRecord(record.id, {
        postcardStatus: "failed",
        postcardError: "明信片生成失败，请重试。",
      });
      stopPostcardPolling();
      return;
    }

    schedulePostcardPolling(taskId);
  } catch (error) {
    console.error("查询明信片任务失败:", error);
    schedulePostcardPolling(taskId);
  }
}

// 生成明信片会先把当前路线记录标记为 pending，再根据返回结果直接完成或继续轮询。
async function generatePostcard(additionPrompt = promptParts.value.join("\n")) {
  if (!canGeneratePostcard.value) {
    return;
  }

  const record = activeTourRecord.value;
  if (!record) return;

  routeError.value = "";
  tour.updateTourRecord(record.id, {
    postcardStatus: "pending",
    postcardTaskId: "",
    postcardImageUrl: "",
    postcardData: null,
    postcardError: "",
  });
  try {
    const resp = await fetch(`${tour.apiBase}/api/generate-postcard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: tour.currentUsername.value,
        route_plan: record.routePlan,
        attractions: record.selectedIds
          .map((id) => points.value.find((point) => point.id === id))
          .filter(Boolean),
        addition_prompt: additionPrompt,
      }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const taskId = data.image_task_id || data.task_id;
    const imageUrl = extractPostcardImageUrl(data);
    const title = extractPostcardTitle(data);

    if (imageUrl) {
      tour.updateTourRecord(record.id, {
        ...(title ? { title } : {}),
        postcardStatus: "completed",
        postcardTaskId: taskId || "",
        postcardImageUrl: imageUrl,
        postcardData: data,
        postcardError: "",
      });
      return;
    }

    if (!taskId) throw new Error("未返回明信片任务 ID");

    tour.updateTourRecord(record.id, {
      ...(title ? { title } : {}),
      postcardStatus: "pending",
      postcardTaskId: taskId,
      postcardData: data,
      postcardError: "",
    });
    stopPostcardPolling();
    pollPostcardTask(taskId);
  } catch (error) {
    console.error("生成明信片出错:", error);
    tour.updateTourRecord(record.id, {
      postcardStatus: "failed",
      postcardError: "明信片生成失败，请重试。",
    });
  }
}

// 新路线首次进入详情页会自动生成；历史路线已有结果则直接复用。
function autoGeneratePostcard() {
  const record = activeTourRecord.value;
  if (!record || !routePlanned.value) return;

  if (record.postcardStatus === "pending" && record.postcardTaskId) {
    stopPostcardPolling();
    pollPostcardTask(record.postcardTaskId);
    return;
  }

  if (record.postcardStatus === "completed" && record.postcardImageUrl) return;

  generatePostcard();
}

async function downloadImage() {
  if (imageDownloading.value || !downloadContainer.value) {
    return;
  }

  imageDownloading.value = true;
  try {
    await nextTick();
    const downloadScale = Math.max(window.devicePixelRatio || 1, 3);
    const canvas = await html2canvas(downloadContainer.value, {
      backgroundColor: "#ffffff",
      scale: downloadScale,
      useCORS: true,
    });
    const link = document.createElement("a");
    link.download = `wayture-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (error) {
    console.error("下载图片失败:", error);
  } finally {
    imageDownloading.value = false;
  }
}

function initPostcardPrompt() {
  const nickname = tour.userSettings.value.nickname;
  const tourStyle = tour.userSettings.value.tourStyle;
  const parts: string[] = [];
  if (nickname) parts.push(`昵称/标题: ${nickname}`);
  if (tourStyle) parts.push(`游览风格: ${tourStyle}`);
  promptParts.value = parts;
}

onMounted(async () => {
  initPostcardPrompt();

  if (points.value.length === 0) {
    await tour.loadTourPoints();
  }

  const loadedRecord = activeTourRecordId.value
    ? tour.setActiveTourRecord(activeTourRecordId.value)
    : tour.loadLatestTourRecord();

  // 没有可展示的路线记录时回到选点页。
  if (!loadedRecord || orderedPoints.value.length === 0) {
    router.replace("/main");
    return;
  }

  autoGeneratePostcard();
});

onBeforeUnmount(() => {
  stopPostcardPolling();
});
</script>

<style scoped lang="scss">
.tour-details-shell {
  position: relative;
  z-index: 555;
  gap: 0;
  box-sizing: border-box;
  height: 100vh;
  padding: 0;
  background: #fff;
  color: #000;
  line-height: 1.6;

  .tour-content-panels {
    display: flex;
    flex: 1;
    min-width: 0;
    height: 100%;
    background: #f5f5f5;
  }

  .tour-content-toolbar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 8;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    box-sizing: border-box;
    min-height: 4rem;
    padding: 1rem 1.125rem;
    background: #fff;

    strong {
      min-width: 0;
      overflow: hidden;
      color: #111827;
      font-size: 1.125rem;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }

    .map-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      gap: 0.625rem;
    }

    .create-memories-button {
      border: 1px solid;
      background: #2f2f2f !important;
      color: #fff !important;
    }

    .map-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2.25rem;
      padding: 0 0.875rem;
      border-radius: 0.4375rem;
      font-size: 0.92rem;
      font-weight: 700;
      cursor: pointer;
      user-select: none;

      &.map-action-edit {
        background: #fff;
        color: #4b5563;
        box-shadow: 0 0.125rem 0.5rem rgba(15, 23, 42, 0.18);
      }

      &.map-action-confirm {
        background: #e2b82f;
        color: #fff;
        box-shadow: 0 0.125rem 0.5rem rgba(161, 111, 0, 0.22);
      }

      &.disabled {
        opacity: 0.55;
        cursor: not-allowed;
        pointer-events: none;
        box-shadow: none;
      }
    }
  }

  .tour-record-sidebar {
    display: flex;
    flex: 0 0 18rem;
    flex-direction: column;
    box-sizing: border-box;
    min-width: 0;
    height: 100%;
    padding: 1.25rem 0 1.4rem 1.2em;
    background: #fff;
    border-bottom: 1px solid #eee;
    box-shadow: 0px -1px 0px 0px rgba(0, 0, 0, 0.25);
    border-right: 1px solid #f5f5f5;

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      margin-bottom: 2rem;
    }

    .back-button {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border: 0;
      border-radius: 0.5625rem;
      background: #e9e9e9;
      color: #1f2933;
      line-height: 1;
      cursor: pointer;
    }

    .album-label {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0 0.125rem;
      color: #2f2f2f;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .tour-record-list {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.5rem;
      min-height: 0;
      overflow-y: auto;

      .tour-record-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        width: calc(100% - 1.5rem);
        padding: 0.625rem 0.75rem;
        border-radius: 0.5rem;
        line-height: 1.6;
        cursor: pointer;

        strong {
          display: block;
          overflow: hidden;
          font-weight: 500;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        span {
          color: #666;
          font-size: 0.875rem;
        }

        &:hover {
          background: rgba(222, 222, 222, 0.6);
        }

        &.active {
          background: rgba(222, 222, 222, 0.6);
        }
      }
    }
  }

  &.tour-list-shell {
    .tour-content-panels {
      position: relative;
      box-sizing: border-box;
      padding-top: 4.8rem;
      background: #f5f5f5;
    }

    .side-panel {
      width: 34%;
      min-width: 22rem;
      margin: 1rem;
      border-radius: 1rem;
    }

    .map-panel {
      .map-toolbar {
        display: none;
      }
    }
  }

  .side-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 40%;
    min-width: 25rem;
    max-width: 45rem;
    overflow: visible;
    padding: 0 .75rem;
    background: #fff;

    .details-topbar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-sizing: border-box;
      margin-bottom: 1.25rem;
      padding: 1.3rem 0.5rem 0;
    }

    .details-title-row {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }

    .details-back-button {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border: 0;
      border-radius: 0.625rem;
      background: #e9e9e9;
      color: #1f2933;
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
    }

    .tour-map-button {
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 2.75rem;
      height: 2.75rem;
      padding: 0;
      border: 0;
      border-radius: 0.5rem;
      background: transparent;
      color: #111;
      font-size: 2rem;
      line-height: 1;
      cursor: pointer;

      &:hover {
        background: #f1f1f1;
      }

      img {
        display: block;
        width: 2rem;
        height: 2rem;
        object-fit: contain;
      }
    }

    .section-title {
      flex: 1 1 auto;
      margin: 0;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subtitle {
      margin: 0;
    }

    .route-error {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.875rem;
      padding: 1.5rem;
      border-radius: 1.125rem;
      background: rgba(239, 68, 68, 0.08);
      color: #991b1b;

      p {
        margin: 0;
      }

      .retry-button {
        min-height: 2.25rem;
        padding: 0 1rem;
        border: 0;
        border-radius: 0.5rem;
        background: rgb(255, 183, 0);
        color: #fff;
        font-weight: 700;
        cursor: pointer;

        &:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      }
    }

    .progress-list {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 2em 0;
      overflow-y: auto;
      padding-right: 1em;
      padding-bottom: 4em;

      .progress-item {
        display: grid;
        grid-template-columns: 5rem 1fr;
        gap: 0.875rem;
        width: 100%;
        border-radius: 12px;
        color: inherit;
        cursor: pointer;
        padding: 0.5rem;
        text-align: left;
        transition:
          background-color 0.18s ease,
          box-shadow 0.18s ease;

        &.active {
          background: rgba(255, 183, 0, 0.02);
          box-shadow: inset 0 0 0 1.5px rgba(255, 183, 0, 0.6);

          .content-detail {
            background: rgba(30, 0, 255, 0.18);
          }
        }

        .step-number {
          display: grid;
          place-items: center;
          width: 4.5rem;
          height: 4.5rem;
          overflow: hidden;
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.14);
          color: #eff6ff;
          font-weight: 700;

          img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }

        .step-content {
          strong {
            margin-bottom: 0.375rem;
          }

          .label {
            padding: 0.2em 0.4em;
            border-radius: 0.25rem;
            color: green;
            font-size: 0.75rem;
          }

          .content-detail {
            padding: 0.5em 0.8em;
            border-radius: 8px;
            background: #f5f5f5;
            font-size: 0.875em;

            .step-description {
              margin-top: 0.5rem;
            }

            .step-tips {
              margin-top: 0.5rem;
            }
          }
        }
      }
    }
  }

  .tour-list-layer {
    position: absolute;
    top: 1.25rem;
    left: calc(100% - 1rem);
    z-index: 30;
    width: min(20rem, calc(100vw - 100% - 1.5rem));
    min-width: 24rem;
    max-height: calc(100% - 2em);
    background: transparent;
    display: flex;
    flex-direction: column;
  }

  .tour-list-drawer {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    border-radius: 16px;
    background: #fff;
    border: 1px solid rgba(236, 236, 236, 1);
    box-shadow: 0px 0px 8px 0px rgba(92, 92, 92, 0.1);
    flex: 1;
    overflow: hidden;

    .tour-list-header {
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      min-height: 4rem;
      padding: 0 2rem;
      border-bottom: 0.0625rem solid #e2e2e2;
      background: #fff;

      strong {
        min-width: 0;
        overflow: hidden;
        color: #111;
        font-size: 1.125rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      button {
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        width: 2rem;
        height: 2rem;
        border: 0;
        border-radius: 0.375rem;
        background: transparent;
        color: #555;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
      }
    }

    .tour-list-body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      overflow-y: auto;
      padding: 0.5rem 0.5rem;
      flex: 1;
    }

    .tour-list-item {
      width: 100%;
      min-height: 2.75rem;
      padding: 0 1rem;
      border: 0;
      border-radius: 0.625rem;
      background: transparent;
      color: #222;
      text-align: left;
      cursor: pointer;

      &.active {
        background: #e5e5e5;
      }

      &:hover {
        background: #e5e5e5;
      }
    }
  }

  .map-panel {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    background-color: #f5f5f5;

    .map-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.125rem;
      background: #fff;

      strong {
        color: #111827;
        font-size: 1.125rem;
      }

      .map-actions {
        display: flex;
        align-items: center;
        gap: 0.625rem;

        .create-memories-button {
          border: 1px solid;
          background: #2f2f2f !important;
          color: #fff !important;
        }

        .map-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 2.25rem;
          padding: 0 0.875rem;
          border-radius: 0.4375rem;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          user-select: none;

          &.map-action-edit {
            background: #fff;
            color: #4b5563;
            box-shadow: 0 0.125rem 0.5rem rgba(15, 23, 42, 0.18);
          }

          &.map-action-confirm {
            background: #e2b82f;
            color: #fff;
            box-shadow: 0 0.125rem 0.5rem rgba(161, 111, 0, 0.22);
          }

          &.disabled {
            opacity: 0.55;
            cursor: not-allowed;
            pointer-events: none;
            box-shadow: none;
          }
        }
      }
    }

    .map-scroll-area {
      flex: 1;
      min-width: 0;
      overflow: auto;
      padding: 2em 0;
    }

    .dowmload-container {
      position: relative;
      min-width: 0;

      .download-container-button {
        position: absolute;
        right: 1rem;
        bottom: 1rem;
        z-index: 5;
        height: 2.25em !important;
        font-size: 0.875rem !important;
        background: rgba(0, 0, 0, 0.62) !important;
        color: #fff !important;
      }
    }

    .map-frame {
      position: relative;
      overflow: hidden;
      width: 100%;
      min-width: 0;
      margin: 0 auto;

      .map-image {
        display: block;
        width: 100%;
        height: auto;
      }

      .map-point {
        position: absolute;
        z-index: 2;
        display: grid;
        place-items: center;
        width: 0.875rem;
        height: 0.875rem;
        border: 0.125rem solid #fff;
        border-radius: 999rem;
        color: #fff;
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1;
        cursor: pointer;
        transform: translate(-50%, -50%);
        transition:
          box-shadow 0.18s ease,
          width 0.18s ease,
          height 0.18s ease;

        .map-point-order {
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
          line-height: 1;
        }

        .map-point-name {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 0.2rem);
          max-width: 8rem;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          background: rgba(31, 31, 31, 0.72);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          transform: translateX(-50%);
          white-space: nowrap;
          pointer-events: none;
        }

        &.selected {
          width: 1.75rem;
          height: 1.75rem;
          border-width: 0.1875rem;
          border-color: #fff;
        }

        &.active {
          width: 1.2rem;
          height: 1.2rem;
          box-shadow: 0 0 0 0.25rem rgba(255, 255, 255, 0.24);
        }

        &.selected.active {
          width: 2.1rem;
          height: 2.1rem;
          box-shadow: 0 0 0 0.375rem rgba(255, 255, 255, 0.28);
        }
      }
    }

    .postcard-preview {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      aspect-ratio: 1536 / 1024;
      background: #fff;
      overflow: hidden;

      &::after {
        content: "";
        position: absolute;
        inset: 0;
        border: 0.125rem dashed rgba(198, 196, 196, 1);
        pointer-events: none;
        z-index: 1;
      }

      img {
        display: block;
        width: auto;
        height: 100%;
        position: relative;
        z-index: 2;
        // object-fit: cover;
      }

      .postcard-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.875rem;
        padding: 3em;
        color: #333;
        text-align: center;

        p {
          margin: 0;
        }

        .loading-icons {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 0.875rem;

          img {
            width: 2.5rem;
            height: 2.5rem;
            object-fit: contain;
            animation: loading-bounce 0.9s ease-in-out infinite;

            &:nth-child(2) {
              animation-delay: 0.12s;
            }

            &:nth-child(3) {
              animation-delay: 0.24s;
            }
          }
        }
      }
    }
  }
}

@keyframes loading-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
  }

  40% {
    transform: translateY(-0.625rem);
  }
}

@media (max-width: 980px) {
  .flex-row {
    flex-direction: column;
  }
}
@media (max-width: 680px) {
  .tour-details-shell {
    flex-direction: column;
    gap: 1rem;
    height: auto;
    min-height: 100vh;
    padding: 1rem 1rem 1.25rem;

    .tour-content-panels {
      flex-direction: column;
      gap: 1rem;
      height: auto;

      .side-panel {
        width: 100%;
      }
    }

    .side-panel {
      padding: 0;
      width: 100%;
      min-width: 0;
      max-width: none;
      max-height: none;
      overflow: visible;

      .details-topbar {
        padding-top: 0;
      }

      .progress-list {
        flex: none;
        max-height: 42vh;
        gap: 0.875rem;
        padding-right: 0.25rem;
        padding-bottom: 0.5rem;

        .progress-item {
          grid-template-columns: 2.5rem 1fr;
          gap: 0.75rem;
          padding: 0.625rem;

          .step-number {
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 0.75rem;
          }
        }
      }
    }

    .tour-list-layer {
      position: fixed;
      inset: 0 1rem 0 auto;
      width: min(26rem, calc(100vw - 2rem));
      min-width: 0;
      background: rgba(0, 0, 0, 0.04);
    }

    .map-panel {
      flex: none;
      min-height: 60vh;

      .map-toolbar {
        align-items: flex-start;
        flex-direction: column;
        padding: 0.875rem;

        .map-actions {
          width: 100%;
          flex-wrap: wrap;

          .map-action {
            flex: 1 1 8rem;
            min-width: 0;
          }
        }
      }

      .map-scroll-area {
        padding: 1rem 0;
      }

      .postcard-preview {
        width: 100%;
      }
    }
  }
}

@media (max-width: 640px) {
  .tour-details-shell {
    padding: 1rem 0.75rem 1rem;

    .side-panel,
    .map-panel {
      border-radius: 0.75rem;
    }

    .side-panel {
      .progress-list {
        max-height: 48vh;

        .progress-item {
          border-radius: 1rem;

          .step-content {
            min-width: 0;

            strong {
              overflow-wrap: anywhere;
            }
          }
        }
      }
    }

    .map-panel {
      .map-toolbar {
        strong {
          overflow-wrap: anywhere;
        }
      }

      .postcard-preview {
        .postcard-loading {
          padding: 2rem 1.25rem;
        }
      }
    }
  }
}
</style>
