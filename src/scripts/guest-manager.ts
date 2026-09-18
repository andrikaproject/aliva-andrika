import {
  buildInvitationUrl,
  displayRecipientName,
  type InvitationCategory,
  type RelationshipGroup,
} from '../lib/invitation-recipient.ts';

type DeliveryStatus = 'pending' | 'copied' | 'sent';
type Title = { id: number; label: string; is_default?: boolean };
type Guest = {
  id: number;
  name: string;
  category: InvitationCategory;
  relationship_group: RelationshipGroup;
  titles: Title[];
  status: DeliveryStatus;
  version: number;
};
type ApiError = Error & { code?: string; status?: number };

const app = document.getElementById('guest-manager-app');
if (!app) throw new Error('Guest manager root is missing.');

const baseUrl = app.dataset.invitationBaseUrl || window.location.origin;
const apiBase = '/api/invitation-admin';
const state = {
  guests: [] as Guest[],
  titles: [] as Title[],
  template: '',
  templateVersion: 1,
  activeGroup: '',
  editing: null as Guest | null,
  selectedTitles: [] as Title[],
};

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing guest manager element: ${id}`);
  return element as T;
};

const loginPanel = $('guest-login-panel');
const dashboard = $('guest-dashboard');
const loginForm = $('guest-login-form') as HTMLFormElement;
const loginError = $('login-error');
const guestList = $('guest-list');
const guestListStatus = $('guest-list-status');
const guestCount = $('guest-count');
const guestDialog = $('guest-dialog') as HTMLDialogElement;
const guestForm = $('guest-form') as HTMLFormElement;
const templateDialog = $('template-dialog') as HTMLDialogElement;
const templateForm = $('template-form') as HTMLFormElement;
const toast = $('gm-toast');

function apiError(response: Response, payload: unknown): ApiError {
  const body = payload && typeof payload === 'object' ? payload as { error?: string; code?: string } : {};
  const error = new Error(body.error || `Request failed (${response.status}).`) as ApiError;
  error.code = body.code;
  error.status = response.status;
  return error;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  const text = await response.text();
  let payload: unknown = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: 'Server returned an unreadable response.' };
  }
  if (!response.ok) throw apiError(response, payload);
  return payload as T;
}

function showToast(message: string): void {
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 3200);
}

function setError(element: HTMLElement, message: string): void {
  element.textContent = message;
  element.hidden = !message;
}

function statusLabel(status: DeliveryStatus): string {
  return status === 'sent' ? 'Sudah dikirim' : status === 'copied' ? 'Sudah disalin' : 'Belum dikirim';
}

function categoryLabel(category: InvitationCategory): string {
  return category === 'titled' ? 'Personal Bergelar' : category === 'group' ? 'Group' : 'Personal';
}

function groupLabel(group: RelationshipGroup): string {
  return {
    friend_andrika: 'Teman Andrika',
    friend_aliva: 'Teman Aliva',
    parent_friend_andrika: 'Teman Orang Tua Andrika',
    parent_friend_aliva: 'Teman Orang Tua Aliva',
  }[group];
}

function renderGuestName(guest: Pick<Guest, 'name' | 'category' | 'titles'>): string {
  return displayRecipientName({ name: guest.name, category: guest.category, titles: guest.titles.map((title) => title.label) });
}

function renderGuestUrl(guest: Pick<Guest, 'name' | 'category' | 'titles'>): string {
  return buildInvitationUrl(baseUrl, { name: guest.name, category: guest.category, titles: guest.titles.map((title) => title.label) });
}

function escapeText(value: string): Text {
  return document.createTextNode(value);
}

function makeButton(label: string, className: string, handler: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function filteredGuests(): Guest[] {
  const query = ($('guest-search') as HTMLInputElement).value.trim().toLocaleLowerCase('id-ID');
  const category = ($('guest-category-filter') as HTMLSelectElement).value;
  const status = ($('guest-status-filter') as HTMLSelectElement).value;
  return state.guests.filter((guest) => {
    if (state.activeGroup && guest.relationship_group !== state.activeGroup) return false;
    if (category && guest.category !== category) return false;
    if (status && guest.status !== status) return false;
    if (query && !`${guest.name} ${renderGuestName(guest)}`.toLocaleLowerCase('id-ID').includes(query)) return false;
    return true;
  });
}

function renderGuests(): void {
  guestList.replaceChildren();
  const guests = filteredGuests();
  guestCount.textContent = `${guests.length} tamu ditampilkan`;
  if (!guests.length) {
    const item = document.createElement('li');
    item.className = 'gm-row';
    const text = document.createElement('div');
    text.className = 'gm-row-name';
    text.textContent = state.guests.length ? 'Tidak ada tamu yang cocok dengan penyaringan ini.' : 'Belum ada tamu. Tambahkan tamu pertama untuk mulai membuat link.';
    item.append(text);
    guestList.append(item);
    return;
  }

  for (const guest of guests) {
    const item = document.createElement('li');
    item.className = 'gm-row';
    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'gm-row-name';
    name.append(escapeText(renderGuestName(guest)));
    const meta = document.createElement('div');
    meta.className = 'gm-row-meta';
    meta.append(escapeText(categoryLabel(guest.category)));
    info.append(name, meta);

    const group = document.createElement('div');
    group.className = 'gm-row-group';
    group.append(escapeText(groupLabel(guest.relationship_group)));

    const status = document.createElement('span');
    status.className = `gm-status ${guest.status === 'sent' ? 'gm-status--sent' : ''}`;
    status.textContent = statusLabel(guest.status);

    const actions = document.createElement('div');
    actions.className = 'gm-row-actions';
    actions.append(makeButton('Salin Pesan', 'gm-row-action', () => copyMessage(guest)));
    if (guest.status !== 'sent') actions.append(makeButton('Tandai Dikirim', 'gm-row-action', () => markSent(guest)));
    actions.append(makeButton('Edit', 'gm-row-action', () => openGuestDialog(guest)));
    actions.append(makeButton('Hapus', 'gm-row-action', () => deleteGuest(guest)));
    item.append(info, group, status, actions);
    guestList.append(item);
  }
}

function setLoading(message: string): void {
  guestListStatus.className = 'gm-state';
  guestListStatus.textContent = message;
}

function setListError(message: string): void {
  guestListStatus.className = 'gm-state is-error';
  guestListStatus.textContent = message;
}

async function loadGuests(): Promise<void> {
  setLoading('Memuat daftar tamu...');
  const params = new URLSearchParams();
  const category = ($('guest-category-filter') as HTMLSelectElement).value;
  const status = ($('guest-status-filter') as HTMLSelectElement).value;
  if (category) params.set('category', category);
  if (status) params.set('status', status);
  if (state.activeGroup) params.set('relationship_group', state.activeGroup);
  try {
    const payload = await request<{ guests: Guest[] }>(`/guests?${params}`);
    state.guests = payload.guests;
    guestListStatus.textContent = '';
    renderGuests();
  } catch (error) {
    if ((error as ApiError).status === 401) return showLogin('Sesi berakhir. Masukkan kode akses kembali.');
    setListError(error instanceof Error ? error.message : 'Daftar tamu tidak dapat dimuat.');
  }
}

async function loadSupportingData(): Promise<void> {
  const [titlePayload, settingsPayload] = await Promise.all([
    request<{ titles: Title[] }>('/titles'),
    request<{ settings: { message_template: string; version: number } }>('/settings'),
  ]);
  state.titles = titlePayload.titles;
  state.template = settingsPayload.settings.message_template;
  state.templateVersion = settingsPayload.settings.version;
  renderTitlePicker();
}

function showDashboard(): void {
  loginPanel.hidden = true;
  dashboard.hidden = false;
}

function showLogin(message = ''): void {
  dashboard.hidden = true;
  loginPanel.hidden = false;
  setError(loginError, message);
  ($('access-code') as HTMLInputElement).focus();
}

async function bootstrap(): Promise<void> {
  try {
    const session = await request<{ authenticated: boolean }>('/session');
    if (!session.authenticated) return showLogin();
    showDashboard();
    await loadSupportingData();
    await loadGuests();
  } catch (error) {
    showLogin(error instanceof Error ? error.message : 'Pengelola tidak dapat dibuka.');
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setError(loginError, '');
  const code = ($('access-code') as HTMLInputElement).value;
  if (!code) return setError(loginError, 'Masukkan kode akses.');
  const button = loginForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  button.disabled = true;
  try {
    await request('/login', { method: 'POST', body: JSON.stringify({ code }) });
    ($('access-code') as HTMLInputElement).value = '';
    showDashboard();
    await loadSupportingData();
    await loadGuests();
  } catch (error) {
    setError(loginError, error instanceof Error ? error.message : 'Kode akses tidak dapat diperiksa.');
  } finally {
    button.disabled = false;
  }
});

$('logout-button').addEventListener('click', async () => {
  try { await request('/logout', { method: 'POST' }); } finally { showLogin(); }
});

$('refresh-guests-button').addEventListener('click', () => void loadGuests());
['guest-search', 'guest-category-filter', 'guest-status-filter'].forEach((id) => {
  $(id).addEventListener('input', () => void loadGuests());
});

$('guest-group-tabs').addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-group]');
  if (!target) return;
  state.activeGroup = target.dataset.group || '';
  document.querySelectorAll<HTMLButtonElement>('.gm-tab').forEach((tab) => tab.classList.toggle('is-active', tab === target));
  void loadGuests();
});

function renderTitlePicker(): void {
  const picker = $('title-picker') as HTMLSelectElement;
  picker.replaceChildren(new Option('Pilih gelar', ''));
  for (const title of state.titles) picker.append(new Option(title.label, String(title.id)));
  picker.append(new Option('Lainnya', 'custom'));
}

function renderSelectedTitles(): void {
  const container = $('selected-titles');
  container.replaceChildren();
  state.selectedTitles.forEach((title, index) => {
    const chip = document.createElement('span');
    chip.className = 'gm-title-chip';
    chip.append(escapeText(`${index + 1}. ${title.label}`));
    if (index > 0) {
      const moveUp = makeButton('↑', '', () => {
        [state.selectedTitles[index - 1], state.selectedTitles[index]] = [state.selectedTitles[index], state.selectedTitles[index - 1]];
        renderSelectedTitles();
        updateGuestPreview();
      });
      moveUp.setAttribute('aria-label', `Naikkan gelar ${title.label}`);
      chip.append(moveUp);
    }
    if (index < state.selectedTitles.length - 1) {
      const moveDown = makeButton('↓', '', () => {
        [state.selectedTitles[index], state.selectedTitles[index + 1]] = [state.selectedTitles[index + 1], state.selectedTitles[index]];
        renderSelectedTitles();
        updateGuestPreview();
      });
      moveDown.setAttribute('aria-label', `Turunkan gelar ${title.label}`);
      chip.append(moveDown);
    }
    const remove = makeButton('×', '', () => {
      state.selectedTitles.splice(index, 1);
      renderSelectedTitles();
      updateGuestPreview();
    });
    remove.setAttribute('aria-label', `Hapus gelar ${title.label}`);
    chip.append(remove);
    container.append(chip);
  });
}

function updateGuestPreview(): void {
  const guest = {
    name: ($('guest-name') as HTMLInputElement).value,
    category: ($('guest-category') as HTMLSelectElement).value as InvitationCategory,
    titles: state.selectedTitles,
  };
  $('guest-preview-name').textContent = renderGuestName(guest);
  $('guest-preview-url').textContent = buildInvitationUrl(baseUrl, {
    name: guest.name,
    category: guest.category,
    titles: state.selectedTitles.map((title) => title.label),
  });
  $('title-controls').hidden = guest.category !== 'titled';
}

function resetGuestForm(): void {
  guestForm.reset();
  ($('guest-id') as HTMLInputElement).value = '';
  ($('guest-version') as HTMLInputElement).value = '';
  ($('guest-status') as HTMLSelectElement).value = 'pending';
  state.editing = null;
  state.selectedTitles = [];
  $('custom-title-row').hidden = true;
  ($('custom-title') as HTMLInputElement).value = '';
  $('guest-dialog-heading').textContent = 'Tambah Tamu';
  setError($('guest-form-error'), '');
  renderSelectedTitles();
  updateGuestPreview();
}

function openGuestDialog(guest: Guest | null = null): void {
  resetGuestForm();
  if (guest) {
    state.editing = guest;
    ($('guest-id') as HTMLInputElement).value = String(guest.id);
    ($('guest-version') as HTMLInputElement).value = String(guest.version);
    ($('guest-name') as HTMLInputElement).value = guest.name;
    ($('guest-category') as HTMLSelectElement).value = guest.category;
    ($('guest-group') as HTMLSelectElement).value = guest.relationship_group;
    ($('guest-status') as HTMLSelectElement).value = guest.status;
    state.selectedTitles = [...guest.titles];
    $('guest-dialog-heading').textContent = 'Edit Tamu';
    renderSelectedTitles();
    updateGuestPreview();
  }
  guestDialog.showModal();
  ($('guest-name') as HTMLInputElement).focus();
}

$('add-guest-button').addEventListener('click', () => openGuestDialog());
$('guest-category').addEventListener('change', () => {
  const category = ($('guest-category') as HTMLSelectElement).value;
  if (category !== 'titled' && state.selectedTitles.length > 0) {
    state.selectedTitles = [];
    renderSelectedTitles();
  }
  updateGuestPreview();
});
$('guest-name').addEventListener('input', updateGuestPreview);
$('title-picker').addEventListener('change', (event) => {
  const select = event.currentTarget as HTMLSelectElement;
  if (select.value === 'custom') {
    select.value = '';
    $('custom-title-row').hidden = false;
    ($('custom-title') as HTMLInputElement).focus();
    return;
  }
  const title = state.titles.find((candidate) => String(candidate.id) === select.value);
  if (!title || state.selectedTitles.some((selected) => selected.id === title.id)) return;
  if (state.selectedTitles.length >= 6) return showToast('Maksimal enam gelar dapat dipilih.');
  state.selectedTitles.push(title);
  select.value = '';
  renderSelectedTitles();
  updateGuestPreview();
});

$('add-custom-title-button').addEventListener('click', () => {
  $('custom-title-row').hidden = false;
  ($('custom-title') as HTMLInputElement).focus();
});

$('save-custom-title-button').addEventListener('click', async () => {
  const input = $('custom-title') as HTMLInputElement;
  const label = input.value.trim();
  if (!label) return showToast('Tulis gelar manual terlebih dahulu.');
  try {
    const payload = await request<{ title: Title }>('/titles', { method: 'POST', body: JSON.stringify({ label }) });
    state.titles = [...state.titles.filter((title) => title.id !== payload.title.id), payload.title];
    renderTitlePicker();
    state.selectedTitles.push(payload.title);
    input.value = '';
    $('custom-title-row').hidden = true;
    renderSelectedTitles();
    updateGuestPreview();
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Gelar manual tidak dapat disimpan.');
  }
});

guestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorElement = $('guest-form-error');
  setError(errorElement, '');
  const payload = {
    name: ($('guest-name') as HTMLInputElement).value,
    category: ($('guest-category') as HTMLSelectElement).value,
    relationship_group: ($('guest-group') as HTMLSelectElement).value,
    titles: state.selectedTitles.map((title) => title.label),
    status: ($('guest-status') as HTMLSelectElement).value,
  };
  const id = ($('guest-id') as HTMLInputElement).value;
  if (id) Object.assign(payload, { version: Number(($('guest-version') as HTMLInputElement).value) });
  const submit = guestForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  submit.disabled = true;
  try {
    const response = await request<{ guest: Guest }>(id ? `/guests/${id}` : '/guests', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    });
    if (id) state.guests = state.guests.map((guest) => guest.id === response.guest.id ? response.guest : guest);
    guestDialog.close();
    showToast(id ? 'Data tamu diperbarui.' : 'Tamu ditambahkan.');
    await loadGuests();
  } catch (error) {
    if ((error as ApiError).code === 'version_conflict') setError(errorElement, 'Tamu ini berubah di perangkat lain. Muat ulang lalu periksa data terbaru.');
    else setError(errorElement, error instanceof Error ? error.message : 'Tamu tidak dapat disimpan.');
  } finally {
    submit.disabled = false;
  }
});

async function markSent(guest: Guest): Promise<void> {
  if (!window.confirm(`Tandai “${renderGuestName(guest)}” sebagai sudah dikirim?`)) return;
  try {
    await updateStatus(guest, 'sent');
    showToast('Status ditandai sudah dikirim.');
    await loadGuests();
  } catch (error) { showToast(error instanceof Error ? error.message : 'Status tidak dapat diperbarui.'); }
}

async function updateStatus(guest: Guest, status: DeliveryStatus): Promise<void> {
  const response = await request<{ guest: Guest }>(`/guests/${guest.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      version: guest.version,
      name: guest.name,
      category: guest.category,
      relationship_group: guest.relationship_group,
      titles: guest.titles.map((title) => title.label),
      status,
    }),
  });
  state.guests = state.guests.map((candidate) => candidate.id === response.guest.id ? response.guest : candidate);
}

