<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ApiError, submitBirthday } from '../api/birthdays';

const NAME_MAX_LENGTH = 200;
const REMINDER_WINDOW_OPTIONS = Array.from({ length: 14 }, (_, i) => i + 1);
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
</script>

<template>
  <form class="birthday-form" novalidate @submit.prevent="onSubmit">
    <h2>Add a birthday</h2>

    <div class="field">
      <label for="name">Name</label>
      <input
        id="name"
        v-model="form.name"
        name="name"
        type="text"
        autocomplete="off"
        required
        :maxlength="NAME_MAX_LENGTH"
        :aria-invalid="Boolean(fieldErrors.name)"
        aria-describedby="name-error"
      />
      <p v-if="fieldErrors.name" id="name-error" class="field-error">Name {{ fieldErrors.name }}</p>
    </div>

    <div class="field">
      <label for="birthDate">Birthday</label>
      <input
        id="birthDate"
        v-model="form.birthDate"
        name="birthDate"
        type="date"
        required
        :max="localToday()"
        :aria-invalid="Boolean(fieldErrors.birthDate)"
        aria-describedby="birthDate-error"
      />
      <p v-if="fieldErrors.birthDate" id="birthDate-error" class="field-error">
        Birthday {{ fieldErrors.birthDate }}
      </p>
    </div>

    <div class="field">
      <label for="reminderWindowDays">Remind me</label>
      <select
        id="reminderWindowDays"
        v-model.number="form.reminderWindowDays"
        name="reminderWindowDays"
        required
        :aria-invalid="Boolean(fieldErrors.reminderWindowDays)"
        aria-describedby="reminderWindowDays-error"
      >
        <option v-for="days in REMINDER_WINDOW_OPTIONS" :key="days" :value="days">
          {{ days }} {{ days === 1 ? 'day' : 'days' }} before
        </option>
      </select>
      <p v-if="fieldErrors.reminderWindowDays" id="reminderWindowDays-error" class="field-error">
        Reminder window {{ fieldErrors.reminderWindowDays }}
      </p>
    </div>

    <button type="submit" :disabled="submitting || !form.name.trim() || !form.birthDate">
      {{ submitting ? 'Saving…' : 'Save birthday' }}
    </button>

    <p v-if="successMessage" class="success" role="status">{{ successMessage }}</p>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
  </form>
</template>

<style scoped>
.birthday-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 24rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-error,
.error {
  color: #b00020;
  margin: 0;
}

.success {
  color: #1b5e20;
  margin: 0;
}
</style>
