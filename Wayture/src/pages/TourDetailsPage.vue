<template>
  <section class="flex-row tour-details-shell" style="">
    <aside class="panel-card p-24 side-panel">
      <div class="flex-row justify-between align-center mb-20">
        <div>
          <h2 class="section-title">游览详情</h2>
          <p class="subtitle">
            {{ routeSummary || "AI 正在为你规划最佳游览路线。" }}
          </p>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="tour.routeLoading.value" class="route-loading">
        <div class="loading-spinner"></div>
        <p>正在规划最佳路线...</p>
      </div>

      <div v-else-if="routeError" class="route-error">
        <p>{{ routeError }}</p>
        <button
          type="button"
          class="retry-button"
          :disabled="tour.routeLoading.value"
          @click="retryPlanRoute"
        >
          重新请求
        </button>
      </div>

      <!-- 路线列表 -->
      <div v-else class="progress-list">
        <div
          v-for="(point, index) in orderedPoints"
          :key="point.id"
          class="progress-item"
          :class="{ active: highlightId === point.id }"
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
      <!-- <button
        class="button-primary mt-24"
        @click="toPostcard"
        :disabled="tour.routeLoading.value"
      >
        去生成明信片
      </button> -->
    </aside>
    <section class="map-panel panel-card p-24">
      <div class="map-toolbar">
        <strong>小七幸福一家尺木神奇世界一日游</strong>
        <div class="map-actions">
          <template v-if="postcardImageUrl && !postcardGenerating">
            <span
              class="map-action map-action-download"
              :class="{ disabled: imageDownloading }"
              @click="downloadImage"
              >☼ {{ imageDownloading ? "下载中" : "下载图片" }}</span
            >
          </template>
          <template v-else>
            <span
              class="map-action map-action-edit"
              :class="{ disabled: postcardGenerating }"
              @click="editMap"
              >✎ 编辑地图</span
            >
            <span
              class="map-action map-action-confirm"
              :class="{ disabled: !canGeneratePostcard }"
              @click="generatePostcard()"
              >☼ {{ postcardGenerating ? "生成中" : "确定" }}</span
            >
          </template>
        </div>
      </div>
      <div style="flex: 1; overflow: auto;padding: 2em 0;">
        <div
          ref="downloadContainer"
          :style="{
            width: postcardGenerating || postcardImageUrl ? '645px' : '1000px',
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
                active: highlightId === point.id,
              }"
              :style="getMapPointStyle(point)"
            >
              <span v-if="routePlanned && isRoutePoint(point.id)">
                {{ getRouteOrder(point.id) }}
              </span>
            </div>
          </div>
          <div
            v-if="postcardImageUrl || postcardGenerating"
            class="postcard-preview"
          >
            <!-- <span v-if="postcardGenerating">正在生成明信片...</span> -->
            <div v-if="postcardGenerating" class="postcard-loading">
              <div class="loading-icons">
                <img :src="icon1" alt="" />
                <img :src="icon2" alt="" />
                <img :src="icon3" alt="" />
              </div>
              <p>内容正在生成中......</p>
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
import { computed, nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useTourStore } from "../composables/useTourStore";
import icon1 from "../assets/images/icon1.png";
import icon2 from "../assets/images/icon2.png";
import icon3 from "../assets/images/icon3.png";

const router = useRouter();
const tour = useTourStore();
const points = tour.points;
const selectedPoints = tour.selectedPoints;
const highlightId = tour.highlightId;
const routeSummary = tour.routeSummary;
const downloadContainer = ref<HTMLElement | null>(null);
const postcardGenerating = ref(false);
const imageDownloading = ref(false);
const postcardImageUrl = ref("");
const promptParts = ref<string[]>([]);
const routeError = ref("");
const routePlanned = ref(false);

const canGeneratePostcard = computed(
  () =>
    routePlanned.value &&
    !tour.routeLoading.value &&
    !routeError.value &&
    !postcardGenerating.value,
);

// 按 field 定义颜色
const fieldColorMap: Record<string, string> = {
  'MSRA专区':"rgba(168, 27, 128, 1)",
  '魔法森林': 'rgba(27, 168, 102, 1)',
  '尖叫小镇': 'rgba(23, 37, 126, 1)',
  '小勇士的冒险亲子乐园': 'rgba(10, 151, 229, 1)',
  '冒险者俱乐部': 'rgba(247, 143, 8, 1)',
  '萌宠乐园': 'rgba(49, 120, 35, 1)'
};

function getFieldColor(field: string): string {
  return fieldColorMap[field] || "#64748B";
}

