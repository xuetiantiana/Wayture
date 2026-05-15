<template>
  <section class="hero-card" aria-label="首页">
    <img class="hero-background" src="../assets/images/index-bg.png" alt="" aria-hidden="true" />
    <!-- <div class="hero-vignette"></div> -->
    <div class="hero-content">
      <p class="hero-kicker">CHIMU</p>
      <img class="hero-logo" src="../assets/images/chimu.png" alt="CHIMU WONDERLAND" />
      <p class="hero-caption">欢迎来到尺木神奇世界</p>
      <div class="hero-actions">
        <button class="hero-button button-glass" @click="explore">Start exploring</button>
        <button class="hero-button button-glass" @click="memories">Create memories.</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const auth = useAuth();

onMounted(async () => {
  await auth.initAuth();
});

function explore() {
  if (!auth.isAuthenticated.value) {
    auth.login();
  } else {
    router.push('/main');
  }
}

function memories() {
  if (!auth.isAuthenticated.value) {
    auth.login();
  } else {
    router.push('/memories');
  }
}
</script>

<style scoped lang="scss">
.hero-card {
  position: relative;
  height: 100vh;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: 0;
  padding: 56px 100px;
  background: transparent;
  border: none;
  box-shadow: none;

  .hero-background {
    position: absolute;
    top: 50%;
    left: 50%;
    min-width: 100%;
    min-height: 100%;
    width: auto;
    height: auto;
    transform: translate(-50%, -50%);
    object-fit: cover;
  }

  .hero-vignette {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 50% 42%, rgba(244, 248, 213, 0.02) 0%, rgba(36, 48, 32, 0.2) 72%),
      linear-gradient(180deg, rgba(246, 250, 220, 0.2) 0%, rgba(49, 66, 44, 0.18) 100%);
  }

  .hero-content {
    position: relative;
    text-align: center;
    max-width: min(840px, 40%);
    color: #14100d;
    margin-top: clamp(28px, 8vh, 96px);

    .hero-kicker {
      margin: 0;
      color: rgba(187, 112, 48, 0.92);
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-size: clamp(1.2rem, 2vw, 2rem);
      text-shadow: 0 2px 12px rgba(255, 243, 199, 0.26);
    }

    .hero-logo {
      display: block;
      width: 100%;
      max-width: 100%;
      margin: 2px auto 18px;
      filter: drop-shadow(0 2px 6px rgba(35, 26, 15, 0.26));
    }

    .hero-caption {
      margin: 0 0 30px;
      color: #0f0e0a;
      font-size: clamp(1.9rem, 2.3vw, 3rem);
      font-weight: 700;
      text-shadow: 0 1px 6px rgba(242, 228, 187, 0.45);
    }

    .hero-actions {
      display: flex;
      gap: 14px;
      justify-content: center;
      flex-wrap: wrap;

      .hero-button {
        min-width: 178px;
        border: 1px solid rgba(53, 60, 52, 0.25);
        color: #425042;
        font-weight: 600;
        padding: 14px 26px;
        border-radius: 999px;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;

        &.button-glass {
          background: rgba(229, 235, 208, 0.74);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          font-size: 1.25rem;
        }

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(25, 41, 24, 0.18);
          background: rgba(238, 243, 220, 0.86);
        }
      }
    }
  }
}

@media (max-width: 960px) {
  .hero-card {
    min-height: calc(100vh - 72px);
    padding: 38px 24px;

    .hero-content {
      max-width: min(640px, calc(100vw - 32px));
      margin-top: 16px;

      .hero-caption {
        font-size: clamp(1.5rem, 5.8vw, 2.1rem);
        margin-bottom: 24px;
      }

      .hero-logo {
        width: min(560px, calc(100vw - 32px));
      }

      .hero-actions {
        .hero-button {
          min-width: 160px;
        }
      }
    }
  }
}
</style>
