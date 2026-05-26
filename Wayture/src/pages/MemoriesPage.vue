<template>
  <section class="memories-page" aria-label="回忆页面">
    <section class="memory-hero">
      <button class="back-button" type="button" @click="router.push('/')">
        <el-icon><ArrowLeftBold /></el-icon>
      </button>

      <div class="hero-content">
        <h1>
          Hi, {{ tour.userSettings.value.nickname || tour.currentUsername.value }} 幸福一家<br />
          开始创建你的旅行回忆吧
        </h1>

        <div class="passport-preview">
          <img :src="previewExampleImage" alt="Memory Passport example" />
        </div>

      </div>
    </section>

    <section class="memory-workspace">
      <header class="workspace-header">
        <div class="memory-type-switch" aria-label="选择生成类型">
          <button
            type="button"
            :class="{ active: selectedMemoryType === 'journal' }"
            @click="selectedMemoryType = 'journal'"
          >
            手账
          </button>
          <!-- <button
            type="button"
            :class="{ active: selectedMemoryType === 'album' }"
            @click="selectedMemoryType = 'album'"
          >
            相册
          </button> -->
        </div>
        <nav class="workspace-links" aria-label="回忆导航">
          <button type="button" @click="openGallery('journal')">
            查看手账
          </button>
          <span></span>
          <!-- <button type="button" @click="openGallery('album')">
            查看相册
          </button> -->
        </nav>
      </header>

      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*"
        @change="handleUpload"
        style="display: none"
      />

      <div
        v-if="photos.length === 0"
        class="upload-panel"
        :class="{ disabled: isUploading }"
        @click="triggerFileInput"
      >
        <div v-if="isUploading" class="spinner small"></div>
        <div v-else class="upload-icon">+</div>
        <p>{{ isUploading ? "Uploading..." : "Upload/Drag your photos, Start Creating Your Memories" }}</p>
      </div>

      <div v-if="isLoading" class="loading-section">
        <div class="spinner"></div>
        <p>加载照片中...</p>
      </div>

      <template v-else>
        <div class="photo-strip">
          <div
            v-if="photos.length > 0"
            class="photo-item upload-tile"
            :class="{ disabled: isUploading }"
            @click="triggerFileInput"
          >
            <div v-if="isUploading" class="spinner small"></div>
            <div v-else class="upload-icon">+</div>
          </div>

          <div
            v-for="photo in photos"
            :key="photo.index"
            class="photo-item"
            :class="{ selected: selectedIndices.has(photo.index) }"
            @click="toggleSelect(photo.index)"
          >
            <img :src="getPhotoUrl(photo)" :alt="photo.filename || '照片'" />
            <div class="select-overlay">
              <div
                class="checkbox"
                :class="{ checked: selectedIndices.has(photo.index) }"
              ></div>
            </div>
          </div>
        </div>

        <div class="workspace-footer">
          <p>最多可以选中8张</p>
          <div class="action-buttons">
            <button
              v-if="selectedMemoryType === 'journal'"
              class="button-primary"
              :disabled="selectedIndices.size === 0 || isGenerating"
              @click="generateJournal"
            >
              {{ isGenerating ? "生成中..." : "生成记忆手账" }}
            </button>
            <button
              v-else
              class="button-primary"
              :disabled="selectedIndices.size === 0 || isGenerating"
              @click="generateAlbum"
            >
              {{ isGenerating ? "生成中..." : "生成记忆相册" }}
            </button>
          </div>
        </div>
      </template>
    </section>

    <!-- 照片查看模态框 -->
    <div v-if="viewingPhoto" class="photo-modal" @click="viewingPhoto = null">
      <div class="photo-modal-content" @click.stop>
        <img :src="viewingPhoto" alt="照片" />
        <button class="close-modal-btn" @click="viewingPhoto = null">
          &times;
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeftBold } from "@element-plus/icons-vue";
import { useTourStore } from "../composables/useTourStore";
import journalExampleImage from "../assets/images/example-2.png";
import albumExampleImage from "../assets/images/example-1.png";

const router = useRouter();
const tour = useTourStore();
const apiBase = tour.apiBase;

const fileInput = ref<HTMLInputElement | null>(null);
const photos = ref<any[]>([]);
const selectedIndices = reactive(new Set<number>());
const isLoading = ref(false);
const isUploading = ref(false);
const isGenerating = ref(false);
const viewingPhoto = ref<string | null>(null);
const selectedMemoryType = ref<MemoryMode>("journal");
const maxSelectedPhotos = 8;
const previewExampleImage = computed(() =>
  selectedMemoryType.value === "journal" ? journalExampleImage : albumExampleImage,
);

