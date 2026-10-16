<script setup lang="ts">
import { mdiCakeVariant } from '@mdi/js';
</script>

<template>
  <v-app>
    <v-app-bar flat border>
      <template #prepend>
        <v-icon :icon="mdiCakeVariant" color="primary" class="ms-2" />
      </template>
      <v-app-bar-title tag="h1">Birthday Tracker</v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-container class="page">
        <RouterView />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.page {
  max-width: 56rem;
  padding-block: 2rem;
}
</style>