async function copyMessage(guest: Guest): Promise<void> {
  if (!state.template.trim()) {
    showToast('Simpan template pesan terlebih dahulu.');
    templateDialog.showModal();
    return;
  }
  const message = state.template
    .replaceAll('{{nama_tamu}}', renderGuestName(guest))
    .replaceAll('{{link_undangan}}', renderGuestUrl(guest));
  try {
    await navigator.clipboard.writeText(message);
  } catch {
    const fallback = document.createElement('textarea');
    fallback.value = message;
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.append(fallback);
    fallback.select();
    const copied = document.execCommand('copy');
    fallback.remove();
    if (!copied) {
      showToast('Salin otomatis gagal. Pesan siap dipilih di dialog edit template.');
      return;
    }
  }
  if (guest.status === 'pending') {
    try { await updateStatus(guest, 'copied'); } catch (error) { return showToast(error instanceof Error ? error.message : 'Pesan tersalin, tetapi status belum tersimpan.'); }
  }
  showToast('Pesan disalin. Status dikirim tetap harus ditandai manual.');
  await loadGuests();
}

async function deleteGuest(guest: Guest): Promise<void> {
  if (!window.confirm(`Hapus data “${renderGuestName(guest)}”?`)) return;
  try {
    await request(`/guests/${guest.id}`, { method: 'DELETE', body: JSON.stringify({ version: guest.version }) });
    showToast('Data tamu dihapus.');
    await loadGuests();
  } catch (error) { showToast(error instanceof Error ? error.message : 'Data tamu tidak dapat dihapus.'); }
}

$('template-button').addEventListener('click', () => {
  ($('message-template') as HTMLTextAreaElement).value = state.template;
  setError($('template-form-error'), '');
  templateDialog.showModal();
  ($('message-template') as HTMLTextAreaElement).focus();
});

templateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorElement = $('template-form-error');
  setError(errorElement, '');
  const template = ($('message-template') as HTMLTextAreaElement).value;
  const submit = templateForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  submit.disabled = true;
  try {
    const payload = await request<{ settings: { message_template: string; version: number } }>('/settings/message-template', {
      method: 'PUT',
      body: JSON.stringify({ template, version: state.templateVersion }),
    });
    state.template = payload.settings.message_template;
    state.templateVersion = payload.settings.version;
    templateDialog.close();
    showToast('Template pesan disimpan.');
  } catch (error) {
    setError(errorElement, error instanceof Error ? error.message : 'Template tidak dapat disimpan.');
  } finally { submit.disabled = false; }
});

document.querySelectorAll<HTMLButtonElement>('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog || '')?.closest('dialog')?.close());
});

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !dashboard.hidden) void loadGuests();
});

void bootstrap();
