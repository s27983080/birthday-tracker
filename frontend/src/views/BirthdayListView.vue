<script setup lang="ts">
import { mdiCakeVariantOutline, mdiPlus } from '@mdi/js';
import { onMounted, ref } from 'vue';
import { listBirthdays, type Birthday } from '../api/birthdays';
import { formatBirthDate, formatReminderWindow } from '../format';

const PAGE_SIZE = 10;

// Unsorted until the user clicks a header, so the API's order (most recently added first) is the default.
const headers = [
  { title: 'Name', key: 'name' },
  // birthDate is YYYY-MM-DD, so sorting the raw string sorts by date.
  { title: 'Birthday', key: 'birthDate' },
  { title: 'Reminder', key: 'reminderWindowDays' },
];

const birthdays = ref<Birthday[]>([]);
const loading = ref(true);
const errorMessage = ref('');

onMounted(async () => {
  try {
    birthdays.value = await listBirthdays();
  } catch {
    errorMessage.value = 'Something went wrong loading birthdays. Please try again.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="birthday-list">
    <div class="header">
      <h2 class="text-h5">Birthdays</h2>
      <v-btn :to="{ name: 'submit' }" class="button" color="primary" :prepend-icon="mdiPlus">Add a birthday</v-btn>
    </div>

    <div v-if="loading" class="loading" role="status">
      <v-progress-circular indeterminate size="20" width="2" />
      Loading birthdays…
    </div>
    <v-alert v-else-if="errorMessage" type="error" variant="tonal" :text="errorMessage" />
    <v-empty-state v-else-if="birthdays.length === 0" class="empty" :icon="mdiCakeVariantOutline" text="No birthdays yet." />
    <v-card v-else variant="flat" border>
      <v-data-table
        :headers="headers"
        :items="birthdays"
        item-value="id"
        :items-per-page="PAGE_SIZE"
        :hide-default-footer="birthdays.length <= PAGE_SIZE"
      >
        <template #item.name="{ item }">
          <RouterLink :to="{ name: 'birthday', params: { id: item.id } }" class="name-link">{{ item.name }}</RouterLink>
        </template>
        <template #item.birthDate="{ item }">
          <time :datetime="item.birthDate">{{ formatBirthDate(item.birthDate) }}</time>
        </template>
        <template #item.reminderWindowDays="{ item }">
          {{ formatReminderWindow(item.reminderWindowDays) }}
        </template>
      </v-data-table>
    </v-card>
  </section>
</template>

<style scoped>
.birthday-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.name-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
  text-decoration: none;
}

.name-link:hover,
.name-link:focus-visible {
  text-decoration: underline;
}
</style>
