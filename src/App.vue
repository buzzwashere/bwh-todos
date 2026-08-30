<template>
  <v-app>
    <v-app-bar color="chrome" title="Todos">
      <template #prepend>
        <img
          src="/favicon.svg"
          alt="About Todos"
          title="About Todos"
          class="appbar-logo"
          role="button"
          tabindex="0"
          @click="showAbout = true"
          @keydown.enter.prevent="showAbout = true"
          @keydown.space.prevent="showAbout = true"
        />
      </template>
      <template #append>
        <template v-if="isAuthenticated">
          <span class="user-email d-none d-sm-inline text-body-2 mr-3">
            {{ user?.email }}
          </span>
          <v-btn variant="text" prepend-icon="mdi-logout" @click="logoutClick">
            Log out
          </v-btn>
        </template>
        <v-btn
          v-else-if="!isLoading"
          variant="text"
          prepend-icon="mdi-login"
          @click="login"
        >
          Sign in
        </v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <div v-if="isLoading" class="gate">
        <v-progress-circular indeterminate color="primary" size="48" />
      </div>

      <div v-else-if="fatalError" class="gate">
        <v-alert type="error" variant="tonal" max-width="480">
          {{ fatalError.message }}
        </v-alert>
      </div>

      <div v-else-if="!isAuthenticated" class="gate">
        <v-card max-width="420" class="pa-6 text-center" variant="outlined">
          <v-icon size="48" color="primary" class="mb-3">mdi-cloud-check-outline</v-icon>
          <h2 class="text-h6 mb-2">Sign in to sync your todos</h2>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Your todos are stored securely in the cloud and available on every device.
          </p>
          <v-btn color="primary" size="large" prepend-icon="mdi-login" @click="login">
            Sign in
          </v-btn>
        </v-card>
      </div>

      <router-view v-else />
    </v-main>

    <!-- The copyright and build credit this bar used to carry now live in the
         About dialog, opened from the app-bar logo. -->
    <v-footer app color="chrome" class="site-footer">
      <span v-if="userId" class="foot-userid" :title="userId">
        User ID: {{ userId }}
      </span>
    </v-footer>

    <about-dialog v-model="showAbout" />
  </v-app>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import AboutDialog from './components/AboutDialog.vue'

const { isAuthenticated, isLoading, user, error, loginWithRedirect, logout } = useAuth0()

// Auth0 errors that mean "nobody is signed in", not "something broke". The plugin
// runs checkSession() on startup and reports a failure through `error` rather than
// throwing, so a cache holding no usable refresh token — expired, evicted, or from a
// session that never got `offline_access` — surfaced as a red alert where the sign-in
// card belongs. Signing in is the fix for all of these, so they fall through to the
// card that offers it; anything else is still a real error and still shown.
const SIGNED_OUT_ERRORS = ['missing_refresh_token', 'invalid_grant', 'login_required', 'consent_required']

const fatalError = computed(() => {
  const err = error.value
  if (!err) {
    return null
  }
  return SIGNED_OUT_ERRORS.includes(err.error) ? null : err
})

const showAbout = ref(false)

// The Auth0 subject claim — the stable identifier for the signed-in account, and
// what the API sees as the todo owner. Blank while signed out, which hides the line.
const userId = computed(() => user.value?.sub ?? '')

function login() {
  loginWithRedirect()
}

function logoutClick() {
  logout({ logoutParams: { returnTo: window.location.origin } })
}
</script>

<style scoped>
.appbar-logo {
  width: 30px;
  height: 30px;
  display: block;
  margin-inline-start: 13px;
  cursor: pointer;
}

.appbar-logo:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
  border-radius: 4px;
}

/* Tighten the default 20px gap between the logo and the title by ~4px.
   Selector mirrors Vuetify's own `.v-toolbar__content > .v-toolbar-title`
   so it outranks it on specificity. */
:deep(.v-toolbar__content > .v-toolbar-title) {
  margin-inline-start: 16px;
}

.gate {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.user-email {
  opacity: 0.9;
}

/* Footer styling mirrors buzzwashere's .site-footer. The background comes from
   the `chrome` theme colour rather than CSS, so Vuetify also derives a readable
   on-chrome text colour instead of us hard-coding one. */
.site-footer {
  display: flex;
  align-items: center;
  gap: 8px 20px;
  flex-wrap: wrap;
  padding: 10px 24px;
  font-size: 0.82rem;
  border-top: 1px solid var(--bwh-chrome-rule);
}

/* One long opaque string, so it truncates rather than wrapping the bar to two
   rows; the full value stays available through the title attribute. */
.foot-userid {
  opacity: 0.9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .site-footer {
    justify-content: center;
  }
}
</style>
