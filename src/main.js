import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createAuth0 } from '@auth0/auth0-vue'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
  },
  // Mirrors the tokens in style.css. `chrome` is a custom colour for the app
  // bar; `primary` is the interactive accent; error/warning/success/info carry
  // priority and status, so components reference those names rather than raw
  // Material palette names like 'red'.
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          chrome: '#272430',
          primary: '#544ca8',
          surface: '#ffffff',
          background: '#eeebf2',
          error: '#c0392b',
          warning: '#c07214',
          success: '#2e7d46',
          info: '#0e7c86',
        },
      },
    },
  },
})

const auth0 = createAuth0({
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  },
  // Refresh tokens + localStorage cache keep the session alive across reloads
  // without relying on third-party cookies (which browsers increasingly block).
  useRefreshTokens: true,
  cacheLocation: 'localstorage',
})

createApp(App).use(router).use(vuetify).use(auth0).mount('#app')