const orderedPoints = computed(() => {
  return tour.selectedIds.value
    .map((id) => selectedPoints.value.find((item) => item.id === id))
    .filter((item): item is (typeof selectedPoints.value)[number] =>
      Boolean(item),
    );
});

const currentHighlight = computed(
  () =>
    orderedPoints.value.find((item) => item.id === highlightId.value) ??
    orderedPoints.value[0] ??
    null,
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

function getMapPointStyle(point: (typeof points.value)[number]) {
  return {
    left: `${point.location[0]}%`,
    top: `${point.location[1]}%`,
    backgroundColor: getFieldColor(point.field),
  };
}

function getRouteOrder(id: number) {
  const routeEntry = tour.routePlan.value.find(
    (entry: any) => entry.attraction?.id === id,
  );
  const routeIndex = tour.selectedIds.value.indexOf(id);
  return routeEntry?.order ?? routeIndex + 1;
}

function isRoutePoint(id: number) {
  return tour.selectedIds.value.includes(id);
}

function setHighlight(id: number) {
  tour.setHighlight(id);
}

function toPostcard() {
  router.push("/postcard");
}

function editMap() {
  if (postcardGenerating.value) {
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

async function generatePostcard(additionPrompt = promptParts.value.join("\n")) {
  if (!canGeneratePostcard.value) {
    return;
  }

  postcardImageUrl.value = "";
  postcardGenerating.value = true;
  try {
    const resp = await fetch(`${tour.apiBase}/api/generate-postcard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: tour.currentUsername.value,
        route_plan: tour.routePlan.value,
        attractions: tour.selectedPoints.value,
        addition_prompt: additionPrompt,
      }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.image_url) {
      throw new Error("未返回明信片图片地址");
    }
    postcardImageUrl.value = normalizeImageUrl(data.image_url);
  } catch (error) {
    console.error("生成明信片出错:", error);
  } finally {
    postcardGenerating.value = false;
  }
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
  console.log("初始化明信片提示词，用户设置:", { nickname, tourStyle });
  const parts: string[] = [];
  if (nickname) parts.push(`昵称/标题: ${nickname}`);
  if (tourStyle) parts.push(`游览风格: ${tourStyle}`);
  promptParts.value = parts;
}

async function requestRoutePlan() {
  routeError.value = "";
  routePlanned.value = false;
  const planned = await tour.planRoute();
  if (!planned || tour.routePlan.value.length === 0) {
    routeError.value = "路线规划失败，请重新请求。";
    return false;
  }

  routePlanned.value = true;

  if (!highlightId.value) {
    tour.setHighlight(orderedPoints.value[0]?.id ?? null);
  }
  return true;
}

async function retryPlanRoute() {
  await requestRoutePlan();
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
    router.replace("/main");
    return;
  }

  // 调用 API 规划路线，再根据接口返回的 route/order 重绘选中点
  await requestRoutePlan();
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

    .route-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 3rem 1.5rem;

      .loading-spinner {
        width: 2.25rem;
        height: 2.25rem;
        border: 0.1875rem solid rgba(59, 130, 246, 0.2);
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
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
        text-align: left;

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
        font-weight: 700;
        transform: translate(-50%, -50%);

        &.selected {
          width: 1.75rem;
          height: 1.75rem;
          border-width: 0.1875rem;
          border-color: #fff;
        }

        &.active {
          box-shadow: 0 0 0 0.375rem rgba(255, 255, 255, 0.28);
        }
      }

      .info-card-overlay {
        position: absolute;
        left: 50%;
        top: 50%;
        z-index: 10;
        width: min(32.5rem, calc(100% - 2.5rem));
        overflow: hidden;
        border: 0.0625rem solid rgba(148, 163, 184, 0.18);
        border-radius: 1.75rem;
        background: rgba(15, 23, 42, 0.97);
        box-shadow: 0 2.25rem 5rem rgba(12, 30, 50, 0.35);
        transform: translate(-50%, -50%);
        backdrop-filter: blur(1.125rem);

        .info-card-image {
          height: 13.75rem;
          background-color: #1e293b;
          background-position: center;
          background-size: cover;
        }

        .info-card-body {
          padding: 1.375rem 1.5rem 1.5rem;

          p {
            margin: 0;
            color: #cbd5e1;
            line-height: 1.8;
          }

          .info-card-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 1rem;
            margin-bottom: 0.875rem;

            h3 {
              margin: 0;
              font-size: 1.25rem;
              line-height: 1.2;
            }
          }

          .info-duration {
            color: #e0f2fe;
            font-weight: 700;
            white-space: nowrap;
          }
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

  .station-count,
  .current-label {
    font-size: 0.95rem;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
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
