<script setup lang="ts">
import { mdiArrowLeft } from '@mdi/js';
import { reactive, ref } from 'vue';
import { ApiError, submitBirthday } from '../api/birthdays';
import { formatReminderWindow } from '../format';

const NAME_MAX_LENGTH = 200;
const REMINDER_WINDOW_ITEMS = Array.from({ length: 14 }, (_, i) => ({
  title: formatReminderWindow(i + 1),
  value: i + 1,
}));
const DEFAULT_REMINDER_WINDOW_DAYS = 7;

/** Today in the user's local time zone, as YYYY-MM-DD for the date input's `max`. */
function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const form = reactive({ name: '', birthDate: '', reminderWindowDays: DEFAULT_REMINDER_WINDOW_DAYS });
const submitting = ref(false);
const fieldErrors = ref<Record<string, string>>({});
const errorMessage = ref('');
const successMessage = ref('');

async function onSubmit() {
  submitting.value = true;
  fieldErrors.value = {};
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const name = form.name.trim();
    await submitBirthday({ name, birthDate: form.birthDate, reminderWindowDays: form.reminderWindowDays });
    successMessage.value = `Saved ${name}'s birthday.`;
    Object.assign(form, { name: '', birthDate: '', reminderWindowDays: DEFAULT_REMINDER_WINDOW_DAYS });
  } catch (err) {
    if (err instanceof ApiError && err.details.length > 0) {
      fieldErrors.value = Object.fromEntries(err.details.map((d) => [d.field, d.message]));
      errorMessage.value = 'Please fix the highlighted fields.';
    } else {
      errorMessage.value = 'Something went wrong saving the birthday. Please try again.';
    }
  } finally {
    submitting.value = false;
  }
}

/** A field's API error with its label in front ("Birthday must not be in the future"), for Vuetify's error slot. */
function errorFor(field: string, label: string): string[] {
  const message = fieldErrors.value[field];
  return message ? [`${label} ${message}`] : [];
}
</script>

<template>
  <v-btn :to="{ name: 'birthdays' }" class="back-link" variant="text" :prepend-icon="mdiArrowLeft">
    Back to birthdays
  </v-btn>

  <v-card class="birthday-form-card" variant="flat" border>
    <v-card-item>
      <h2 class="text-h5">Add a birthday</h2>
    </v-card-item>

    <v-card-text>
      <!-- Vuetify puts a field's error in an element with id "<field id>-messages". -->
      <v-form class="birthday-form" @submit.prevent="onSubmit">
        <v-text-field
          id="name"
          v-model="form.name"
          name="name"
          label="Name"
          autocomplete="off"
          :maxlength="NAME_MAX_LENGTH"
          :error-messages="errorFor('name', 'Name')"
          :aria-invalid="Boolean(fieldErrors.name)"
          aria-describedby="name-messages"
        />

        <v-text-field
          id="birthDate"
          v-model="form.birthDate"
          name="birthDate"
          type="date"
          label="Birthday"
          persistent-placeholder
          :max="localToday()"
          :error-messages="errorFor('birthDate', 'Birthday')"
          :aria-invalid="Boolean(fieldErrors.birthDate)"
          aria-describedby="birthDate-messages"
        />

        <v-select
          id="reminderWindowDays"
          v-model="form.reminderWindowDays"
          name="reminderWindowDays"
          label="Remind me"
          :items="REMINDER_WINDOW_ITEMS"
          :error-messages="errorFor('reminderWindowDays', 'Reminder window')"
        />

        <v-btn
          type="submit"
          color="primary"
          size="large"
          block
          :loading="submitting"
          :disabled="submitting || !form.name.trim() || !form.birthDate"
        >
          {{ submitting ? 'Saving…' : 'Save birthday' }}
        </v-btn>

        <v-alert v-if="successMessage" type="success" variant="tonal" role="status" :text="successMessage" />
        <v-alert v-if="errorMessage" type="error" variant="tonal" :text="errorMessage" />
      </v-form>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.back-link {
  margin: 0 0 1rem -1rem;
}

.birthday-form-card {
  max-width: 28rem;
}

.birthday-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
