<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="closeOnOverlay">
      <div class="modal-content" @click.stop>
        <button v-if="tour.hasUserSettings()" class="close-btn" @click="close">&times;</button>

        <template v-if="step === 1">
          <div class="modal-header">
            <h3>{{ t('settings.welcome') }}</h3>
          </div>
          <p class="modal-subtitle">{{ t('settings.subtitle') }}</p>

          <div class="modal-body">
            <div class="step-content">
              <input
                v-model="nickname"
                type="text"
                :placeholder="t('settings.nicknamePlaceholder')"
                class="nickname-input"
                @keyup.enter="nextStep"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-primary" :disabled="!canProceed" @click="nextStep">{{ t('settings.next') }}</button>
          </div>
        </template>

        <template v-else-if="step === 2">
          <div class="modal-header">
            <h3>{{ t('settings.pickStyle') }}</h3>
          </div>
          <p class="modal-subtitle">{{ t('settings.pickStyleSubtitle') }}</p>

          <div class="modal-body">
            <div class="step-content">
              <div class="style-options">
                <div
                  v-for="style in tourStyles"
                  :key="style.value"
                  :class="['style-btn', { active: selectedStyle === style.value }]"
                  @click="selectedStyle = style.value"
                >
                  <span class="style-name">{{ style.icon }}&nbsp;{{ style.name }}</span>
                  <span class="style-desc">{{ style.desc }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="prevStep">{{ t('settings.prev') }}</button>
            <button class="btn-primary" :disabled="!canProceed" @click="complete">{{ t('settings.finish') }}</button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTourStore } from '../composables/useTourStore';

interface Props {
  show: boolean;
  onComplete: (settings: { nickname: string; tourStyle: string }) => void;
  onClose: () => void;
}

const props = defineProps<Props>();

const { t } = useI18n();
const tour = useTourStore();

const step = ref(1);
const nickname = ref('');
const selectedStyle = ref('');

const tourStyles = [
  { value: t('settings.styleFamily'), name: t('settings.styleFamily'), icon: '👨‍👩‍👧', desc: '' },
  { value: t('settings.styleCouple'), name: t('settings.styleCouple'), icon: '💕', desc: '' },
  { value: t('settings.styleSolo'), name: t('settings.styleSolo'), icon: '🌿', desc: '' },
  { value: t('settings.styleFriends'), name: t('settings.styleFriends'), icon: '🎉', desc: '' }
];

const canProceed = computed(() => {
  if (step.value === 1) {
    return nickname.value.trim().length > 0;
  } else if (step.value === 2) {
    return selectedStyle.value !== '';
  }
  return false;
});

// 初始化数据
watch(() => props.show, (newShow) => {
  if (newShow) {
    step.value = 1;
    nickname.value = tour.userSettings.value.nickname || '';
    selectedStyle.value = tour.userSettings.value.tourStyle || '';
  }
});

function nextStep() {
  if (canProceed.value && step.value < 2) {
    step.value++;
  }
}

function prevStep() {
  if (step.value > 1) {
    step.value--;
  }
}

function complete() {
  if (canProceed.value) {
    const settings = {
      nickname: nickname.value.trim(),
      tourStyle: selectedStyle.value
    };
    tour.setUserSettings(settings);
    props.onComplete(settings);
  }
}

function close() {
  props.onClose();
}

function closeOnOverlay() {
  // 如果是修改模式，允许点击遮罩关闭；如果是初始设置，不允许
  if (tour.hasUserSettings()) {
    close();
  }
}
</script>

<style scoped lang="scss">
:global(body:has(.modal-overlay)) {
  overflow: hidden;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  .modal-content {
    position: relative;
    width: 670px;
    padding: 56px 40px;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    background: #202020;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);

    .close-btn {
      position: absolute;
      right: 20px;
      top: 18px;
      padding: 0 4px;
      border: none;
      border-radius: 8px;
      background: none;
      color: rgba(255, 255, 255, 0.55);
      font-size: 34px;
      line-height: 1;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #f8fafc;
      }
    }

    .modal-header {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;

      h3 {
        margin: 0;
        color: #f8fafc;
        font-size: 2.5rem;
        line-height: 1.15;
        font-weight: 600;
        text-align: center;
      }
    }

    .modal-subtitle {
      margin: 4px 0 0;
      color: rgba(255, 255, 255, 0.62);
      font-size: 1.5rem;
      line-height: 1.25;
      text-align: center;
    }

    .modal-body {
      margin-top: 43px;

      .step-content {
        text-align: center;

        .nickname-input {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          color: #f8fafc;
          font-size: 1.125rem;
          transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;

          &::placeholder {
            color: rgba(255, 255, 255, 0.52);
          }

          &:focus {
            outline: none;
            border-color: rgba(255, 181, 0, 0.72);
            background: rgba(255, 255, 255, 0.06);
            box-shadow: 0 0 0 3px rgba(255, 181, 0, 0.12);
          }
        }

        .style-options {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;

          .style-btn {
            grid-column: span 3;
            display: inline-flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 2px;
            min-height: 65px;
            padding: 0 5px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.04);
            color: #cbd5e1;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;

            &:nth-child(4),
            &:nth-child(5) {
              grid-column: span 3;
            }

            &:hover {
              border-color: rgba(255, 181, 0, 0.72);
              background: rgba(255, 181, 0, 0.08);
            }

            &.active {
              border-color: rgba(255, 181, 0, 0.9);
              background: rgba(255, 181, 0, 0.14);
              color: #e2e8f0;
            }

            .style-icon {
              font-size: 1.35rem;
            }

            .style-name {
              font-size: 1.125rem;
              font-weight: 600;
            }

            .style-desc {
              display: none;
            }
          }
        }
      }
    }

    .modal-footer {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 39px;

      .btn-secondary,
      .btn-primary {
        height: 48px;
        padding: 0 24px;
        border: none;
        border-radius: 8px;
        font-size: 1.25rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-secondary {
        background: rgba(148, 163, 184, 0.2);
        color: #cbd5e1;

        &:hover {
          background: rgba(148, 163, 184, 0.3);
        }
      }

      .btn-primary {
        flex: 1;
        width: 100%;
        background: rgb(255, 183, 0);
        color: #000;

        &:hover:not(:disabled) {
          background: #ffc01c;
        }

        &:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
      }
    }
  }
}

@media (max-width: 640px) {
  .modal-overlay {
    .modal-content {
      width: calc(100% - 32px);
      height: auto;
      min-height: 404px;
      padding: 34px 20px;

      .modal-header {
        h3 {
          font-size: 30px;
        }
      }

      .modal-subtitle {
        font-size: 18px;
      }

      .modal-body {
        margin-top: 30px;

        .step-content {
          .style-options {
            grid-template-columns: 1fr;
          }
        }
      }

      .modal-footer {
        flex-direction: column;
        margin-top: 28px;

        .btn-secondary,
        .btn-primary {
          width: 100%;
        }
      }
    }
  }
}
</style>