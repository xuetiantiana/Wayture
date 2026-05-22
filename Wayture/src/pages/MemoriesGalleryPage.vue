<template>
  <section class="gallery-page">
    <aside class="session-sidebar">
      <button class="back-button" type="button" @click="router.push('/memories')">
        &lsaquo;
      </button>

      <div class="album-label">
        <el-icon class="album-icon"><Clock /></el-icon>
        <span>{{ galleryLabel }}</span>
      </div>

      <div v-if="isLoadingSessions" class="loading-section">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
      <div v-else class="session-list">
        <button
          v-for="session in sessions"
          :key="session.id"
          class="session-item"
          :class="{ active: activeSessionId === session.id }"
          @click="activeSessionId = session.id"
        >
          <strong>{{ session.title }}</strong>
          <span class="session-meta">
            {{ formatDate(session.created_at) }} · 共{{ session.generated_image_count }}张
          </span>
        </button>
      </div>
    </aside>

    <section class="gallery-main">
      <template v-if="activeSession">
        <div class="gallery-header">
          <div>
            <h1>{{ activeSession.title }}</h1>
            <p>{{ formatDate(activeSession.created_at) }} · 共{{ activeSession.generated_image_count }}张</p>
          </div>
          <button class="download-button" type="button">↓ 下载</button>
        </div>
        <div class="gallery-strip">
          <div
            v-for="(img, index) in activeSession.images"
            :key="img.index"
            class="gallery-item"
          >
            <img
              class="gallery-image"
              :src="normalizeUrl(img.generated_url)"
              :alt="img.description || '回忆'"
              @click="openPreview(index)"
            >
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
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElImageViewer } from 'element-plus';
import { Clock } from '@element-plus/icons-vue';
import { useTourStore, type GallerySession } from '../composables/useTourStore';

type GalleryType = 'journal' | 'album';

const router = useRouter();
const route = useRoute();
const tour = useTourStore();
const isLoadingSessions = ref(false);
const isPreviewVisible = ref(false);
const previewIndex = ref(0);

const galleryType = computed<GalleryType>(() => {
  const type = String(route.query.type || '').toLowerCase();
  return type === 'journal' ? 'journal' : 'album';
});
const galleryLabel = computed(() => galleryType.value === 'journal' ? '回忆手账' : '回忆相册');
const emptyText = computed(() => galleryType.value === 'journal'
  ? '暂无回忆日志，请先上传照片并生成日志。'
  : '暂无回忆图册，请先上传照片并生成图册。');
const sessions = ref<GallerySession[]>([]);
const activeSessionId = ref<string | null>(sessions.value[0]?.id ?? null);
const activeSession = computed<GallerySession | undefined>(
  () => sessions.value.find((s) => s.id === activeSessionId.value)
);
const previewList = computed(() => activeSession.value?.images.map((img) => normalizeUrl(img.generated_url)).filter(Boolean) || []);

function normalizeUrl(url: string): string {
  return tour.normalizeImageUrl(url);
}

function openPreview(index: number) {
  previewIndex.value = index;
  isPreviewVisible.value = true;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function loadSessions(type: GalleryType) {
  isLoadingSessions.value = true;
  activeSessionId.value = null;
  try {
    const resource = type === 'journal' ? 'journals' : 'albums';
    const username = encodeURIComponent(tour.currentUsername.value);
    const resp = await fetch(`${tour.apiBase}/api/${resource}/${username}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    sessions.value = Array.isArray(data)
      ? data
      : data[resource] || data.sessions || data.items || [];
    if (sessions.value.length > 0) {
      activeSessionId.value = sessions.value[0].id;
    }
  } catch (e) {
    console.warn('加载回忆列表失败:', e);
    sessions.value = [];
  } finally {
    isLoadingSessions.value = false;
  }
}

watch(galleryType, (type) => {
  loadSessions(type);
}, { immediate: true });
</script>

<style scoped lang="scss">
.gallery-page {
  position: relative;
  z-index: 555;
  display: grid;
  grid-template-columns: 20rem 1fr;
  min-height: 100vh;
  background: #fff;
  color: #222;

  .session-sidebar {
    box-sizing: border-box;
    min-height: 100vh;
    padding: 1.4rem 1.2rem;
    background: #f4f4f4;

    .back-button {
      display: grid;
      place-items: center;
      width: 2.125rem;
      height: 2.125rem;
      margin-bottom: 2rem;
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
      margin-bottom: 1.25rem;
      padding: 0 0.125rem;
      color: #2f2f2f;
      font-weight: 700;
      font-size: 1.125rem;

      .album-icon {
        color: #777;
      }
    }

    .session-list {
      display: flex;
      flex-direction: column;
      gap: .5rem;
      max-height: calc(100vh - 8.125rem);
      overflow-y: auto;

      .session-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
        min-height: 3rem;
        padding: 0.625rem 0.75rem;
        border: 0;
        border-radius: 0.5rem;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition: background 0.18s;

        strong {
          font-weight: 500;
        }

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
    box-sizing: border-box;
    min-width: 0;
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
      display: flex;
      align-items: flex-start;
      gap: 1.25rem;
      overflow-x: auto;
      padding-bottom: 0.625rem;

      .gallery-item {
        flex: 0 0 19.0625rem;
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

        .gallery-image {
          display: block;
          width: 100%;
          height: auto;
          min-height: 10.625rem;
          background: #f3f3f3;
          object-fit: contain;
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
}

@keyframes spin {
  to {
    transform: rotate(360deg);
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

@media (max-width: 980px) {
  .gallery-page {
    grid-template-columns: 1fr;

    .session-sidebar {
      min-height: auto;
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
        flex-direction: column;
        gap: 1.125rem;
        overflow-x: visible;

        .gallery-item {
          flex: none;
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
