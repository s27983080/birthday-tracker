import { createApp } from 'vue';
import App from './App.vue';
import { createAppRouter } from './router';
import { createAppVuetify } from './vuetify';

createApp(App).use(createAppRouter()).use(createAppVuetify()).mount('#app');
