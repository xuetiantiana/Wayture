<template>
  <section class="memories-page" aria-label="回忆页面">
    <section class="memory-hero">
      <button class="back-button" type="button" @click="router.back()">
        &lsaquo;
      </button>

      <div class="hero-content">
        <h1>
          Hi, {{ tour.userSettings.value.nickname || tour.currentUsername.value }} Family Passport<br />
          Begin Your Memory Journey
        </h1>

        <div class="passport-preview">
          <img :src="exampleImage" alt="Memory Passport example" />
        </div>

        <div class="hero-actions">
          <button type="button" @click="generateGallery">Memory Journal</button>
          <button type="button" @click="generateGallery">Memory Album</button>
        </div>
      </div>
    </section>

    <section class="memory-workspace">
      <header class="workspace-header">
        <h2>Upload your photos</h2>
        <nav class="workspace-links" aria-label="回忆导航">
          <button type="button" @click="router.push('/memories-gallery')">
            View the journal
          </button>
          <span></span>
          <button type="button" @click="router.push('/memories-gallery')">
            View album
          </button>
        </nav>
      </header>

      <div
        class="upload-panel"
        :class="{ disabled: isUploading }"
        @click="triggerFileInput"
      >
        <div v-if="isUploading" class="spinner small"></div>
        <div v-else class="upload-icon">+</div>
        <p>{{ isUploading ? "Uploading..." : "Upload/Drag your photos, Start Creating Your Memories" }}</p>
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="image/*"
          @change="handleUpload"
          style="display: none"
        />
      </div>

      <div v-if="isLoading" class="loading-section">
        <div class="spinner"></div>
        <p>加载照片中...</p>
      </div>

      <template v-else>
        <div class="photo-strip">
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
          <p>最多可上传8张</p>
          <div class="action-buttons">
            <button
              class="button-primary"
              :disabled="selectedIndices.size === 0 || isGenerating"
              @click="generateGallery"
            >
              {{ isGenerating ? "Generating..." : "Generate Memory Journal" }}
            </button>
            <button
              class="button-primary"
              :disabled="selectedIndices.size === 0 || isGenerating"
              @click="generateGallery"
            >
              {{ isGenerating ? "Generating..." : "Generate Memory Album" }}
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
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTourStore } from "../composables/useTourStore";
import exampleImage from "../assets/images/example-1.png";

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
    photos.value = await resp.json();
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
      await fetch(`${apiBase}/api/upload-image`, {
        method: "POST",
        body: formData,
      });
    }
    await fetchPhotos();
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
  } else {
    selectedIndices.add(index);
  }
}

function toggleSelectAll() {
  if (selectedIndices.size === photos.value.length) {
    selectedIndices.clear();
  } else {
    photos.value.forEach((p) => selectedIndices.add(p.index));
  }
}

// --- 生成回忆 ---
async function generateGallery() {
  if (selectedIndices.size === 0) return;

  isGenerating.value = true;
  try {
    const resp = await fetch(`${apiBase}/api/generate-gallery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: tour.currentUsername.value,
        selected_indices: Array.from(selectedIndices),
      }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const memory = data.memory || {};

    const session = {
      id: memory.id || Date.now().toString(),
      title: memory.title || `回忆 ${new Date().toLocaleDateString("zh-CN")}`,
      created_at: new Date().toISOString(),
      images: (data.images || []).map((img: any) =>
        typeof img === "string"
          ? { index: 0, generated_url: img, description: "" }
          : {
              index: img.index ?? 0,
              generated_url: img.generated_url || img.url || "",
              description: img.description || "",
              source_photo: img.source_photo,
            },
      ),
      source_photo_count: memory.source_photo_count || 0,
      generated_image_count: memory.generated_image_count || 0,
    };
    tour.addGallerySession(session);
    selectedIndices.clear();
    router.push("/memories-gallery");
  } catch (e) {
    console.error("生成回忆失败:", e);
  } finally {
    isGenerating.value = false;
  }
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
    align-items: center;
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
      width: 2rem;
      height: 2rem;
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
        margin: 0 0 2.125rem;
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

      .hero-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.875rem;

        button {
          min-height: 1.875rem;
          padding: 0 0.75rem;
          border: 0;
          border-radius: 0.375rem;
          background: rgba(232, 238, 184, 0.66);
          color: #222;
          cursor: pointer;
        }
      }
    }
  }

  .memory-workspace {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
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
      margin-bottom: 1rem;

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
        font-weight: 600;
      }

      .upload-icon {
        color: #777;
        font-size: 2.35rem;
        font-weight: 300;
        line-height: 1;
      }
    }

    .photo-strip {
      display: grid;
      grid-template-columns: repeat(5, minmax(5.125rem, 1fr));
      gap: 0.625rem;
      margin-bottom: 1.75rem;

      .photo-item {
        position: relative;
        aspect-ratio: 1 / 0.82;
        overflow: hidden;
        border: 0.125rem solid transparent;
        border-radius: 0.375rem;
        background: #eee;
        cursor: pointer;
        transition:
          border-color 0.2s,
          transform 0.2s;

        &:hover {
          transform: translateY(-0.125rem);
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
      .photo-strip {
        grid-template-columns: repeat(3, minmax(0, 1fr));
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
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
