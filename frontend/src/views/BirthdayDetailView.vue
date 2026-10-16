<script setup lang="ts">
import { mdiArrowLeft, mdiCakeVariant } from '@mdi/js';
import { ref, watch } from 'vue';
import { ApiError, getBirthday, type Birthday } from '../api/birthdays';
import { formatBirthDate, formatReminderWindow } from '../format';

const props = defineProps<{ id: string }>();

const birthday = ref<Birthday>();
const loading = ref(true);
const notFound = ref(false);
const errorMessage = ref('');

async function load(id: string) {
  loading.value = true;
  notFound.value = false;
  errorMessage.value = '';
  birthday.value = undefined;

  try {
    const result = await getBirthday(id);
    // Ignore a response for an id we've since navigated away from.
    if (id === props.id) birthday.value = result;
  } catch (err) {
    if (id !== props.id) return;
    // 400 means the id in the URL isn't a valid id at all, which to the user is the same as not found.
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      notFound.value = true;
    } else {
      errorMessage.value = 'Something went wrong loading this birthday. Please try again.';
    }
  } finally {
    if (id === props.id) loading.value = false;
  }
}

// Vue Router reuses this component when moving between birthdays, so reload whenever the id changes.
watch(() => props.id, load, { immediate: true });
</script>

<template>
  <v-btn :to="{ name: 'birthdays' }" class="back-link" variant="text" :prepend-icon="mdiArrowLeft">
    Back to birthdays
  </v-btn>

  <div v-if="loading" class="loading" role="status">
    <v-progress-circular indeterminate size="20" width="2" />
    Loading birthday…
  </div>
  <v-alert v-else-if="notFound" class="not-found" type="info" variant="tonal" text="We couldn't find that birthday." />
  <v-alert v-else-if="errorMessage" type="error" variant="tonal" :text="errorMessage" />
  <v-card v-else-if="birthday" class="birthday" variant="flat" border>
    <v-card-item>
      <template #prepend>
        <v-avatar color="primary" variant="tonal">
          <v-icon :icon="mdiCakeVariant" />
        </v-avatar>
      </template>
      <h2 class="text-h5">{{ birthday.name }}</h2>
    </v-card-item>
    <v-card-text>
      <dl>
        <dt>Birthday</dt>
        <dd>
          <time :datetime="birthday.birthDate">{{ formatBirthDate(birthday.birthDate) }}</time>
        </dd>
        <dt>Reminder</dt>
        <dd>{{ formatReminderWindow(birthday.reminderWindowDays) }}</dd>
      </dl>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.back-link {
  margin: 0 0 1rem -1rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.birthday {
  max-width: 32rem;
}

dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.75rem 2rem;
  margin: 0;
  font-size: 1rem;
}

dt {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

dd {
  margin: 0;
}
</style>
