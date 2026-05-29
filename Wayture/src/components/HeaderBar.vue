<template>
  <header class="header-bar">
    <div class="brand" :class="{ 'brand-main': isMainPage }" @click="goHome">Microsoft Research</div>
    <div class="header-actions">
      <button style="display: none;" class="lang-button" type="button" @click="toggleLocale">
        {{ t('lang.switchTo') }}
      </button>
      <template v-if="isAuthenticated">
        <div class="profile-menu" aria-label="用户菜单">
          <button class="avatar-button" type="button" :title="displayName">
            <span class="avatar-text">{{ avatarText }}</span>
          </button>
          <div class="profile-dropdown">
            <div class="profile-info">
              <p class="profile-name">{{ displayName }}</p>
              <p class="profile-username">{{ userPrincipalName }}</p>
            </div>
            <button class="dropdown-item" type="button" @click="openSettings">{{ t('common.settings') }}</button>
            <button class="dropdown-item" type="button" @click="logout">{{ t('common.logout') }}</button>
          </div>
        </div>
      </template>
      <template v-else>
        <button class="button-primary button-login" @click="login">{{ t('common.login') }}</button>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../composables/useAuth';
import { useTourStore } from '../composables/useTourStore';
import { toggleLocale } from '../i18n';

const { t } = useI18n();
const auth = useAuth();
const tour = useTourStore();
const router = useRouter();
const route = useRoute();

onMounted(async () => {
  await auth.initAuth();
});

const isAuthenticated = computed(() => auth.isAuthenticated.value);
const isMainPage = computed(() => route.path === '/main' && tour.activeTab.value === 'map');
const account = computed(() => auth.account.value);
const displayName = computed(() => account.value?.name?.trim() || t('common.guest'));
const userPrincipalName = computed(() => account.value?.username || 'unknown@user');
const avatarText = computed(() => {
  const source = displayName.value;
  if (!source) {
    return 'U';
  }
  return source.slice(0, 1).toUpperCase();
});

function login() {
  auth.login();
}

function logout() {
  auth.logout();
}

function goHome() {
  router.push('/');
}

function openSettings() {
  window.dispatchEvent(new CustomEvent('openTourGuide'));
}
</script>

<style scoped lang="scss">
.header-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.2);
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  z-index: 20;

  .brand {
    position: absolute;
    left: 2rem;
    top: 1.2em;
    font-size: 1.125rem;
    font-weight: 600;
    cursor: pointer;
    z-index: 9;

    &.brand-main {
      color: #fff;
    }
  }

  .header-actions {
    position: absolute;
    right: 2rem;
    top: 1em;
    z-index: 9;
    display: inline-flex;
    align-items: center;
    gap: 12px;

    .lang-button {
      height: 2rem;
      padding: 0 0.75rem;
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      color: #f8fafc;
      font-size: 0.8125rem;
      cursor: pointer;

      &:hover {
        background: rgba(255, 255, 255, 0.22);
      }
    }

    .profile-menu {
      position: relative;
      display: inline-flex;
      align-items: center;

      &::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 100%;
        height: 12px;
      }

      .avatar-button {
        width: 2rem;
        height: 2rem;
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        color: #f8fafc;
        background-color: rgba(27, 168, 102, 1);
        cursor: pointer;

        .avatar-text {
          font-size: 15px;
          font-weight: 700;
          line-height: 1;
        }
      }

      .profile-dropdown {
        position: absolute;
        right: -3.8rem;
        top: calc(100% + 8px);
        min-width: 220px;
        padding: 10px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.95);
        box-shadow: 0 14px 30px rgba(2, 6, 23, 0.4);
        opacity: 0;
        transform: translateY(-6px);
        pointer-events: none;
        transition: opacity 0.16s ease, transform 0.16s ease;
        z-index: 30;

        .profile-info {
          padding: 6px 8px 10px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16);
          margin-bottom: 6px;

          .profile-name {
            margin: 0;
            color: #f8fafc;
            font-size: 14px;
            font-weight: 700;
          }

          .profile-username {
            margin: 4px 0 0;
            color: #94a3b8;
            font-size: 12px;
            word-break: break-all;
          }
        }

        .dropdown-item {
          width: 100%;
          text-align: left;
          border: none;
          border-radius: 8px;
          padding: 8px 10px;
          background: transparent;
          color: #e2e8f0;
          cursor: pointer;
          font-size: 13px;

          &:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          &.danger {
            color: #fca5a5;
          }
        }
      }

      &:hover {
        .profile-dropdown {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
      }
    }

    .button-login {
      padding: 0.2rem 1.2rem;
      height: 2.5rem;
      border: 1px solid rgba(227, 241, 192, 1);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.6);
      color: rgba(23, 68, 58, 1);
      font-size: 1rem;
      transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;
      backdrop-filter: blur(1.25rem);
      &:hover {
        filter: brightness(1.02);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(23, 52, 47, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.38);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }
}

@media (max-width: 640px) {
  .header-bar{
    .brand{
      left: 12px;
    }

    .header-actions{
      right: 12px;
    }
  }
}
</style>
