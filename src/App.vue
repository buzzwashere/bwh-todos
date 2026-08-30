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
          <!-- close-on-content-click is off so the select and the checkbox can be
               used without the menu closing under them; the one item that leaves
               the menu closes it itself. -->
          <v-menu
            v-model="showSettings"
            location="bottom end"
            :close-on-content-click="false"
          >
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                icon="mdi-cog"
                variant="text"
                aria-label="Settings"
              />
            </template>
            <v-list density="compact" min-width="240">
              <v-list-item
                title="Change Password"
                prepend-icon="mdi-lock-reset"
                @click="openChangePassword"
              />

              <v-divider class="my-1" />

              <v-list-item class="settings-field">
                <v-select
                  v-model="sortBy"
                  :items="sortOptions"
                  label="Sort by"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-list-item>

              <v-list-item class="settings-field">
                <v-checkbox
                  v-model="showCompleted"
                  label="Show Completed"
                  density="compact"
                  hide-details
                />
              </v-list-item>
            </v-list>
          </v-menu>
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
      <span v-if="userEmail" class="foot-email" :title="userEmail">
        {{ userEmail }}
      </span>
      <v-btn
        class="foot-about"
        variant="text"
        size="small"
        @click="showAbout = true"
      >
        About
      </v-btn>
    </v-footer>

    <about-dialog v-model="showAbout" />
    <change-password-dialog v-model="showChangePassword" :email="userEmail" />
  </v-app>
</template>

<script setup>
import { computed, nextTick, provide, ref, watch } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import AboutDialog from './components/AboutDialog.vue'
import ChangePasswordDialog from './components/ChangePasswordDialog.vue'
import { DEFAULT_SETTINGS, SORT_OPTIONS, normalizeSettings, todoSettingsKey } from './todoSettings'
import { createSettingsApi } from './services/settingsApi'

const { isAuthenticated, isLoading, user, error, getAccessTokenSilently, loginWithRedirect, logout } =
  useAuth0()

const settingsApi = createSettingsApi(() => getAccessTokenSilently())

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

// Settings menu state. `sortBy` and `showCompleted` are provided to the list rather
// than passed as props — the menu lives in the app bar, which is not on the route,
// so there is no prop path between the two.
const showSettings = ref(false)
const showChangePassword = ref(false)
const sortOptions = SORT_OPTIONS

// The stored preferences live with the account, so they are fetched once the user is
// signed in and written back on every change. Defaults hold until the fetch lands.
const sortBy = ref(DEFAULT_SETTINGS.sortBy)
const showCompleted = ref(DEFAULT_SETTINGS.showCompleted)

// Applying the fetched values assigns the same refs the watcher below is watching, so
// this guard stops the load from immediately echoing back as a save.
let applyingStored = false

watch(
  isAuthenticated,
  async signedIn => {
    if (!signedIn) {
      return
    }
    try {
      const stored = normalizeSettings(await settingsApi.get())
      applyingStored = true
      sortBy.value = stored.sortBy
      showCompleted.value = stored.showCompleted
      await nextTick()
    } catch (err) {
      // A failed read is not worth interrupting the app for — the menu simply opens
      // on the defaults, and the next change still saves.
      console.error('[settings] load failed', err)
    } finally {
      applyingStored = false
    }
  },
  { immediate: true }
)

watch([sortBy, showCompleted], () => {
  if (applyingStored || !isAuthenticated.value) {
    return
  }
  settingsApi
    .save({ sortBy: sortBy.value, showCompleted: showCompleted.value })
    .catch(err => console.error('[settings] save failed', err))
})

provide(todoSettingsKey, { sortBy, showCompleted })

function openChangePassword() {
  showSettings.value = false
  showChangePassword.value = true
}

// Blank while signed out, which hides the line.
const userEmail = computed(() => user.value?.email ?? '')

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

/* An outlined field floats its label above the input's own box, and Vuetify clips
   `.v-list-item__content` with `overflow: hidden` — which cut the top off "Sort by".
   Unclipping alone is not enough: the label then lands under the item above it, so
   the row also needs the vertical room to hold it. */
.settings-field {
  padding-top: 12px;
  padding-bottom: 4px;
}

.settings-field :deep(.v-list-item__content) {
  overflow: visible;
}

/* Truncates rather than wrapping the bar to two rows on a narrow screen; the
   full address stays available through the title attribute. */
.foot-email {
  opacity: 0.9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Pushed to the trailing edge, and still there when signed out drops the email. */
.foot-about {
  margin-inline-start: auto;
}
</style>
