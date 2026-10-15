<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { listBirthdays, type Birthday } from '../api/birthdays';
import { formatBirthDate, formatReminderWindow } from '../format';

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
      <h2>Birthdays</h2>
      <RouterLink :to="{ name: 'submit' }" class="button">Add a birthday</RouterLink>
    </div>

    <p v-if="loading" role="status">Loading birthdays…</p>
    <p v-else-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p v-else-if="birthdays.length === 0" class="empty">No birthdays yet.</p>
    <table v-else>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Birthday</th>
          <th scope="col">Reminder</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="birthday in birthdays" :key="birthday.id">
          <td>
            <RouterLink :to="{ name: 'birthday', params: { id: birthday.id } }">{{ birthday.name }}</RouterLink>
          </td>
          <td>
            <time :datetime="birthday.birthDate">{{ formatBirthDate(birthday.birthDate) }}</time>
          </td>
          <td>{{ formatReminderWindow(birthday.reminderWindowDays) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.birthday-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header h2 {
  margin: 0;
}

.button {
  padding: 0.4rem 0.9rem;
  border: 1px solid currentColor;
  border-radius: 4px;
  text-decoration: none;
}

table {
  border-collapse: collapse;
  width: 100%;
}

th,
td {
  padding: 0.5rem;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

.error {
  color: #b00020;
  margin: 0;
}

.empty {
  margin: 0;
}
</style>
