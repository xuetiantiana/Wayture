import { PublicClientApplication, AccountInfo, ResponseMode, type RedirectRequest } from '@azure/msal-browser';
import { ref } from 'vue';

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const redirectUri = isLocalhost
  ? `${window.location.origin}`
  : `${window.location.origin}`;

const msalConfig = {
  auth: {
    clientId: 'f120c81b-70e1-4da9-82f2-ac0278329dda',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri,
    OIDCOptions: {
      responseMode: ResponseMode.QUERY,
    },
  }
};

const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile'],
  redirectUri
};

const msalInstance = new PublicClientApplication(msalConfig);
const account = ref<AccountInfo | null>(null);
const isAuthenticated = ref(false);
const initialized = ref(false);
const clientInitialized = ref(false);

let authPromise: Promise<void> | null = null;

function cleanLogoutStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('state') || params.has('code') || params.has('error')) {
    return;
  }

  window.history.replaceState(
    null,
    document.title,
    `${window.location.pathname}${window.location.hash}`,
  );
}

async function ensureClientInitialized() {
  if (!clientInitialized.value) {
    await msalInstance.initialize();
    clientInitialized.value = true;
  }
}

async function initAuth() {
  await ensureClientInitialized();
  if (initialized.value) {
    return;
  }
  if (!authPromise) {
    authPromise = (async () => {
      const response = await msalInstance.handleRedirectPromise();
      if (response?.account) {
        account.value = response.account;
      } else {
        const currentAccounts = msalInstance.getAllAccounts();
        if (currentAccounts.length > 0) {
          account.value = currentAccounts[0];
        }
      }
      isAuthenticated.value = !!account.value;
      cleanLogoutStateFromUrl();
      initialized.value = true;
    })();
  }
  await authPromise;
}

async function login() {
  await ensureClientInitialized();
  await msalInstance.loginRedirect(loginRequest);
}

async function logout() {
  await ensureClientInitialized();
  await msalInstance.logoutRedirect({
    postLogoutRedirectUri: redirectUri,
  });
}

export function useAuth() {
  return {
    account,
    isAuthenticated,
    initAuth,
    login,
    logout
  };
}
