<template>
  <section class="flex-row tour-details-shell">
    <aside class="panel-card p-24 side-panel">
      <div class="flex-row justify-between align-center mb-20">
        <div>
          <h2 class="section-title">游览详情</h2>
          <p class="subtitle">
            {{ activeRouteSummary || "AI 正在为你规划最佳游览路线。" }}
          </p>
          <select
            v-if="allTourList.length > 0"
            class="route-record-select"
            :value="activeTourRecordId || ''"
            @change="selectTourRecord"
          >
            <option v-for="record in allTourList" :key="record.id" :value="record.id">
              {{ record.title }}
            </option>
          </select>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="displayError" class="route-error">
        <p>{{ displayError }}</p>
        <button
          type="button"
          class="retry-button"
          @click="generatePostcard()"
        >
          重新生成明信片
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
          @click="setHighlight(point.id)"
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
                >{{ index + 1 }}.{{ point.name }}-{{ point.field }}</strong
              >
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
    </aside>
    <section class="map-panel panel-card p-24">
      <div class="map-toolbar">
        <strong>{{ activeTourTitle }}</strong>
        <div class="map-actions">
          <template v-if="postcardImageUrl && !isPostcardPending">
            <span
              class="map-action map-action-download"
              :class="{ disabled: imageDownloading }"
              @click="downloadImage"
              >☼ {{ imageDownloading ? "下载中" : "下载图片" }}</span
            >
          </template>
          <template v-else-if="isPostcardPending">
            <span class="map-action map-action-confirm disabled">☼ 明信片生成中</span>
          </template>
          <template v-else>
            <span
              class="map-action map-action-edit"
              @click="editMap"
              >✎ 编辑地图</span
            >
            <span
              class="map-action map-action-confirm"
              :class="{ disabled: !canGeneratePostcard }"
              @click="generatePostcard()"
              >☼ 生成明信片</span
            >
          </template>
        </div>
      </div>
      <div style="flex: 1; overflow: auto;padding: 2em 0;">
        <div
          ref="downloadContainer"
          :style="{
            width: isPostcardPending || postcardImageUrl ? '645px' : '1000px',
            margin: '0 auto',
            maxWidth: '100%',
          }"
          class="dowmload-container"
        >
          <div class="map-frame tour-map">
            <img
              class="map-image"
              :src="tour.mapImageUrl"
              alt="园区地图"
            />
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
              @click="setHighlight(point.id)"
            >
              <span v-if="routePlanned && isRoutePoint(point.id)">
                {{ getRouteOrder(point.id) }}
              </span>
            </div>
          </div>
          <div
            v-if="postcardImageUrl || isPostcardPending"
            class="postcard-preview"
          >
            <div v-if="isPostcardPending" class="postcard-loading">
              <div class="loading-icons">
                <img :src="icon1" alt="" />
                <img :src="icon2" alt="" />
                <img :src="icon3" alt="" />
              </div>
              <p>地图正在生成中，等待时间可能稍长，<br/>你可以稍后查看...</p>
            </div>
            <img v-else :src="postcardImageUrl" alt="明信片" width="100%" />
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import html2canvas from "html2canvas";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useTourStore } from "../composables/useTourStore";
import icon1 from "../assets/images/icon1.png";
import icon2 from "../assets/images/icon2.png";
import icon3 from "../assets/images/icon3.png";
import { getFieldColor } from "../data/fieldConfig";

const router = useRouter();
const tour = useTourStore();
const points = tour.points;
const allTourList = tour.allTourList;
const activeTourRecordId = tour.activeTourRecordId;
const downloadContainer = ref<HTMLElement | null>(null);
const imageDownloading = ref(false);
const promptParts = ref<string[]>([]);
const routeError = ref("");
const highlightId = ref<number | null>(null);
const hoverPointId = ref<number | null>(null);
let postcardPollTimer: ReturnType<typeof setTimeout> | null = null;

// 当前页面只展示 allTourList 中正在激活的路线记录。
const activeTourRecord = computed(() =>
  allTourList.value.find((item) => item.id === activeTourRecordId.value) ?? null,
);

// 明信片图片地址持久化在当前路线记录中，页面展示时统一做 API base 补全。
const postcardImageUrl = computed(() =>
  activeTourRecord.value?.postcardImageUrl
    ? normalizeImageUrl(activeTourRecord.value.postcardImageUrl)
    : "",
);

const isPostcardPending = computed(() => activeTourRecord.value?.postcardStatus === "pending");
const displayError = computed(() => routeError.value || activeTourRecord.value?.postcardError || "");
const routePlanned = computed(() => (activeTourRecord.value?.routePlan.length ?? 0) > 0);
const activeHighlightId = computed(() => hoverPointId.value ?? highlightId.value);

// 生成明信片依赖当前路线记录，不再依赖临时页面状态。
const canGeneratePostcard = computed(
  () =>
    routePlanned.value &&
    !routeError.value &&
    !isPostcardPending.value &&
    !!activeTourRecord.value,
);

// 顶部标题跟随当前路线记录切换。
const activeTourTitle = computed(() => {
  const record = allTourList.value.find((item) => item.id === activeTourRecordId.value);
  return record?.title || "小七幸福一家尺木神奇世界一日游";
});

const activeRouteSummary = computed(() => activeTourRecord.value?.routeSummary || "");

