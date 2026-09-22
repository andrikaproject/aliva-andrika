import {
  MAX_TITLES,
  buildInvitationUrl,
  displayRecipientName,
  styleHonorifics,
  type Honorific,
  type InvitationCategory,
  type RelationshipGroup,
  type TitlePerson,
  type TitlePlacement,
  type WordingStyle,
} from '../lib/invitation-recipient.ts';

const PEOPLE: readonly TitlePerson[] = [1, 2];

type DeliveryStatus = 'pending' | 'copied' | 'sent';
type TemplateKey = 'friend' | 'parent';
type Title = { id: number; label: string; placement: TitlePlacement; is_default?: boolean };
type GuestTitle = Title & { person: TitlePerson };
type Guest = {
  id: number;
  name: string;
  category: InvitationCategory;
  wording_style: WordingStyle;
  second_name: string;
  with_partner: boolean;
  template_key: TemplateKey;
  relationship_group: RelationshipGroup;
  titles: GuestTitle[];
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
  templates: { friend: '', parent: '' } as Record<TemplateKey, string>,
  templateVersion: 1,
  // Whether the couple picked a template themselves in this dialog; until
  // they do, it follows the guest's group.
  templatePicked: false,
  activeGroup: '',
  editing: null as Guest | null,
  // Titles per person, and the ones a changed answer put aside: saying "no"
  // and thinking better of it must not cost the picking.
  selectedTitles: { 1: [] as Title[], 2: [] as Title[] } as Record<TitlePerson, Title[]>,
  stashedTitles: { 1: [] as Title[], 2: [] as Title[] } as Record<TitlePerson, Title[]>,
  stashedSecondName: '',
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

function categoryLabel(category: InvitationCategory, withPartner = true): string {
  if (category === 'titled') return 'Personal Bergelar';
  if (category === 'group') return 'Group';
  return withPartner ? 'Personal' : 'Personal Tanpa Pasangan';
}

/**
 * The category dropdown offers one entry the database has no category for:
 * a personal invitation with no partner after the name.
 */
const SOLO_CATEGORY = 'personal_solo';

function readCategoryChoice(value: string): { category: InvitationCategory; withPartner: boolean } {
  return value === SOLO_CATEGORY
    ? { category: 'personal', withPartner: false }
    : { category: value as InvitationCategory, withPartner: true };
}

function categoryChoiceOf(guest: Pick<Guest, 'category' | 'with_partner'>): string {
  return guest.category === 'personal' && guest.with_partner === false ? SOLO_CATEGORY : guest.category;
}

const STYLE_LABELS: Record<WordingStyle, string> = {
  default: 'Default Template',
  ibu_family: 'Ibu & Keluarga',
  bapak_family: 'Bapak & Keluarga',
  ibu_bapak_family: 'Ibu & Bapak',
  bapak_ibu_family: 'Bapak & Ibu',
};

const HONORIFIC_WORDS: Record<Honorific, string> = { ibu: 'Ibu', bapak: 'Bapak' };
const NAME_FIELD_LABELS: Record<Honorific, string> = { ibu: 'Nama Ibu', bapak: 'Nama Bapak' };
const PLACEMENT_LABELS: Record<TitlePlacement, string> = { prefix: 'Gelar depan', suffix: 'Gelar belakang' };
const TEMPLATE_LABELS: Record<TemplateKey, string> = { friend: 'Teman', parent: 'Orang Tua' };

/** Guests of the parents' friends are written to as such by default. */
function templateForGroup(group: string): TemplateKey {
  return group.startsWith('parent_') ? 'parent' : 'friend';
}

const SAVE_ERRORS: Record<string, string> = {
  version_conflict: 'Tamu ini berubah di perangkat lain. Muat ulang lalu periksa data terbaru.',
  name_required: 'Nama tamu belum diisi.',
  second_name_required: 'Nama kedua belum diisi.',
  titles_required: 'Pilih minimal satu gelar untuk kategori Personal Bergelar.',
  template_key_invalid: 'Template pesan belum dipilih dengan benar.',
  template_placeholder_missing: 'Setiap template harus memuat {{nama_tamu}} dan {{link_undangan}}.',
  template_placeholder_invalid: 'Ada placeholder yang tidak dikenali di template.',
  title_required: 'Tulis gelar manual terlebih dahulu.',
  titles_not_allowed: 'Gelar hanya berlaku untuk kategori Personal Bergelar.',
  category_invalid: 'Kategori belum dipilih dengan benar.',
  wording_style_invalid: 'Style kata belum dipilih dengan benar.',
  relationship_group_invalid: 'Kelompok tamu belum dipilih dengan benar.',
  status_invalid: 'Status pengiriman belum dipilih dengan benar.',
};

/** What the row shows under the name: the style, or the old category. */
function wordingLabel(guest: Pick<Guest, 'category' | 'wording_style' | 'with_partner'>): string {
  return guest.wording_style && guest.wording_style !== 'default'
    ? STYLE_LABELS[guest.wording_style]
    : categoryLabel(guest.category, guest.with_partner !== false);
}

/** The filter lists categories and styles together; styles carry a prefix. */
function applyWordingFilter(params: URLSearchParams, value: string): void {
  if (value.startsWith('style:')) {
    params.set('wording_style', value.slice('style:'.length));
    return;
  }
  if (!value) return;
  const choice = readCategoryChoice(value);
  params.set('category', choice.category);
  if (!choice.withPartner) params.set('with_partner', '0');
}

function groupLabel(group: RelationshipGroup): string {
  return {
    friend_andrika: 'Teman Andrika',
    friend_aliva: 'Teman Aliva',
    parent_friend_andrika: 'Teman Orang Tua Andrika',
    parent_friend_aliva: 'Teman Orang Tua Aliva',
  }[group];
}

type GuestWording = Pick<Guest, 'name' | 'category' | 'titles'>
  & Partial<Pick<Guest, 'wording_style' | 'second_name' | 'with_partner'>>;

/** Both people's picks as one list, each title knowing whose it is. */
function formTitles(): GuestTitle[] {
  return PEOPLE.flatMap((person) => state.selectedTitles[person].map((title) => ({ ...title, person })));
}

function recipientInput(guest: GuestWording) {
  return {
    name: guest.name,
    category: guest.category,
    withPartner: guest.with_partner !== false,
    titles: guest.titles.map(({ label, placement, person }) => ({ label, placement, person })),
    style: guest.wording_style ?? 'default',
    secondName: guest.second_name ?? '',
  };
}

function renderGuestName(guest: GuestWording): string {
  return displayRecipientName(recipientInput(guest));
}

function renderGuestUrl(guest: GuestWording): string {
  return buildInvitationUrl(baseUrl, recipientInput(guest));
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
  const wording = ($('guest-category-filter') as HTMLSelectElement).value;
  const status = ($('guest-status-filter') as HTMLSelectElement).value;
  return state.guests.filter((guest) => {
    if (state.activeGroup && guest.relationship_group !== state.activeGroup) return false;
    if (wording.startsWith('style:')) {
      if (guest.wording_style !== wording.slice('style:'.length)) return false;
    } else if (wording) {
      const choice = readCategoryChoice(wording);
      if (guest.wording_style !== 'default' || guest.category !== choice.category) return false;
      if (!choice.withPartner && guest.with_partner !== false) return false;
    }
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
    meta.append(escapeText(`${wordingLabel(guest)} · ${TEMPLATE_LABELS[guest.template_key] ?? TEMPLATE_LABELS.friend}`));
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
  const status = ($('guest-status-filter') as HTMLSelectElement).value;
  applyWordingFilter(params, ($('guest-category-filter') as HTMLSelectElement).value);
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
    request<{ settings: { templates: Record<TemplateKey, string>; version: number } }>('/settings'),
  ]);
  state.titles = titlePayload.titles;
  state.templates = settingsPayload.settings.templates;
  state.templateVersion = settingsPayload.settings.version;
  renderTitlePickers();
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

function renderTitlePicker(person: TitlePerson): void {
  const picker = $(`title-picker-${person}`) as HTMLSelectElement;
  picker.replaceChildren(new Option('Pilih gelar', ''));
  for (const placement of ['prefix', 'suffix'] as const) {
    const group = document.createElement('optgroup');
    group.label = PLACEMENT_LABELS[placement];
    for (const title of state.titles.filter((title) => title.placement === placement)) {
      group.append(new Option(title.label, String(title.id)));
    }
    if (group.childElementCount > 0) picker.append(group);
  }
  picker.append(new Option('Lainnya', 'custom'));
}

function renderTitlePickers(): void {
  PEOPLE.forEach(renderTitlePicker);
}

function renderSelectedTitles(person: TitlePerson): void {
  const container = $(`selected-titles-${person}`);
  const titles = state.selectedTitles[person];
  container.replaceChildren();
  titles.forEach((title, index) => {
    const chip = document.createElement('span');
    chip.className = 'gm-title-chip';
    chip.append(escapeText(`${index + 1}. ${title.label}${title.placement === 'suffix' ? ' · belakang' : ''}`));
    const swap = (from: number, to: number) => {
      [titles[from], titles[to]] = [titles[to], titles[from]];
      renderSelectedTitles(person);
      updateGuestPreview();
    };
    if (index > 0) {
      const moveUp = makeButton('↑', '', () => swap(index - 1, index));
      moveUp.setAttribute('aria-label', `Naikkan gelar ${title.label}`);
      chip.append(moveUp);
    }
    if (index < titles.length - 1) {
      const moveDown = makeButton('↓', '', () => swap(index, index + 1));
      moveDown.setAttribute('aria-label', `Turunkan gelar ${title.label}`);
      chip.append(moveDown);
    }
    const remove = makeButton('×', '', () => {
      titles.splice(index, 1);
      renderSelectedTitles(person);
      updateGuestPreview();
    });
    remove.setAttribute('aria-label', `Hapus gelar ${title.label}`);
    chip.append(remove);
    container.append(chip);
  });
}

function renderAllSelectedTitles(): void {
  PEOPLE.forEach(renderSelectedTitles);
}

/** Answering "no" parks the picks; answering "yes" again brings them back. */
function setTitleAnswer(person: TitlePerson, wanted: boolean): void {
  if (wanted) {
    if (state.selectedTitles[person].length === 0 && state.stashedTitles[person].length > 0) {
      state.selectedTitles[person] = state.stashedTitles[person];
      state.stashedTitles[person] = [];
    }
  } else if (state.selectedTitles[person].length > 0) {
    state.stashedTitles[person] = state.selectedTitles[person];
    state.selectedTitles[person] = [];
  }
  renderSelectedTitles(person);
}

function titleAnswer(person: TitlePerson): boolean {
  return (document.querySelector(`input[name="has-title-${person}"]:checked`) as HTMLInputElement | null)?.value === 'ya';
}

function setTitleRadio(person: TitlePerson, wanted: boolean): void {
  const radio = document.querySelector<HTMLInputElement>(
    `input[name="has-title-${person}"][value="${wanted ? 'ya' : 'tidak'}"]`,
  );
  if (radio) radio.checked = true;
}

function formWording(): GuestWording {
  const choice = readCategoryChoice(($('guest-category') as HTMLSelectElement).value);
  return {
    name: ($('guest-name') as HTMLInputElement).value,
    category: choice.category,
    with_partner: choice.withPartner,
    titles: formTitles(),
    wording_style: ($('guest-style') as HTMLSelectElement).value as WordingStyle,
    second_name: ($('guest-second-name') as HTMLInputElement).value,
  };
}

/**
 * The style decides which questions the form asks: how many names, whose
 * they are, and whether the category and titles apply at all.
 */
function syncStyleFields(): void {
  const style = ($('guest-style') as HTMLSelectElement).value as WordingStyle;
  const honorifics = styleHonorifics(style);
  const secondInput = $('guest-second-name') as HTMLInputElement;

  $('category-field').hidden = style !== 'default';
  $('guest-name-label').textContent = honorifics.length ? NAME_FIELD_LABELS[honorifics[0]] : 'Nama yang diundang';
  $('second-name-field').hidden = honorifics.length < 2;
  if (honorifics.length > 1) {
    $('guest-second-name-label').textContent = NAME_FIELD_LABELS[honorifics[1]];
    // Parked when a one-name style took over; handed back on return.
    if (!secondInput.value && state.stashedSecondName) {
      secondInput.value = state.stashedSecondName;
      state.stashedSecondName = '';
    }
  } else if (secondInput.value) {
    state.stashedSecondName = secondInput.value;
    secondInput.value = '';
  }

  syncTitleFields();
}

/**
 * Gelar is asked once per person the invitation names. Under the default
 * template the category already says whether there are any, so the question
 * is only put to a style, which names people rather than a category.
 */
function syncTitleFields(): void {
  const style = ($('guest-style') as HTMLSelectElement).value as WordingStyle;
  const { category } = readCategoryChoice(($('guest-category') as HTMLSelectElement).value);
  const honorifics = styleHonorifics(style);

  for (const person of PEOPLE) {
    const named = style === 'default' ? person === 1 && category === 'titled' : honorifics.length >= person;
    const honorific = honorifics[person - 1];
    const asks = named && style !== 'default';

    $(`title-block-${person}`).hidden = !named;
    $(`title-question-${person}`).hidden = !asks;
    $(`title-controls-${person}`).hidden = !named || (asks && !titleAnswer(person));
    $(`title-picker-label-${person}`).textContent = honorific
      ? `Gelar ${HONORIFIC_WORDS[honorific]}`
      : 'Gelar';
    if (asks) {
      $(`title-question-legend-${person}`).textContent =
        `Apakah ${HONORIFIC_WORDS[honorific]} ini mempunyai gelar?`;
    }

    // Nobody to hang them on any more: park the picks rather than lose them.
    if (!named) setTitleAnswer(person, false);
    else if (!asks) setTitleAnswer(person, true);
  }
}

function updateGuestPreview(): void {
  const guest = formWording();
  $('guest-preview-name').textContent = renderGuestName(guest);
  $('guest-preview-url').textContent = renderGuestUrl(guest);
}

function resetGuestForm(): void {
  guestForm.reset();
  ($('guest-id') as HTMLInputElement).value = '';
  ($('guest-version') as HTMLInputElement).value = '';
  ($('guest-status') as HTMLSelectElement).value = 'pending';
  ($('guest-style') as HTMLSelectElement).value = 'default';
  ($('guest-second-name') as HTMLInputElement).value = '';
  ($('guest-template') as HTMLSelectElement).value = templateForGroup(($('guest-group') as HTMLSelectElement).value);
  state.templatePicked = false;
  state.editing = null;
  state.selectedTitles = { 1: [], 2: [] };
  state.stashedTitles = { 1: [], 2: [] };
  state.stashedSecondName = '';
  for (const person of PEOPLE) {
    setTitleRadio(person, false);
    $(`custom-title-row-${person}`).hidden = true;
    ($(`custom-title-${person}`) as HTMLInputElement).value = '';
  }
  $('guest-dialog-heading').textContent = 'Tambah Tamu';
  setError($('guest-form-error'), '');
  renderAllSelectedTitles();
  syncStyleFields();
  updateGuestPreview();
}

function openGuestDialog(guest: Guest | null = null): void {
  resetGuestForm();
  if (guest) {
    state.editing = guest;
    ($('guest-id') as HTMLInputElement).value = String(guest.id);
    ($('guest-version') as HTMLInputElement).value = String(guest.version);
    ($('guest-name') as HTMLInputElement).value = guest.name;
    ($('guest-style') as HTMLSelectElement).value = guest.wording_style || 'default';
    ($('guest-second-name') as HTMLInputElement).value = guest.second_name || '';
    ($('guest-category') as HTMLSelectElement).value = categoryChoiceOf(guest);
    ($('guest-group') as HTMLSelectElement).value = guest.relationship_group;
    ($('guest-template') as HTMLSelectElement).value = guest.template_key || 'friend';
    ($('guest-status') as HTMLSelectElement).value = guest.status;
    state.templatePicked = true;
    for (const person of PEOPLE) {
      state.selectedTitles[person] = guest.titles.filter((title) => title.person === person);
      setTitleRadio(person, state.selectedTitles[person].length > 0);
    }
    $('guest-dialog-heading').textContent = 'Edit Tamu';
    renderAllSelectedTitles();
    syncStyleFields();
    updateGuestPreview();
  }
  guestDialog.showModal();
  ($('guest-name') as HTMLInputElement).focus();
}

$('add-guest-button').addEventListener('click', () => openGuestDialog());
$('guest-category').addEventListener('change', () => {
  syncTitleFields();
  updateGuestPreview();
});
$('guest-style').addEventListener('change', () => {
  syncStyleFields();
  updateGuestPreview();
});
$('guest-template').addEventListener('change', () => { state.templatePicked = true; });
$('guest-group').addEventListener('change', () => {
  if (state.templatePicked) return;
  ($('guest-template') as HTMLSelectElement).value = templateForGroup(($('guest-group') as HTMLSelectElement).value);
});
$('guest-name').addEventListener('input', updateGuestPreview);
$('guest-second-name').addEventListener('input', updateGuestPreview);
for (const person of PEOPLE) {
  const picker = $(`title-picker-${person}`) as HTMLSelectElement;
  const customRow = $(`custom-title-row-${person}`);
  const customInput = $(`custom-title-${person}`) as HTMLInputElement;

  const openCustomRow = () => {
    customRow.hidden = false;
    customInput.focus();
  };

  document.querySelectorAll<HTMLInputElement>(`input[name="has-title-${person}"]`).forEach((radio) => {
    radio.addEventListener('change', () => {
      setTitleAnswer(person, radio.value === 'ya');
      syncTitleFields();
      updateGuestPreview();
    });
  });

  picker.addEventListener('change', () => {
    if (picker.value === 'custom') {
      picker.value = '';
      openCustomRow();
      return;
    }
    const title = state.titles.find((candidate) => String(candidate.id) === picker.value);
    picker.value = '';
    if (!title) return;
    const chosen = state.selectedTitles[person];
    if (chosen.some((selected) => selected.id === title.id)) return;
    if (chosen.length >= MAX_TITLES) return showToast(`Maksimal ${MAX_TITLES} gelar per orang.`);
    chosen.push(title);
    renderSelectedTitles(person);
    updateGuestPreview();
  });

  $(`add-custom-title-button-${person}`).addEventListener('click', openCustomRow);

  $(`save-custom-title-button-${person}`).addEventListener('click', async () => {
    const label = customInput.value.trim();
    if (!label) return showToast('Tulis gelar manual terlebih dahulu.');
    const placement = ($(`custom-title-placement-${person}`) as HTMLSelectElement).value as TitlePlacement;
    try {
      const payload = await request<{ title: Title }>('/titles', {
        method: 'POST',
        body: JSON.stringify({ label, placement }),
      });
      state.titles = [...state.titles.filter((title) => title.id !== payload.title.id), payload.title];
      renderTitlePickers();
      if (!state.selectedTitles[person].some((title) => title.id === payload.title.id)) {
        state.selectedTitles[person].push(payload.title);
      }
      customInput.value = '';
      customRow.hidden = true;
      renderSelectedTitles(person);
      updateGuestPreview();
    } catch (error) {
      const code = (error as ApiError).code;
      showToast(code && code in SAVE_ERRORS
        ? SAVE_ERRORS[code]
        : error instanceof Error ? error.message : 'Gelar manual tidak dapat disimpan.');
    }
  });
}

guestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorElement = $('guest-form-error');
  setError(errorElement, '');
  const wording = formWording();
  const style = wording.wording_style as WordingStyle;
  if (styleHonorifics(style).length > 1 && !wording.second_name!.trim()) {
    return setError(errorElement, `${$('guest-second-name-label').textContent} belum diisi.`);
  }
  const choice = readCategoryChoice(($('guest-category') as HTMLSelectElement).value);
  const payload = {
    name: wording.name,
    category: choice.category,
    with_partner: choice.withPartner,
    wording_style: style,
    second_name: wording.second_name,
    relationship_group: ($('guest-group') as HTMLSelectElement).value,
    template_key: ($('guest-template') as HTMLSelectElement).value,
    titles: formTitles().map(({ label, placement, person }) => ({ label, placement, person })),
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
    const code = (error as ApiError).code;
    setError(errorElement, code && code in SAVE_ERRORS
      ? SAVE_ERRORS[code]
      : error instanceof Error ? error.message : 'Tamu tidak dapat disimpan.');
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
      with_partner: guest.with_partner,
      wording_style: guest.wording_style,
      second_name: guest.second_name,
      template_key: guest.template_key,
      relationship_group: guest.relationship_group,
      titles: guest.titles.map(({ label, placement, person }) => ({ label, placement, person })),
      status,
    }),
  });
  state.guests = state.guests.map((candidate) => candidate.id === response.guest.id ? response.guest : candidate);
}

