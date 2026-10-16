import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter } from '../router';
import { createAppVuetify } from '../vuetify';
import SubmitBirthdayView from './SubmitBirthdayView.vue';

function mountView() {
  return mount(SubmitBirthdayView, { global: { plugins: [createAppRouter(createMemoryHistory()), createAppVuetify()] } });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** The reminder window picker. It's a Vuetify select (its list opens in an overlay), not a native <select>. */
function reminderSelect(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: 'VSelect' });
}

async function fillAndSubmit(wrapper: VueWrapper) {
  await wrapper.get('#name').setValue('  Ada Lovelace ');
  await wrapper.get('#birthDate').setValue('1815-12-10');
  await reminderSelect(wrapper).setValue(3);
  await wrapper.get('form').trigger('submit');
}

describe('SubmitBirthdayView', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('links back to the birthday list', () => {
    const wrapper = mountView();

    expect(wrapper.get('a.back-link').attributes('href')).toBe('/');
  });

  it('offers reminder windows from 1 to 14 days, defaulting to 7', () => {
    const wrapper = mountView();
    const items = reminderSelect(wrapper).props('items') as { title: string; value: number }[];

    expect(items.map((item) => item.value)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(items[0].title).toBe('1 day before');
    expect(reminderSelect(wrapper).props('modelValue')).toBe(7);
    expect(wrapper.get('.v-select__selection-text').text()).toBe('7 days before');
  });

  it('disables submit until name and birthday are filled in', async () => {
    const wrapper = mountView();
    const button = wrapper.get('button');

    expect(button.attributes('disabled')).toBeDefined();
    await wrapper.get('#name').setValue('   ');
    await wrapper.get('#birthDate').setValue('1815-12-10');
    expect(button.attributes('disabled')).toBeDefined();
    await wrapper.get('#name').setValue('Ada');
    expect(button.attributes('disabled')).toBeUndefined();
  });

  it('posts the birthday and shows a confirmation', async () => {
    fetchMock.mockResolvedValue(jsonResponse(202, { id: '0199e3a0-0000-7000-8000-000000000001' }));
    const wrapper = mountView();

    await fillAndSubmit(wrapper);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/birthdays');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      name: 'Ada Lovelace',
      birthDate: '1815-12-10',
      reminderWindowDays: 3,
    });
    expect(wrapper.get('[role="status"]').text()).toBe("Saved Ada Lovelace's birthday.");
    expect((wrapper.get('#name').element as HTMLInputElement).value).toBe('');
  });

  it('disables the button while the request is in flight', async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const wrapper = mountView();

    await fillAndSubmit(wrapper);

    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    expect(wrapper.get('button').text()).toBe('Saving…');

    resolve(jsonResponse(202, { id: 'x' }));
    await flushPromises();
    expect(wrapper.get('button').text()).toBe('Save birthday');
  });

  it('shows field errors returned by the API', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: 'ValidationError',
        message: 'Request body is invalid',
        details: [{ field: 'birthDate', message: 'must not be in the future' }],
      }),
    );
    const wrapper = mountView();

    await fillAndSubmit(wrapper);
    await flushPromises();

    expect(wrapper.get('#birthDate-messages').text()).toBe('Birthday must not be in the future');
    expect(wrapper.get('#birthDate').attributes('aria-invalid')).toBe('true');
    expect(wrapper.get('.v-alert[role="alert"]').text()).toBe('Please fix the highlighted fields.');
    expect((wrapper.get('#name').element as HTMLInputElement).value).toBe('  Ada Lovelace ');
  });

  it('shows a generic error when the request fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: 'ServiceUnavailable', message: 'down' }));
    const wrapper = mountView();

    await fillAndSubmit(wrapper);
    await flushPromises();

    expect(wrapper.get('.v-alert[role="alert"]').text()).toBe('Something went wrong saving the birthday. Please try again.');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });
});