// 根据当前路线记录中的 selectedIds 恢复路线顺序。
const orderedPoints = computed(() => {
  return (activeTourRecord.value?.selectedIds ?? [])
    .map((id) => points.value.find((item) => item.id === id))
    .filter((item): item is (typeof points.value)[number] =>
      Boolean(item),
    );
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

function setHighlight(id: number) {
  highlightId.value = id;
}

function setHoverPoint(id: number) {
  hoverPointId.value = id;
}

function clearHoverPoint() {
  hoverPointId.value = null;
}

// 切换历史路线时，store 会同步当前 allTourList 激活记录。
function selectTourRecord(event: Event) {
  const target = event.target as HTMLSelectElement;
  const selected = tour.setActiveTourRecord(target.value);
  if (!selected) return;

  routeError.value = "";
  stopPostcardPolling();
  autoGeneratePostcard();
}

function editMap() {
  if (isPostcardPending.value) {
    return;
  }

  router.push("/main");
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

// 页面销毁或切换路线时停止旧任务轮询，避免多个定时器同时更新记录。
function stopPostcardPolling() {
  if (postcardPollTimer) {
    clearTimeout(postcardPollTimer);
    postcardPollTimer = null;
  }
}

// 后端图片生成是异步任务，这里按固定间隔查询当前任务状态。
function schedulePostcardPolling(taskId: string) {
  stopPostcardPolling();
  postcardPollTimer = setTimeout(() => {
    pollPostcardTask(taskId);
  }, 2000);
}

// 轮询 /api/tasks/{username}/{task_id}，完成后把结果写回当前路线记录。
async function pollPostcardTask(taskId: string) {
  const record = activeTourRecord.value;
  if (!record || record.postcardTaskId !== taskId) return;

  try {
    const username = encodeURIComponent(tour.currentUsername.value);
    const resp = await fetch(`${tour.apiBase}/api/tasks/${username}/${encodeURIComponent(taskId)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    if (data.status === "completed") {
      const imageUrl = extractPostcardImageUrl(data);
      tour.updateTourRecord(record.id, {
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

    if (imageUrl) {
      tour.updateTourRecord(record.id, {
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
      postcardStatus: "pending",
      postcardTaskId: taskId,
      postcardData: data,
      postcardError: "",
    });
    schedulePostcardPolling(taskId);
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
    schedulePostcardPolling(record.postcardTaskId);
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
    const canvas = await html2canvas(downloadContainer.value, {
      backgroundColor: "#ffffff",
      scale: window.devicePixelRatio || 1,
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

  if (!highlightId.value) {
    highlightId.value = orderedPoints.value[0]?.id ?? null;
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
  gap: 1.5rem;
  box-sizing: border-box;
  height: 100vh;
  padding: 4em 2em 2em;
  background: #fff;
  color: #000;
  line-height: 1.6;

  .side-panel {
    display: flex;
    flex-direction: column;
    width: 27%;
    min-width: 25rem;
    max-width: 37.5rem;
    overflow: auto;

    .subtitle {
      margin: 1.25rem 0;
    }

    .route-record-select {
      width: 100%;
      min-height: 2.5rem;
      padding: 0 0.875rem;
      border: 0.0625rem solid rgba(148, 163, 184, 0.35);
      border-radius: 0.625rem;
      background: #fff;
      color: #111;
      cursor: pointer;
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
        grid-template-columns: 2.75rem 1fr;
        gap: 0.875rem;
        width: 100%;
        border-radius: 1.5rem;
        color: inherit;
        cursor: pointer;
        padding: 0.75rem;
        text-align: left;
        transition: background-color 0.18s ease, box-shadow 0.18s ease;

        &.active {
          background: rgba(255, 183, 0, 0.12);
          box-shadow: inset 0 0 0 0.125rem rgba(255, 183, 0, 0.42);

          .step-number {
            box-shadow: 0 0 0 0.1875rem rgba(255, 183, 0, 0.72);
          }

          .content-detail {
            background: rgba(255, 183, 0, 0.18);
          }
        }

        .step-number {
          display: grid;
          place-items: center;
          width: 2.75rem;
          height: 2.75rem;
          overflow: hidden;
          border-radius: 1rem;
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
            display: block;
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
            border-radius: 1rem;
            background: rgba(59, 130, 246, 0.08);
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

  .map-panel {
    display: flex;
    flex: 1;
    flex-direction: column;
    background-color: rgba(198, 185, 153, 1);
    overflow: hidden;

    .map-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.875rem 1.125rem;
      background: #f7f7f7;

      strong {
        color: #111827;
        font-size: 1rem;
      }

      .map-actions {
        display: flex;
        align-items: center;
        gap: 0.625rem;

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

          &.map-action-download {
            background: rgb(255, 183, 0);
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

    .map-frame {
      position: relative;
      overflow: hidden;
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
        font-size: .875rem;
        font-weight: 600;
        line-height: 1;
        cursor: pointer;
        transform: translate(-50%, -50%);
        transition: box-shadow 0.18s ease, transform 0.18s ease;

        span {
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
          line-height: 1;
        }

        &.selected {
          width: 1.75rem;
          height: 1.75rem;
          border-width: 0.1875rem;
          border-color: #fff;
        }

        &.active {
          box-shadow: 0 0 0 0.375rem rgba(255, 255, 255, 0.28);
          transform: translate(-50%, -50%) scale(1.2);
        }
      }

    }

    .postcard-preview {
      position: relative;
      aspect-ratio: 645 / 456;
      background: #fff;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;

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
        max-width: 100%;
        max-height: 100%;
        position: relative;
        z-index: 2;
      }

      .postcard-loading {
        text-align: center;
        padding: 3em;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.875rem;
        color: #333;

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
  .tour-details-shell {
    flex-direction: column;

    .side-panel {
      width: 100%;
    }
  }
}
</style>