async function copyMessage(guest: Guest): Promise<void> {
  const key = guest.template_key || 'friend';
  const template = state.templates[key] ?? '';
  if (!template.trim()) {
    showToast(`Template Untuk ${key === 'parent' ? 'Orang Tua' : 'Teman'} masih kosong.`);
    openTemplateDialog();
    return;
  }
  const message = template
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

function openTemplateDialog(): void {
  for (const key of ['friend', 'parent'] as const) {
    ($(`message-template-${key}`) as HTMLTextAreaElement).value = state.templates[key] ?? '';
  }
  setError($('template-form-error'), '');
  templateDialog.showModal();
  ($('message-template-friend') as HTMLTextAreaElement).focus();
}

$('template-button').addEventListener('click', openTemplateDialog);

templateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorElement = $('template-form-error');
  setError(errorElement, '');
  const templates = {
    friend: ($('message-template-friend') as HTMLTextAreaElement).value,
    parent: ($('message-template-parent') as HTMLTextAreaElement).value,
  };
  const submit = templateForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  submit.disabled = true;
  try {
    const payload = await request<{ settings: { templates: Record<TemplateKey, string>; version: number } }>(
      '/settings/message-template',
      { method: 'PUT', body: JSON.stringify({ templates, version: state.templateVersion }) },
    );
    state.templates = payload.settings.templates;
    state.templateVersion = payload.settings.version;
    templateDialog.close();
    showToast('Template pesan disimpan.');
  } catch (error) {
    const code = (error as ApiError).code;
    setError(errorElement, code && code in SAVE_ERRORS
      ? SAVE_ERRORS[code]
      : error instanceof Error ? error.message : 'Template tidak dapat disimpan.');
  } finally { submit.disabled = false; }
});

document.querySelectorAll<HTMLButtonElement>('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog || '')?.closest('dialog')?.close());
});

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !dashboard.hidden) void loadGuests();
});

void bootstrap();
