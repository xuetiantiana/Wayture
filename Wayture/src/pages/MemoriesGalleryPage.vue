<template>
  <section class="gallery-page">
    <aside class="session-sidebar">
      <div class="sidebar-header">
        <button class="back-button" type="button" @click="router.back();">
          <el-icon><ArrowLeftBold /></el-icon>
        </button>
        <div class="album-label">
          <span>{{ galleryLabel }}</span>
        </div>
      </div>

      <div v-if="isLoadingSessions" class="loading-section">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
      <div v-else class="session-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-item"
          :class="{ active: activeSessionId === session.id }"
          @click="selectSession(session.id)"
        >
          <p><strong>{{ session.title }}</strong></p>
          <p>
            <span class="session-meta">
            {{ formatDate(session.created_at) }} ·
            {{ (session.status === 'pending' || session.status === 'processing') && session.images.length === 0
              ? '生成中'
              : (session.status === 'failed' || session.status === 'error')
                ? '生成失败'
                : `使用${session.source_photo_count ?? 0}张照片生成` }}
          </span>
          </p>
        </div>
      </div>
    </aside>

    <section class="gallery-main">
      <template v-if="activeSession">
        <div class="gallery-header">
          <div>
            <h1>{{ activeSession.title }}</h1>
            <p>{{ formatDate(activeSession.created_at) }} · 使用{{ activeSession.source_photo_count ?? 0 }}张照片生成</p>
          </div>
          <!-- <button class="download-button" type="button">↓ 下载</button> -->
        </div>
        <div v-if="(activeSession.status === 'pending' || activeSession.status === 'processing') && activeSession.images.length === 0" class="gallery-pending">
          <div class="loading-icons">
            <img :src="icon1" alt="" />
            <img :src="icon2" alt="" />
            <img :src="icon3" alt="" />
          </div>
          <p>内容正在生成中，等待时间可能稍长，<br/>你可以稍后查看...</p>
        </div>
        <div v-else-if="activeSession.status === 'failed' || activeSession.status === 'error'" class="empty-state">
          <p>生成失败，请返回重新生成。</p>
          <button class="button-primary" @click="router.push('/memories')">返回上传页</button>
        </div>
        <div
          v-else
          class="gallery-strip"
          :class="{ 'single-journal-image': isSingleJournalImage }"
          :key="activeSession.id"
        >
          <div
            v-for="(img, index) in activeSession.images"
            :key="`${activeSession.id}-${img.index}`"
            class="gallery-item"
          >
            <div class="gallery-image-shell">
              <img
                class="gallery-image"
                :src="normalizeUrl(img.generated_url)"
                :alt="img.description || '回忆'"
                @click="openPreview(index)"
              >
              <button
                class="image-download-button"
                type="button"
                @click.stop="downloadGalleryImage(img)"
              >
                <el-icon><Download /></el-icon>
                <span>{{ downloadingImageKey === `${activeSession.id}-${img.index}` ? 'Downloading' : 'Download' }}</span>
              </button>
            </div>
            <p v-if="img.description" class="gallery-desc">{{ img.description }}</p>
          </div>
        </div>
      </template>
      <div v-else-if="!isLoadingSessions && sessions.length === 0" class="empty-state">
        <p>{{ emptyText }}</p>
        <button class="button-primary" @click="router.push('/memories')">去上传照片</button>
      </div>
      <div v-else-if="!activeSession" class="empty-state">
        <p>请从左侧选择一次回忆。</p>
      </div>
    </section>

  </section>

  <el-image-viewer
    v-if="isPreviewVisible"
    :url-list="previewList"
    :initial-index="previewIndex"
    @close="isPreviewVisible = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElImageViewer } from 'element-plus';
import { ArrowLeftBold, Download } from '@element-plus/icons-vue';
import { useTourStore, type GallerySession } from '../composables/useTourStore';
import icon1 from '../assets/images/icon1.png';
import icon2 from '../assets/images/icon2.png';
import icon3 from '../assets/images/icon3.png';

type GalleryType = 'journal' | 'album';
type GallerySessionWithTask = GallerySession & {
  status?: string;
  task_id?: string;
  error?: string;
};

const router = useRouter();
const route = useRoute();
const tour = useTourStore();
const isLoadingSessions = ref(false);
const isPreviewVisible = ref(false);
const previewIndex = ref(0);
const downloadingImageKey = ref('');
const taskPollInterval = 30000;
const taskTimers = new Map<string, ReturnType<typeof setTimeout>>();

const galleryType = computed<GalleryType>(() => {
  const type = String(route.query.type || '').toLowerCase();
  return type === 'journal' ? 'journal' : 'album';
});
const galleryLabel = computed(() => galleryType.value === 'journal' ? '回忆手账' : '回忆相册');
const emptyText = computed(() => galleryType.value === 'journal'
  ? '暂无回忆日志，请先上传照片并生成日志。'
  : '暂无回忆图册，请先上传照片并生成图册。');
