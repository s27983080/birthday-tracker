import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter } from '../router';
import { createAppVuetify } from '../vuetify';
import { formatBirthDate } from '../format';
import BirthdayDetailView from './BirthdayDetailView.vue';

const ADA = { id: '0199e3a0-0000-7000-8000-000000000001', name: 'Ada Lovelace', birthDate: '1815-12-10', reminderWindowDays: 7 };
const GRACE = { id: '0199e3a0-0000-7000-8000-000000000002', name: 'Grace Hopper', birthDate: '1906-12-09', reminderWindowDays: 1 };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function mountView(id: string) {
  return mount(BirthdayDetailView, {
    props: { id },
    global: { plugins: [createAppRouter(createMemoryHistory()), createAppVuetify()] },
  });
}

describe('BirthdayDetailView', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('shows the birthday', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, ADA));
    const wrapper = mountView(ADA.id);
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(`/api/birthdays/${ADA.id}`, undefined);
    expect(wrapper.get('h2').text()).toBe('Ada Lovelace');
    expect(wrapper.findAll('dd').map((dd) => dd.text())).toEqual([formatBirthDate('1815-12-10'), '7 days before']);
    expect(wrapper.get('time').attributes('datetime')).toBe('1815-12-10');
  });

  it('shows a loading message until the request completes', async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const wrapper = mountView(ADA.id);

    expect(wrapper.get('[role="status"]').text()).toBe('Loading birthday…');

    resolve(jsonResponse(200, ADA));
    await flushPromises();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });

  it.each([
    [404, { error: 'NotFound', message: 'Birthday not found' }],
    [400, { error: 'ValidationError', message: 'Request path is invalid', details: [{ field: 'id', message: 'x' }] }],
  ])('shows not found for a %i', async (status, body) => {
    fetchMock.mockResolvedValue(jsonResponse(status, body));
    const wrapper = mountView('missing');
    await flushPromises();

    expect(wrapper.get('.not-found').text()).toBe("We couldn't find that birthday.");
    expect(wrapper.find('h2').exists()).toBe(false);
  });

  it('shows an error when the request fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'InternalServerError', message: 'Something went wrong' }));
    const wrapper = mountView(ADA.id);
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe('Something went wrong loading this birthday. Please try again.');
  });

  it('links back to the birthday list', () => {
    fetchMock.mockResolvedValue(jsonResponse(200, ADA));
    const wrapper = mountView(ADA.id);

    expect(wrapper.get('a.back-link').attributes('href')).toBe('/');
  });

  it('loads the new birthday when the id changes', async () => {
    fetchMock.mockImplementation(async (url) => jsonResponse(200, String(url).endsWith(GRACE.id) ? GRACE : ADA));
    const wrapper = mountView(ADA.id);
    await flushPromises();

    await wrapper.setProps({ id: GRACE.id });
    await flushPromises();

    expect(fetchMock).toHaveBeenLastCalledWith(`/api/birthdays/${GRACE.id}`, undefined);
    expect(wrapper.get('h2').text()).toBe('Grace Hopper');
  });

  it('ignores a slow response for an id it has moved away from', async () => {
    let resolveAda!: (r: Response) => void;
    fetchMock
      .mockReturnValueOnce(new Promise((r) => (resolveAda = r)))
      .mockResolvedValueOnce(jsonResponse(200, GRACE));
    const wrapper = mountView(ADA.id);

    await wrapper.setProps({ id: GRACE.id });
    await flushPromises();
    resolveAda(jsonResponse(200, ADA));
    await flushPromises();

    expect(wrapper.get('h2').text()).toBe('Grace Hopper');
  });
});