function normalizeUrl(url: string): string {
  if (
    !url ||
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getPhotoUrl(photo: any): string {
  const raw = photo.url || photo.image_url || photo.thumbnail_url || "";
  return normalizeUrl(raw);
}

// --- 加载照片列表 ---
async function fetchPhotos() {
  isLoading.value = true;
  try {
    const resp = await fetch(
      `${apiBase}/api/images/${encodeURIComponent(tour.currentUsername.value)}`,
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    photos.value = Array.isArray(data) ? data.reverse() : [];
  } catch (e) {
    console.warn("获取照片列表失败:", e);
    photos.value = [];
  } finally {
    isLoading.value = false;
  }
}

// --- 上传照片 ---
function triggerFileInput() {
  if (isUploading.value) return;
  fileInput.value?.click();
}

async function handleUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  isUploading.value = true;
  try {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const formData = new FormData();
      formData.append("username", tour.currentUsername.value);
      formData.append("file", file, file.name);
      const resp = await fetch(`${apiBase}/api/upload-image`, {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const uploadedPhoto = await resp.json();
      photos.value.unshift(uploadedPhoto);
    }
  } catch (e) {
    console.error("上传失败:", e);
  } finally {
    isUploading.value = false;
    target.value = "";
  }
}

// --- 选择操作 ---
function toggleSelect(index: number) {
  if (selectedIndices.has(index)) {
    selectedIndices.delete(index);
    return;
  }

  if (selectedIndices.size >= maxSelectedPhotos) return;

  selectedIndices.add(index);
}

function toggleSelectAll() {
  if (selectedIndices.size === photos.value.length) {
    selectedIndices.clear();
  } else {
    photos.value.forEach((p) => selectedIndices.add(p.index));
  }
}

// --- 生成回忆 ---
type MemoryMode = "journal" | "album";

function openGallery(type: MemoryMode) {
  router.push({ path: "/memories-gallery", query: { type } });
}

async function generateMemory(endpoint: string, type: MemoryMode) {
  if (selectedIndices.size === 0) return;

  isGenerating.value = true;
  try {
    const resp = await fetch(`${apiBase}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: tour.currentUsername.value,
        selected_indices: Array.from(selectedIndices),
      }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    selectedIndices.clear();
    openGallery(type);
  } catch (e) {
    console.error("生成回忆失败:", e);
  } finally {
    isGenerating.value = false;
  }
}

function generateJournal() {
  return generateMemory("/api/generate-journal", "journal");
}

function generateAlbum() {
  return generateMemory("/api/generate-album", "album");
}

onMounted(() => {
  fetchPhotos();
});
</script>

<style scoped lang="scss">
.memories-page {
  position: relative;
  z-index: 555;
  display: grid;
  grid-template-columns: 1fr 1.05fr;
  min-height: 100vh;
  overflow: hidden;
  background: #fff;
  color: #111;

  .memory-hero {
    position: relative;
    display: flex;
    min-height: 100vh;
    padding: 4.375rem 7.5% 5rem;
    background:
      radial-gradient(circle at 77% 9%, rgba(222, 230, 136, 0.5), transparent 25%),
      linear-gradient(145deg, #b5bb70 0%, #9aaa55 100%);

    .back-button {
      position: absolute;
      top: 2.375rem;
      left: 3.375rem;
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border: 0.0625rem solid rgba(255, 255, 255, 0.22);
      border-radius: 0.5rem;
      background: rgba(74, 86, 45, 0.32);
      color: #fff;
      line-height: 1;
      cursor: pointer;
    }

    .hero-content {
      width: 100%;
      max-width: 35.625rem;

      h1 {
        margin: 4rem 0 3rem 0;
        font-size: 1.75rem;
        font-weight: 500;
        line-height: 1.35;
      }

      .passport-preview {
        width: 100%;
        overflow: hidden;
        border: 0.375rem solid #fff;
        border-radius: 1.375rem;
        background: #fff8e9;
        box-shadow: 0 1.25rem 2.625rem rgba(69, 79, 39, 0.2);

        img {
          display: block;
          width: 100%;
          height: auto;
        }
      }

   
    }
  }

  .memory-workspace {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    padding: 4.375rem 8.6% 5.125rem;
    background: #fff;

    .workspace-header,
    .workspace-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.125rem;
    }

    .workspace-header {
      margin-bottom: 1.5rem;

      h2 {
        margin: 0;
        color: #292929;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .workspace-links {
        display: flex;
        align-items: center;
        gap: 0.625rem;

        button {
          border: 0;
          background: transparent;
          color: #666;
          cursor: pointer;
        }

        span {
          width: 0.0625rem;
          height: 0.75rem;
          background: #d6d6d6;
        }
      }

      .memory-type-switch {
        display: flex;
        align-items: center;
        gap: 1rem;

        button {
          padding: 0.45rem 1rem;
          border: 1px solid #ecdca6;
          border-radius: 0.875rem;
          background: #fffdf5;
          color: #f2a900;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition:
            background 0.18s,
            border-color 0.18s,
            box-shadow 0.18s;

          &.active,
          &:hover {
            border-color: #e2b82f;
            background: #fff8e2;
            box-shadow: 0 0.375rem 0.875rem rgba(226, 184, 47, 0.16);
          }
        }
      }
    }

    .upload-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 11.125rem;
      margin-bottom: 1.5rem;
      border: 0.0625rem solid #dedede;
      border-radius: 1.125rem;
      background: #f8f8f8;
      color: #8b8b8b;
      cursor: pointer;

      &.disabled {
        cursor: wait;
        opacity: 0.7;
      }

      p {
        margin: 0.5rem 0 0;
      }

      .upload-icon {
        color: #777;
        font-size: 2.35rem;
        font-weight: 300;
        line-height: 1;
      }
    }

    .photo-strip {
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      gap: 0.625rem;
      flex: 0 1 auto;
      min-height: 0;
      margin-bottom: 1.75rem;
      overflow-y: auto;
      padding-right: 0.25rem;

      .photo-item {
        position: relative;
        flex: 0 0 calc((100% - 2.5rem) / 5);
        aspect-ratio: 1 / 1;
        overflow: hidden;
        border: 1px solid transparent;
        border-radius: 0.375rem;
        background: #eee;
        cursor: pointer;
        transition:
          border-color 0.2s,
          transform 0.2s;


        &.upload-tile {
          display: flex;
          align-items: center;
          justify-content: center;
          border-color: #dedede;
          background: #f8f8f8;

          &.disabled {
            cursor: wait;
            opacity: 0.7;
          }

          .upload-icon {
            color: #777;
            font-size: 2.35rem;
            font-weight: 300;
            line-height: 1;
          }
        }

        &.selected {
          border-color: #e2b82f;
        }

        img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .select-overlay {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;

          .checkbox {
            position: relative;
            width: 1.25rem;
            height: 1.25rem;
            border: 0.125rem solid rgba(255, 255, 255, 0.8);
            border-radius: 0.3125rem;
            background: rgba(0, 0, 0, 0.24);

            &.checked {
              border-color: #e2b82f;
              background: #e2b82f;

              &::after {
                content: "";
                position: absolute;
                left: 0.3125rem;
                top: 0.125rem;
                width: 0.3125rem;
                height: 0.625rem;
                border: solid #fff;
                border-width: 0 0.125rem 0.125rem 0;
                transform: rotate(45deg);
              }
            }
          }
        }
      }
    }

    .workspace-footer {
      flex-shrink: 0;
      color: #777;

      p {
        margin: 0;
      }

      .action-buttons {
        display: flex;
        gap: 0.75rem;

        .button-primary {
          min-height: 2.125rem;
          padding: 0 1.125rem;
          border: 0;
          border-radius: 0.375rem;
          background: #ffc22f;
          color: #6b4d00;
          font-weight: 600;
          cursor: pointer;

          &:disabled {
            opacity: 0.48;
            cursor: not-allowed;
            filter: grayscale(0.25);
          }
        }
      }
    }
  }

  .loading-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.875rem;
    padding: 2.25rem 0;
    color: #777;
  }

  .spinner {
    width: 2.25rem;
    height: 2.25rem;
    border: 0.1875rem solid rgba(226, 184, 47, 0.24);
    border-top-color: #e2b82f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    &.small {
      width: 1.5rem;
      height: 1.5rem;
      border-width: 0.15625rem;
    }
  }

  .photo-modal {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);

    .photo-modal-content {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;

      img {
        max-width: 100%;
        max-height: 90vh;
        border-radius: 0.75rem;
      }

      .close-modal-btn {
        position: absolute;
        top: -2.5rem;
        right: 0;
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        border: 0;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        cursor: pointer;
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 980px) {
  .memories-page {
    grid-template-columns: 1fr;
    overflow: auto;

    .memory-hero,
    .memory-workspace {
      min-height: auto;
      padding: 4.5rem 1.5rem 2.5rem;
    }

    .memory-hero {
      .back-button {
        left: 1.5rem;
      }

      .hero-content {
        max-width: none;
      }
    }

    .memory-workspace {
      overflow: visible;

      .photo-strip {
        flex: none;
        overflow-y: visible;

        .photo-item {
          flex-basis: calc((100% - 1.25rem) / 3);
        }
      }
    }
  }
}

@media (max-width: 640px) {
  .memories-page {
    .memory-workspace {
      .workspace-header,
      .workspace-footer {
        align-items: flex-start;
        flex-direction: column;
      }

      .photo-strip {
        .photo-item {
          flex-basis: calc((100% - 0.625rem) / 2);
        }
      }

      .action-buttons {
        width: 100%;
        flex-direction: column;

        .button-primary {
          width: 100%;
        }
      }
    }
  }
}
</style>
