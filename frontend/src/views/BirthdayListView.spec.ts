import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter } from '../router';
import { formatBirthDate } from '../format';
import BirthdayListView from './BirthdayListView.vue';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function mountView() {
  return mount(BirthdayListView, { global: { plugins: [createAppRouter(createMemoryHistory())] } });
}

describe('BirthdayListView', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('lists each birthday with its name, date and reminder window', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        birthdays: [
          { id: '2', name: 'Grace Hopper', birthDate: '1906-12-09', reminderWindowDays: 1 },
          { id: '1', name: 'Ada Lovelace', birthDate: '1815-12-10', reminderWindowDays: 7 },
        ],
      }),
    );
    const wrapper = mountView();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith('/api/birthdays', undefined);
    const rows = wrapper.findAll('tbody tr').map((row) => row.findAll('td').map((cell) => cell.text()));
    expect(rows).toEqual([
      ['Grace Hopper', formatBirthDate('1906-12-09'), '1 day before'],
      ['Ada Lovelace', formatBirthDate('1815-12-10'), '7 days before'],
    ]);
    expect(wrapper.get('time').attributes('datetime')).toBe('1906-12-09');
  });

  it('shows a loading message until the request completes', async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const wrapper = mountView();

    expect(wrapper.get('[role="status"]').text()).toBe('Loading birthdays…');

    resolve(jsonResponse(200, { birthdays: [] }));
    await flushPromises();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });

  it('shows an empty state when there are no birthdays', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { birthdays: [] }));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('.empty').text()).toBe('No birthdays yet.');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('shows an error when the request fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'InternalServerError', message: 'Something went wrong' }));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe('Something went wrong loading birthdays. Please try again.');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('links to the submission page', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { birthdays: [] }));
    const wrapper = mountView();

    expect(wrapper.get('a.button').attributes('href')).toBe('/submit');
    expect(wrapper.get('a.button').text()).toBe('Add a birthday');
  });
});
