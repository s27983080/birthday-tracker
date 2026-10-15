import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory } from 'vue-router';
import App from './App.vue';
import { createAppRouter } from './router';

async function mountAt(path: string) {
  const router = createAppRouter(createMemoryHistory());
  await router.push(path);
  const wrapper = mount(App, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ birthdays: [] }), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the heading', async () => {
    const { wrapper } = await mountAt('/');

    expect(wrapper.get('h1').text()).toBe('Birthday Tracker');
  });

  it('shows the birthday list at /', async () => {
    const { wrapper } = await mountAt('/');

    expect(wrapper.get('h2').text()).toBe('Birthdays');
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('shows the submission form at /submit', async () => {
    const { wrapper } = await mountAt('/submit');

    expect(wrapper.get('h2').text()).toBe('Add a birthday');
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('navigates from the list to the form and back', async () => {
    const { wrapper, router } = await mountAt('/');

    await wrapper.get('a.button').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/submit');

    await wrapper.get('a.back-link').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/');
  });
});
