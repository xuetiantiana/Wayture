<template>
  <div class="attraction-modal" role="dialog" aria-modal="true" :aria-label="`${point.name} 景点详情`">
    <button class="close-button" type="button" aria-label="关闭景点详情" @click="$emit('close')">
      ×
    </button>

    <div class="modal-body">
    <div class="image-shell">
      <Swiper
        v-if="point.images.length"
        :modules="swiperModules"
        :pagination="{ clickable: true }"
        :loop="point.images.length > 1"
        class="hero-swiper"
      >
        <SwiperSlide v-for="(img, i) in point.images" :key="`${point.id}-${i}`">
          <div class="hero-image" :style="{ backgroundImage: `url(${img})` }"></div>
        </SwiperSlide>
      </Swiper>
      <div v-else class="hero-image hero-image--placeholder"></div>
    </div>

    <div class="content">
      <div class="meta-row">
        <div>
          
          <h3>{{ point.name }}<div class="small-tag" :style="{ backgroundColor: tagBackground }">{{ point.field }}</div></h3>
        </div>
        <span class="duration">建议游玩时长：<span>{{ point.cost }}</span></span>
      </div>

      <div class="copy-block">
        <p class="copy-label">项目介绍：</p>
        <p class="description">{{ point.description }}</p>
      </div>

      

      <button class="cta-button" type="button" :disabled="isAdded" @click="$emit('add', point.id)">
        {{ isAdded ? '已加入路线' : '加入路线' }}
      </button>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
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

const swiperModules = [Pagination];

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
  padding-top: 20px;
  max-height: 90vh;
  overflow: visible;
  z-index: 99;
  display: flex;
  flex-direction: column;

  .close-button {
    position: absolute;
    top: -14px;
    right: -4px;
    width: 32px;
    height: 32px;
    border: none;
    padding: 0;
    border-radius: 8px;
    color: rgba(255, 247, 232, 0.9);
    background: rgba(40, 36, 30, 0.92);
    border: 1px solid rgba(217, 184, 106, 0.3);
    font-size: 22px;
    line-height: 1;
    z-index: 11;
    display: grid;
    place-items: center;
  }

  .modal-body {
    overflow-y: auto;
    max-height: 90vh;
    min-height: 0;
    background: rgba(29, 26, 24, 0.96);
    border: 1px solid rgba(217, 184, 106, 0.22);
    border-radius: 0;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(12px);
    padding: 18px 18px 0;
  }

  .image-shell {
    .hero-swiper {
      border-radius: 16px;
      overflow: hidden;

      :global(.swiper-pagination-bullet) {
        background: rgba(255, 244, 233, 0.72);
        opacity: 1;
      }

      :global(.swiper-pagination-bullet-active) {
        background: #ff7c2a;
      }
    }

    .hero-image {
      aspect-ratio: 1.48;
      background-color: #24303d;
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;
      width: 100%;

      &--placeholder {
        background: linear-gradient(180deg, rgba(65, 54, 24, 0.55), rgba(23, 23, 23, 0.88));
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
        font-size: 1.25rem;
        line-height: 1.2;
      }

      .duration {
        
        font-size: 1rem;
        span{
            color: #ffbf1c;
        }
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
      font-size: 1.25rem;
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

    .modal-body {
      padding: 14px 14px 0;
    }

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