const sessions = ref<GallerySessionWithTask[]>([]);
const activeSessionId = ref<string | null>(sessions.value[0]?.id ?? null);
const activeSession = computed<GallerySessionWithTask | undefined>(
  () => sessions.value.find((s) => s.id === activeSessionId.value)
);
const previewList = computed(() => activeSession.value?.images.map((img) => normalizeUrl(img.generated_url)).filter(Boolean) || []);
const isSingleJournalImage = computed(() => galleryType.value === 'journal' && activeSession.value?.images.length === 1);

function normalizeUrl(url: string): string {
  return tour.normalizeImageUrl(url);
}

function openPreview(index: number) {
  previewIndex.value = index;
  isPreviewVisible.value = true;
}

function getImageExtension(url: string): string {
  const pathname = url.split('?')[0] || '';
  const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1] || 'png';
}

async function downloadGalleryImage(img: GallerySession['images'][number]) {
  const url = normalizeUrl(img.generated_url);
  if (!url || !activeSession.value || downloadingImageKey.value) return;

  const imageKey = `${activeSession.value.id}-${img.index}`;
  const filename = `wayture-memory-${imageKey}.${getImageExtension(url)}`;
  downloadingImageKey.value = imageKey;

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener';
    link.click();
  } catch (error) {
    console.warn('下载回忆图片失败:', error);
  } finally {
    downloadingImageKey.value = '';
  }
}

