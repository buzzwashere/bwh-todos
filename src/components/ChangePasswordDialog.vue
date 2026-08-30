<template>
  <v-dialog
    v-model="show"
    max-width="460"
  >
    <v-card class="pa-5">
      <div class="text-subtitle-1 font-weight-bold mb-3">Change password</div>

      <v-alert
        v-if="sent"
        type="success"
        variant="tonal"
        density="compact"
        class="mb-2"
      >
        Reset link sent. Check {{ email }} and follow the link to choose a new password.
      </v-alert>

      <template v-else>
        <p class="text-body-2 mb-2">
          Auth0 handles passwords, so it sends you a reset link rather than taking a new
          password here. The link goes to <strong>{{ email }}</strong>.
        </p>

        <v-alert
          v-if="errorMsg"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-2"
        >
          {{ errorMsg }}
        </v-alert>
      </template>

      <v-card-actions class="justify-end px-0 pb-0 pt-4">
        <v-btn
          variant="text"
          @click="show = false"
        >
          {{ sent ? 'Close' : 'Cancel' }}
        </v-btn>
        <v-btn
          v-if="!sent"
          color="primary"
          variant="flat"
          :loading="sending"
          :disabled="!email"
          @click="sendResetLink"
        >
          Send reset link
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const show = defineModel({ type: Boolean })

const props = defineProps({
  email: {
    type: String,
    default: ''
  }
})

const sending = ref(false)
const sent = ref(false)
const errorMsg = ref('')

// Reopening starts clean, so a previous result never greets the next visit.
watch(show, open => {
  if (open) {
    sending.value = false
    sent.value = false
    errorMsg.value = ''
  }
})

// Auth0's hosted password-reset flow: this asks the tenant to email a reset link.
// The connection is the tenant's database connection name; Auth0's default is
// `Username-Password-Authentication`, overridable with VITE_AUTH0_DB_CONNECTION.
async function sendResetLink() {
  sending.value = true
  errorMsg.value = ''
  try {
    const res = await fetch(`https://${import.meta.env.VITE_AUTH0_DOMAIN}/dbconnections/change_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: import.meta.env.VITE_AUTH0_CLIENT_ID,
        email: props.email,
        connection: import.meta.env.VITE_AUTH0_DB_CONNECTION || 'Username-Password-Authentication'
      })
    })
    if (!res.ok) {
      throw new Error((await res.text()) || `Request failed (${res.status})`)
    }
    sent.value = true
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Could not send the reset link.'
  } finally {
    sending.value = false
  }
}
</script>
