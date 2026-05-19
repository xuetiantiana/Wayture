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
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import HeaderBar from './components/HeaderBar.vue';
import TourGuideModal from './components/TourGuideModal.vue';
import { useAuth } from './composables/useAuth';
import { useTourStore } from './composables/useTourStore';

const tour = useTourStore();
const auth = useAuth();
const route = useRoute();
const showGuideModal = ref(false);

const guideExcludedRoutes = new Set(['Home']);

function shouldShowGuideModal() {
  return Boolean(
    auth.isAuthenticated.value &&
    !guideExcludedRoutes.has(String(route.name ?? '')) &&
    !tour.hasUserSettings()
  );
}

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
  window.addEventListener('openTourGuide', openTourGuide);
});

onUnmounted(() => {
  window.removeEventListener('openTourGuide', openTourGuide);
});

watch(
  [() => route.name, auth.isAuthenticated],
  () => {
    showGuideModal.value = shouldShowGuideModal();
  },
  { immediate: true }
);
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
