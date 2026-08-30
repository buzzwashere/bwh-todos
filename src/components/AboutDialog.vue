<template>
  <v-dialog
    v-model="show"
    max-width="420"
  >
    <v-card class="pa-5">
      <div class="text-subtitle-1 font-weight-bold mb-4">About Todos</div>

      <p class="about-copy mb-2">
        &copy; {{ year }}
        <a
          href="https://buzz-was-here.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          buzz.was.here
        </a>
      </p>

      <p class="about-note mb-0">Built with Vue, Vuetify, Auth0, and Neon Postgres</p>

      <v-card-actions class="justify-end px-0 pb-0 pt-4">
        <v-btn
          variant="text"
          @click="show = false"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
const show = defineModel({ type: Boolean })

// Four-digit current year for the copyright line.
const year = new Date().getFullYear()
</script>

<style scoped>
.about-copy {
  font-weight: 700;
}

.about-copy a {
  color: inherit;
}

.about-copy a:hover,
.about-copy a:focus-visible {
  text-decoration: none;
}

.about-note {
  font-size: 0.82rem;
  opacity: 0.9;
}
</style>
