<template>
  <div id="app">
    <HeaderBar class="header-component" />
    <main>
      <router-view />
    </main>
    <TourGuideModal
      :show="showGuideModal"
      :onComplete="onGuideComplete"
      :onClose="onGuideClose"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import HeaderBar from './components/HeaderBar.vue';
import TourGuideModal from './components/TourGuideModal.vue';
import { useTourStore } from './composables/useTourStore';

const tour = useTourStore();
const showGuideModal = ref(false);

function onGuideComplete() {
  showGuideModal.value = false;
}

function onGuideClose() {
  showGuideModal.value = false;
}

function openTourGuide() {
  showGuideModal.value = true;
}

onMounted(() => {
  if (!tour.hasUserSettings()) {
    showGuideModal.value = true;
  }
  window.addEventListener('openTourGuide', openTourGuide);
});

onUnmounted(() => {
  window.removeEventListener('openTourGuide', openTourGuide);
});
</script>

<style scoped>
#app {
  position: relative;
  height: 100vh;
}

.header-component {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

main {
  width: 100%;
  height: 100vh;
}
</style>