function selectSession(sessionId: string) {
  if (activeSessionId.value === sessionId) return;
  isPreviewVisible.value = false;
  previewIndex.value = 0;
  activeSessionId.value = sessionId;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function stopTaskPolling(sessionId?: string) {
  if (sessionId) {
    const timer = taskTimers.get(sessionId);
    if (timer) clearTimeout(timer);
    taskTimers.delete(sessionId);
    return;
  }

  taskTimers.forEach((timer) => clearTimeout(timer));
  taskTimers.clear();
}

function scheduleTaskPolling(session: GallerySessionWithTask) {
  const taskId = session.task_id || '';
  if (!taskId || taskTimers.has(session.id)) return;

  const timer = setTimeout(() => {
    taskTimers.delete(session.id);
    pollSessionTask(session.id, taskId);
  }, taskPollInterval);
  taskTimers.set(session.id, timer);
}

function updateSession(sessionId: string, patch: Partial<GallerySessionWithTask>) {
  sessions.value = sessions.value.map((session) =>
    session.id === sessionId ? { ...session, ...patch } : session,
  );
}

async function pollSessionTask(sessionId: string, taskId: string) {
  const session = sessions.value.find((item) => item.id === sessionId);
  if (!session || session.task_id !== taskId) return;

  try {
    const username = encodeURIComponent(tour.currentUsername.value);
    const resp = await fetch(`${tour.apiBase}/api/tasks/${username}/${encodeURIComponent(taskId)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    if (data.status === 'completed') {
      await loadSessions(galleryType.value, false);
      stopTaskPolling(sessionId);
      return;
    }

    if (data.status === 'failed' || data.status === 'error') {
      updateSession(sessionId, { status: data.status, error: data.error || data.message || '生成失败' });
      stopTaskPolling(sessionId);
      return;
    }

    scheduleTaskPolling(session);
  } catch (e) {
    console.warn('查询回忆生成任务失败:', e);
    scheduleTaskPolling(session);
  }
}

function startPendingSessionPolling() {
  sessions.value.forEach((session) => {
    if ((session.status === 'pending' || session.status === 'processing') && session.images.length === 0 && session.task_id) {
      pollSessionTask(session.id, session.task_id);
    }
  });
}

async function loadSessions(type: GalleryType, showLoading = true) {
  stopTaskPolling();
  if (showLoading) {
    isLoadingSessions.value = true;
    activeSessionId.value = null;
  }
  try {
    const resource = type === 'journal' ? 'journals' : 'albums';
    const username = encodeURIComponent(tour.currentUsername.value);
    const resp = await fetch(`${tour.apiBase}/api/${resource}/${username}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    sessions.value = Array.isArray(data)
      ? [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      : [];
    if (sessions.value.length > 0) {
      activeSessionId.value = activeSessionId.value && sessions.value.some((session) => session.id === activeSessionId.value)
        ? activeSessionId.value
        : sessions.value[0].id;
    }
    startPendingSessionPolling();
  } catch (e) {
    console.warn('加载回忆列表失败:', e);
    sessions.value = [];
  } finally {
    if (showLoading) {
      isLoadingSessions.value = false;
    }
  }
}

watch(galleryType, (type) => {
  loadSessions(type);
}, { immediate: true });

onBeforeUnmount(() => {
  stopTaskPolling();
});
</script>

<style scoped lang="scss">
.gallery-page {
  position: relative;
  z-index: 555;
  display: grid;
  grid-template-columns: 20rem 1fr;
  height: 100%;
  overflow: hidden;
  background: #fff;
  color: #222;

  .session-sidebar {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    padding: 1.4rem 0 1.4rem 1.2rem;
    padding-right: 0rem !important;
    background: #fff;

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
      font-weight: 700;
      font-size: 1.125rem;
    }

    .session-list {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: .5rem;
      min-height: 0;
      overflow-y: auto;

      .session-item {
        
        width: calc(100% - 1.5rem);
        padding: 0.625rem 0.75rem;
        border-radius: 0.5rem;
        cursor: pointer;

        strong {
          font-weight: 500;
        }
        line-height: 1.6;

        &:hover {
          background: #ececec;
        }

        &.active {
          background: #e4e4e4;
        }

        .session-meta {
          color: #666;
          font-size: 0.875rem;
        }
      }
    }
  }

  .gallery-main {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-width: 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    padding: 2rem 1.75rem;

    .gallery-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.125rem;
      margin-bottom: 1.875rem;

      h1 {
        margin: 0 0 0.4375rem;
        color: #292929;
        font-size: 1.25rem;
        font-weight: 600;
      }

      p {
        margin: 0;
        color: #333;
      }

      .download-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.125rem;
        padding: 0 0.8125rem;
        border: 0;
        border-radius: 0.375rem;
        background: #e2b82f;
        color: #fff;
        font-weight: 600;
        box-shadow: 0 0.25rem 0.625rem rgba(139, 104, 0, 0.22);
        cursor: pointer;
      }
    }

    .gallery-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      align-content: flex-start;
      gap: 1.25rem;
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding-bottom: 0.625rem;

      &.single-journal-image {
        grid-template-columns: minmax(0, 40rem);
        align-content: center;
        justify-content: center;
        overflow-y: auto;

        .gallery-item {
          width: min(100%, 40rem);
          max-width: 40rem;
          margin-block: auto;
        }
      }

      .gallery-item {
        overflow: hidden;
        border: 0;
        border-radius: 0;
        background: transparent;
        cursor: pointer;
        transition: transform 0.2s;
        background: #f9f9f9;
        border-radius: 0.5rem;

        &:hover {
          transform: translateY(-0.125rem);
        }

        .gallery-image-shell {
          position: relative;
        }

        .gallery-image {
          display: block;
          width: 100%;
          height: auto;
          min-height: 25rem;
          background: #f3f3f3;
          object-fit: contain;
        }

        .image-download-button {
          position: absolute;
          right: 1rem;
          bottom: 1rem;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.3em 1.25rem;
          border: 0;
          border-radius: 0.625rem;
          background: rgba(0, 0, 0, 0.62);
          color: #fff;
          font-size: 1rem;
          box-shadow: 0 0.375rem 1rem rgba(0, 0, 0, 0.2);
          cursor: pointer;
          backdrop-filter: blur(0.25rem);
          transition: background 0.18s ease, transform 0.18s ease;

          &:hover {
            background: rgba(0, 0, 0, 0.76);
            transform: translateY(-0.0625rem);
          }
        }

        .gallery-desc {
          margin: 0;
          padding: 0.875rem 1rem;
          line-height: 1.6;
          font-size: 0.875rem;
        }
      }
    }
  }

  .loading-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem 0;
    color: #94a3b8;
  }

  .spinner {
    width: 1.75rem;
    height: 1.75rem;
    border: 0.1875rem solid rgba(59, 130, 246, 0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    padding: 5rem 1.5rem;
    color: #94a3b8;
    text-align: center;
  }

  .gallery-pending {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.875rem;
    min-height: 30rem;
    color: #333;

    p {
      margin: 0;
      text-align: center;
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

:global(.el-image-viewer__canvas) {
  box-sizing: border-box;
  padding: 3rem 4rem;
}

:global(.el-image-viewer__img) {
  max-width: calc(100vw - 8rem);
  max-height: calc(100vh - 6rem);
  object-fit: contain;
}

@media (max-width: 640px) {
  .gallery-page {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 100%;
    overflow: auto;

    .session-sidebar {
      height: auto;
      min-height: auto;
      overflow-y: visible;
    }

    .gallery-main {
      height: auto;
      min-height: 0;
      overflow-y: visible;

      .gallery-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  }
}

@media (max-width: 640px) {
  .gallery-page {
    .gallery-main {
      padding: 1.5rem 1.125rem;

      .gallery-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .gallery-strip {
        grid-template-columns: 1fr;
        gap: 1.125rem;
        overflow: visible;

        &.single-journal-image {
          grid-template-columns: minmax(0, 1fr);
          justify-content: stretch;

          .gallery-item {
            width: 100%;
            max-width: 45rem;
          }
        }

        .gallery-item {
          width: 100%;

          .gallery-image {
            min-height: 52vw;
          }
        }
      }
    }
  }
}
</style>
