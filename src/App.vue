<template>
  <v-app>
    <v-app-bar color="chrome" title="Todos">
      <template #prepend>
        <img src="/favicon.svg" alt="Todos logo" class="appbar-logo" />
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

      <div v-else-if="error" class="gate">
        <v-alert type="error" variant="tonal" max-width="480">
          {{ error.message }}
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

    <!-- Matches the portfolio site's footer. The copyright doubles as the
         back-link every bwh-* app carries. -->
    <v-footer app color="chrome" class="site-footer">
      <span class="foot-copy">
        &copy; {{ year }}
        <a href="https://buzz-was-here.vercel.app/" target="_blank" rel="noopener noreferrer">
          buzz.was.here
        </a>
      </span>
      <span class="foot-note">Built with Vue, Vuetify, Auth0, and Neon Postgres</span>
    </v-footer>
  </v-app>
</template>

<script setup>
import { useAuth0 } from '@auth0/auth0-vue'

const { isAuthenticated, isLoading, user, error, loginWithRedirect, logout } = useAuth0()

// Four-digit current year for the footer copyright.
const year = new Date().getFullYear()

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

.foot-copy {
  font-weight: 700;
}

.foot-copy a {
  color: inherit;
  text-decoration: none;
}

.foot-copy a:hover,
.foot-copy a:focus-visible {
  text-decoration: underline;
}

.foot-note {
  margin-inline-start: auto;
  opacity: 0.9;
}

@media (max-width: 600px) {
  .site-footer {
    justify-content: center;
  }

  .foot-note {
    margin-inline-start: 0;
  }
}
</style>
