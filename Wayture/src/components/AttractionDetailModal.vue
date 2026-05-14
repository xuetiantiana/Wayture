<template>
  <div class="attraction-modal" role="dialog" aria-modal="true" :aria-label="`${point.name} 景点详情`">
    <button class="close-button" type="button" aria-label="关闭景点详情" @click="$emit('close')">
      ×
    </button>

    <div class="image-shell">
      <div class="image-frame">
        <div class="hero-image" :style="heroImageStyle"></div>
      </div>
      <div v-if="point.images.length > 1" class="image-dots" aria-label="景点图片切换">
        <button
          v-for="(image, index) in point.images"
          :key="`${point.id}-${image}-${index}`"
          class="dot"
          :class="{ active: index === currentImageIndex }"
          type="button"
          :aria-label="`查看第 ${index + 1} 张图片`"
          @click="currentImageIndex = index"
        ></button>
      </div>
    </div>

    <div class="content">
      <div class="meta-row">
        <div>
          <div class="small-tag" :style="{ backgroundColor: tagBackground }">{{ point.field }}</div>
          <h3>{{ point.name }}</h3>
        </div>
        <span class="duration">建议游玩时长：{{ point.cost }}</span>
      </div>

      <div class="copy-block">
        <p class="copy-label">项目介绍：</p>
        <p class="description">{{ point.description }}</p>
      </div>

      <div class="tag-row">
        <span v-for="tag in detailTags" :key="tag" class="pill-tag">{{ tag }}</span>
      </div>

      <button class="cta-button" type="button" :disabled="isAdded" @click="$emit('add', point.id)">
        {{ isAdded ? '已加入路线' : '加入路线' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { TourPointData } from '../data/tourPoints';

const props = defineProps<{
  point: TourPointData;
  isAdded: boolean;
  accentColor?: string;
}>();

defineEmits<{
  close: [];
  add: [id: number];
}>();

const currentImageIndex = ref(0);

watch(
  () => props.point.id,
  () => {
    currentImageIndex.value = 0;
  },
  { immediate: true }
);

const heroImageStyle = computed(() => ({
  backgroundImage: props.point.images.length
    ? `url(${props.point.images[currentImageIndex.value]})`
    : 'linear-gradient(180deg, rgba(65, 54, 24, 0.55), rgba(23, 23, 23, 0.88))',
}));

const tagBackground = computed(() => props.accentColor ?? 'rgba(140, 110, 32, 0.58)');

const detailTags = computed(() => {
  const tags = [props.point.field, '推荐打卡'];
  if (props.point.cost) {
    tags.push(`游玩 ${props.point.cost}`);
  }
  tags.push(props.isAdded ? '已加入路线' : '可加入路线');
  return tags;
});
</script>

<style scoped lang="scss">
.attraction-modal {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(480px, calc(100% - 48px));
  min-height: 720px;
  max-height: calc(100% - 24px);
  overflow-y: auto;
  padding: 18px 18px 0;
  border-radius: 0;
  background: rgba(29, 26, 24, 0.96);
  border: 1px solid rgba(217, 184, 106, 0.22);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  z-index: 10;

  .close-button {
    position: absolute;
    top: 10px;
    right: 12px;
    width: 30px;
    height: 30px;
    border: none;
    padding: 0;
    color: rgba(255, 247, 232, 0.82);
    background: transparent;
    font-size: 28px;
    line-height: 1;
  }

  .image-shell {
    padding-top: 16px;

    .image-frame {
      padding: 18px;
      border-radius: 24px;
      background: rgba(17, 16, 15, 0.92);

      .hero-image {
        aspect-ratio: 1.48;
        border-radius: 18px;
        background-color: #24303d;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
      }
    }

    .image-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 12px 0 2px;

      .dot {
        width: 8px;
        height: 8px;
        border: none;
        border-radius: 999px;
        padding: 0;
        background: rgba(255, 244, 233, 0.72);

        &.active {
          background: #ff7c2a;
        }
      }
    }
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 12px 6px 24px;

    .meta-row {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .small-tag {
        display: inline-flex;
        padding: 5px 12px;
        border-radius: 999px;
        color: #f7e8bd;
        font-size: 0.8rem;
        font-weight: 600;
      }

      h3 {
        margin: 10px 0 0;
        color: #fbf6eb;
        font-size: 1.75rem;
        line-height: 1.2;
      }

      .duration {
        color: #ffbf1c;
        font-size: 1rem;
        font-weight: 700;
      }
    }

    .copy-block {
      display: grid;
      gap: 8px;

      .copy-label {
        margin: 0;
        color: #f0e4d0;
        font-size: 1rem;
        font-weight: 700;
      }

      .description {
        margin: 0;
        color: rgba(246, 240, 231, 0.86);
        font-size: 1rem;
        line-height: 1.8;
        white-space: pre-line;
      }
    }

    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;

      .pill-tag {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 14px;
        border-radius: 10px;
        background: rgba(103, 79, 26, 0.62);
        color: #f5e8c8;
        font-size: 0.9rem;
      }
    }

    .cta-button {
      margin-top: auto;
      width: 100%;
      min-height: 56px;
      border: none;
      border-radius: 14px;
      background: linear-gradient(180deg, #ffbc1e 0%, #f5a400 100%);
      color: #fff9eb;
      font-size: 1.3rem;
      font-weight: 700;
      box-shadow: 0 12px 24px rgba(168, 104, 5, 0.3);

      &:disabled {
        opacity: 0.72;
        cursor: not-allowed;
      }
    }
  }
}

@media (max-width: 960px) {
  .attraction-modal {
    width: min(92vw, 460px);
    min-height: auto;
    max-height: calc(100% - 24px);
    overflow-y: auto;
    padding: 14px 14px 0;

    .content {
      .meta-row {
        h3 {
          font-size: 1.42rem;
        }
      }

      .copy-block {
        .description {
          font-size: 0.95rem;
        }
      }

      .cta-button {
        font-size: 1.12rem;
      }
    }
  }
}
</style>