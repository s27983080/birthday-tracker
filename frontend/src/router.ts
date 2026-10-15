import { createRouter, createWebHistory, type RouterHistory } from 'vue-router';
import BirthdayDetailView from './views/BirthdayDetailView.vue';
import BirthdayListView from './views/BirthdayListView.vue';
import SubmitBirthdayView from './views/SubmitBirthdayView.vue';

/** Tests pass `createMemoryHistory()`; the app uses HTML5 history (nginx falls back to index.html). */
export function createAppRouter(history: RouterHistory = createWebHistory()) {
  return createRouter({
    history,
    routes: [
      { path: '/', name: 'birthdays', component: BirthdayListView },
      { path: '/submit', name: 'submit', component: SubmitBirthdayView },
      { path: '/birthdays/:id', name: 'birthday', component: BirthdayDetailView, props: true },
    ],
  });
}
