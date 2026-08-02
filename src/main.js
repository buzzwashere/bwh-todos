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
