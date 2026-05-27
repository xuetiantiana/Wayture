<template>
  <section class="hero-card" aria-label="首页">
    <img class="hero-background" src="../assets/images/index-bg.png" alt="" aria-hidden="true" />
    <!-- <div class="hero-vignette"></div> -->
    <div class="hero-content">
      <!-- <p class="hero-kicker">CHIMU</p> -->
      <!-- <img class="hero-logo" src="../assets/images/chimu.png" alt="CHIMU WONDERLAND" /> -->
      <p class="hero-caption">{{ t('home.caption') }}</p>
      <div class="hero-actions">
        <button class="hero-button button-glass" @click="explore">{{ t('home.explore') }}</button>
        <button class="hero-button button-glass" @click="memories">{{ t('home.createMemories') }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';

const { t } = useI18n();
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
  height: 100%;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: 0;
  padding: 3.5rem 6.25rem;
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
    position: absolute;
    left: 50%;
    bottom: 10%;
    transform: translate(-50%, 0);
    text-align: center;
    max-width: min(52.5rem, 40%);
    color: #14100d;
    margin-top: 4rem;

    .hero-kicker {
      margin: 0;
      color: rgba(187, 112, 48, 0.92);
      font-weight: 400;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-shadow: 0 0.125rem 0.75rem rgba(255, 243, 199, 0.26);
    }

    .hero-logo {
      display: block;
      width: 100%;
      max-width: 100%;
      margin: 0.125rem auto 1.125rem;
      filter: drop-shadow(0 0.125rem 0.375rem rgba(35, 26, 15, 0.26));
    }

    .hero-caption {
      margin: 0 0 4em;
      color: #0f0e0a;
      font-size: 2rem;
      font-weight: 400;
    }

    .hero-actions {
      display: flex;
      gap: 0.875rem;
      justify-content: center;
      flex-wrap: wrap;

      .hero-button {
        border: 1px solid rgba(190, 200, 159, 1);
        color: #425042;
        padding: 1.1rem 3.7rem;
        border-radius: 16px;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;

        &.button-glass {
          background: rgba(229, 235, 208, 0.74);
          backdrop-filter: blur(0.3125rem);
          -webkit-backdrop-filter: blur(0.3125rem);
          font-size: 1.25rem;
        }

        &:hover {
          transform: translateY(-0.125rem);
          box-shadow: 0 0.75rem 1.5rem rgba(25, 41, 24, 0.18);
          background: rgba(238, 243, 220, 0.86);
        }
      }
    }
  }
}

@media (max-width: 960px) {
  .hero-card {
    min-height: calc(100% - 4.5rem);
    padding: 2.375rem 1.5rem;

    .hero-content {
      max-width: 80%;
      margin-top: 1rem;

      .hero-caption {
        margin-bottom: 1.5rem;
      }


      .hero-actions {
        .hero-button {
          min-width: 10rem;
        }
      }
    }
  }
}
</style>
