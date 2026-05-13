<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="closeOnOverlay">
      <div class="modal-content" @click.stop>
        <button v-if="tour.hasUserSettings()" class="close-btn" @click="close">&times;</button>

        <template v-if="step === 1">
          <div class="modal-header">
            <h3>Welcome to FamilyFest!🎈</h3>
          </div>
          <p class="modal-subtitle">Today’s adventure begins here.</p>

          <div class="modal-body">
            <div class="step-content">
              <input
                v-model="nickname"
                type="text"
                placeholder="Pick a fun nickname for your adventure! eg:The XiaoQi Family Passport"
                class="nickname-input"
                @keyup.enter="nextStep"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-primary" :disabled="!canProceed" @click="nextStep">Next</button>
          </div>
        </template>

        <template v-else-if="step === 2">
          <div class="modal-header">
            <h3>Choose your travel style</h3>
          </div>
          <p class="modal-subtitle">Pick the vibe for this adventure.</p>

          <div class="modal-body">
            <div class="step-content">
              <div class="style-options">
                <button
                  v-for="style in tourStyles"
                  :key="style.value"
                  :class="['style-btn', { active: selectedStyle === style.value }]"
                  @click="selectedStyle = style.value"
                >
                  <span class="style-icon">{{ style.icon }}</span>
                  <span class="style-name">{{ style.name }}</span>
                  <span class="style-desc">{{ style.desc }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="prevStep">上一步</button>
            <button class="btn-primary" :disabled="!canProceed" @click="complete">Finish</button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTourStore } from '../composables/useTourStore';

interface Props {
  show: boolean;
  onComplete: (settings: { nickname: string; tourStyle: string }) => void;
  onClose: () => void;
}

const props = defineProps<Props>();

const tour = useTourStore();

const step = ref(1);
const nickname = ref('');
const selectedStyle = ref('');

const tourStyles = [
  { value: 'family', name: '全家游', icon: '👨‍👩‍👧‍👦', desc: '适合家庭出游，轻松愉快' },
  { value: 'solo', name: '单身游', icon: '🧳', desc: '独自旅行，自由自在' },
  { value: 'couple', name: '情侣游', icon: '💑', desc: '浪漫二人世界' },
  { value: 'relaxed', name: '轻松游', icon: '🏖️', desc: '悠闲度假，享受生活' }
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

<style scoped>
:global(body:has(.modal-overlay)) {
  overflow: hidden;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.modal-content {
  position: relative;
  width: 670px;
  padding: 56px 40px;
  background: #202020;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
  overflow-y: auto;
}

.modal-header {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #f8fafc;
  font-size: 40px;
  line-height: 1.15;
  font-weight: 800;
  text-align: center;
  font-weight: 600;
}

.close-btn {
  position: absolute;
  right: 20px;
  top: 18px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  font-size: 34px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
}

.modal-subtitle {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 24px;
  line-height: 1.25;
  text-align: center;
}

.modal-body {
  margin-top: 43px;
}

.step-content {
  text-align: center;
}

.nickname-input {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: #f8fafc;
  font-size: 18px;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
}

.nickname-input::placeholder {
  color: rgba(255, 255, 255, 0.52);
}

.nickname-input:focus {
  outline: none;
  border-color: rgba(255, 181, 0, 0.72);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 3px rgba(255, 181, 0, 0.12);
}

.style-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.style-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.style-btn:hover {
  border-color: rgba(255, 181, 0, 0.72);
  background: rgba(255, 181, 0, 0.08);
}

.style-btn.active {
  border-color: rgba(255, 181, 0, 0.9);
  background: rgba(255, 181, 0, 0.14);
  color: #e2e8f0;
}

.style-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.style-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.style-desc {
  font-size: 0.9rem;
  opacity: 0.8;
}

.modal-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 39px;
}

.btn-secondary,
.btn-primary {
  height: 48px;
  padding: 0 24px;
  border-radius: 8px;
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
}

.btn-secondary:hover {
  background: rgba(148, 163, 184, 0.3);
}

.btn-primary {
  flex: 1;
  width: 100%;
  background: #ffb300;
  color: rgba(255, 255, 255, 0.92);
}

.btn-primary:hover:not(:disabled) {
  background: #ffc01c;
}

.btn-primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .style-options {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: calc(100% - 32px);
    height: auto;
    min-height: 404px;
    padding: 34px 20px;
  }

  .modal-header h3 {
    font-size: 30px;
  }

  .modal-subtitle {
    font-size: 18px;
  }

  .modal-body {
    margin-top: 30px;
  }

  .modal-footer {
    flex-direction: column;
    margin-top: 28px;
  }

  .btn-secondary,
  .btn-primary {
    width: 100%;
  }
}
</style>