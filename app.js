const SAMPLE_CSV = `氏名,会社名,部署,役職,メールアドレス,グループ,メモ,出会った場所,紹介者,見込み業務
山田太郎,株式会社サンプル,開発部,代表取締役,taro.yamada@example.com,交流会,バー開業予定。深夜酒類の相談可能性あり,BNI,佐藤さん,風営法
鈴木花子,鈴木建設株式会社,総務部,部長,hanako.suzuki@example.com,建設業,建設業許可の更新時期が近い,倫理法人会,,建設業許可
田中一郎,田中税理士事務所,,税理士,ichiro.tanaka@example.com,士業,許認可案件が出たら紹介したいとのこと,交流会,,士業連携`;

const OFFICE = {
  name: 'アストラ行政書士事務所',
  sender: '行政書士 伊藤',
  contact: '※電話番号・住所・URLは必要に応じて書き換えてください。',
  optOut: '※今後このようなご案内が不要な場合は、本メールに「配信停止」とご返信ください。',
};

const CATEGORY_LABELS = {
  fuei: '風営法',
  construction: '建設業',
  subsidy: '補助金',
  referral: '連携',
  general: '一般',
};

const CATEGORY_SUBJECTS = {
  fuei: '許認可手続き',
  construction: '建設業許可',
  subsidy: '補助金・許認可',
  referral: '業務連携',
  general: '名刺交換',
};

const state = {
  contacts: [],
  selectedId: null,
  search: '',
  category: 'all',
};

const els = {
  csvFile: document.getElementById('csvFile'),
  loadSampleButton: document.getElementById('loadSampleButton'),
  exportButton: document.getElementById('exportButton'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  totalCount: document.getElementById('totalCount'),
  pendingCount: document.getElementById('pendingCount'),
  draftCount: document.getElementById('draftCount'),
  blockedCount: document.getElementById('blockedCount'),
  contactList: document.getElementById('contactList'),
  emptyState: document.getElementById('emptyState'),
  editorPanel: document.getElementById('editorPanel'),
  selectedCategory: document.getElementById('selectedCategory'),
  selectedName: document.getElementById('selectedName'),
  selectedMeta: document.getElementById('selectedMeta'),
  excludeToggle: document.getElementById('excludeToggle'),
  metAtInput: document.getElementById('metAtInput'),
  referrerInput: document.getElementById('referrerInput'),
  serviceInput: document.getElementById('serviceInput'),
  statusInput: document.getElementById('statusInput'),
  memoInput: document.getElementById('memoInput'),
  subjectInput: document.getElementById('subjectInput'),
  bodyInput: document.getElementById('bodyInput'),
  regenerateButton: document.getElementById('regenerateButton'),
  copyButton: document.getElementById('copyButton'),
  gmailButton: document.getElementById('gmailButton'),
  toast: document.getElementById('toast'),
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') {
      value += char;
    }
  }

  row.push(value);
  rows.push(row);
  return rows.filter((items) => items.some((item) => item.trim() !== ''));
}

function normalizeHeader(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function firstValue(record, aliases) {
  for (const alias of aliases) {
    const key = Object.keys(record).find((header) => normalizeHeader(header) === normalizeHeader(alias));
    if (key && record[key]) return String(record[key]).trim();
  }
  return '';
}

function rowsToContacts(rows) {
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row, index) => {
    const record = {};
    headers.forEach((header, headerIndex) => {
      record[header] = row[headerIndex] || '';
    });

    const contact = {
      id: crypto.randomUUID ? crypto.randomUUID() : `contact-${Date.now()}-${index}`,
      name: firstValue(record, ['氏名', '名前', '姓名', 'Name']),
      company: firstValue(record, ['会社名', '会社', '勤務先', 'Company']),
      department: firstValue(record, ['部署', 'Department']),
      title: firstValue(record, ['役職', '肩書き', 'Title']),
      email: firstValue(record, ['メールアドレス', 'メール', 'Email', 'E-mail', 'Mail']),
      group: firstValue(record, ['グループ', 'Group']),
      memo: firstValue(record, ['メモ', 'Memo', '備考']),
      metAt: firstValue(record, ['出会った場所']),
      referrer: firstValue(record, ['紹介者']),
      serviceNeed: firstValue(record, ['見込み業務']),
      status: firstValue(record, ['送信ステータス']),
      blocked: parseBoolean(firstValue(record, ['配信停止'])),
      subject: '',
      body: '',
    };

    const generated = buildEmail(contact);
    contact.subject = generated.subject;
    contact.body = generated.body;
    return contact;
  }).filter((contact) => contact.name || contact.company || contact.email);
}

function parseBoolean(value) {
  return ['true', '1', 'yes', 'y', '済', 'チェック', '配信停止'].includes(String(value).trim().toLowerCase());
}

function detectCategory(contact) {
  const text = [
    contact.group,
    contact.memo,
    contact.metAt,
    contact.serviceNeed,
  ].join(' ');

  if (/(風営|深夜|酒類|バー|スナック|飲食|店舗|開業)/.test(text)) return 'fuei';
  if (/(建設|建築|工事|解体|電気|管工事|内装)/.test(text)) return 'construction';
  if (/(補助金|助成金|小規模|ものづくり|事業再構築)/.test(text)) return 'subsidy';
  if (/(士業|税理士|社労士|司法書士|紹介|連携|BNI|倫理)/i.test(text)) return 'referral';
  return 'general';
}

function buildEmail(contact) {
  const category = detectCategory(contact);
  const name = contact.name || 'ご担当者';
  const prefix = contact.company ? `${contact.company} ${name}様` : `${name}様`;
  const subject = `【${OFFICE.name}】${prefix}、${CATEGORY_SUBJECTS[category]}の件でご挨拶`;
  const body = [
    buildGreeting(contact),
    '',
    '先日は名刺交換のお時間をいただき、ありがとうございました。',
    buildContextLine(contact),
    '',
    buildServiceParagraph(category),
    '',
    '必要になりましたら、情報整理だけでもお気軽にご相談ください。',
    '突然のご連絡となり恐縮ですが、今後ともどうぞよろしくお願いいたします。',
    '',
    OFFICE.optOut,
    '',
    '------------------------------',
    OFFICE.name,
    OFFICE.sender,
    OFFICE.contact,
    '------------------------------',
  ].join('\n');

  return { subject, body };
}

function buildGreeting(contact) {
  const parts = [];
  if (contact.company) parts.push(contact.company);
  if (contact.department) parts.push(contact.department);
  if (contact.title) parts.push(contact.title);
  parts.push(`${contact.name || 'ご担当者'}様`);
  return parts.join('\n');
}

function buildContextLine(contact) {
  const context = [];
  if (contact.metAt) context.push(`${contact.metAt}で`);
  if (contact.referrer) context.push(`${formatReferrer(contact.referrer)}のご紹介で`);
  if (contact.memo) context.push(`お話しした内容: ${contact.memo}`);
  if (context.length === 0) return 'お話しした内容をもとに、簡単にご挨拶をお送りいたします。';
  return `${context.join('、')}、ご縁をいただきました。`;
}

function formatReferrer(referrer) {
  const name = String(referrer || '').trim();
  if (!name) return '';
  if (/(様|さん|先生)$/.test(name)) return name;
  return `${name}様`;
}

function buildServiceParagraph(category) {
  if (category === 'fuei') return '弊所では、飲食店営業許可、深夜酒類提供飲食店営業開始届、風俗営業許可など、店舗開業まわりの許認可手続きをサポートしています。';
  if (category === 'construction') return '弊所では、建設業許可、更新、決算変更届、各種変更届など、建設業者様の許認可手続きをサポートしています。';
  if (category === 'subsidy') return '弊所では、補助金申請や事業計画の整理、関連する許認可手続きの確認をサポートしています。';
  if (category === 'referral') return '許認可や補助金まわりでお困りの方がいらっしゃいましたら、連携先としてお力になれれば幸いです。';
  return '弊所では、許認可手続きや補助金申請を中心に、事業者様の手続き面をサポートしています。';
}

function render() {
  ensureSelection();
  renderSummary();
  renderList();
  renderEditor();
  saveState();
}

function ensureSelection() {
  const contacts = filteredContacts();
  const selectedIsVisible = contacts.some((contact) => contact.id === state.selectedId);
  if (selectedIsVisible) return;
  state.selectedId = contacts[0] ? contacts[0].id : null;
}

function filteredContacts() {
  const query = state.search.trim().toLowerCase();
  return state.contacts.filter((contact) => {
    const categoryMatches = state.category === 'all' || detectCategory(contact) === state.category;
    const text = [contact.name, contact.company, contact.email, contact.memo, contact.group].join(' ').toLowerCase();
    return categoryMatches && (!query || text.includes(query));
  });
}

function renderSummary() {
  els.totalCount.textContent = String(state.contacts.length);
  els.pendingCount.textContent = String(state.contacts.filter((contact) => !contact.status && !contact.blocked).length);
  els.draftCount.textContent = String(state.contacts.filter((contact) => contact.status === '下書き作成済み').length);
  els.blockedCount.textContent = String(state.contacts.filter((contact) => contact.blocked || contact.status === '対象外').length);
}

function renderList() {
  const contacts = filteredContacts();
  els.contactList.innerHTML = '';

  if (contacts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'contact-item';
    empty.innerHTML = '<span class="contact-name">表示できる名刺がありません</span><span class="contact-company">CSVを読み込むか、検索条件を変えてください。</span>';
    els.contactList.append(empty);
    return;
  }

  contacts.forEach((contact) => {
    const category = detectCategory(contact);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = [
      'contact-item',
      contact.id === state.selectedId ? 'is-active' : '',
      contact.blocked ? 'is-blocked' : '',
    ].filter(Boolean).join(' ');
    button.innerHTML = `
      <span class="contact-topline">
        <span class="contact-name">${escapeHtml(contact.name || '名前なし')}</span>
        <span class="badge">${CATEGORY_LABELS[category]}</span>
      </span>
      <span class="contact-company">${escapeHtml(contact.company || contact.email || '会社名なし')}</span>
      <span class="contact-note">${escapeHtml(contact.memo || contact.group || 'メモなし')}</span>
      <span class="badge-row">
        ${contact.status ? `<span class="badge status">${escapeHtml(contact.status)}</span>` : ''}
        ${contact.blocked ? '<span class="badge blocked">配信停止</span>' : ''}
      </span>
    `;
    button.addEventListener('click', () => {
      state.selectedId = contact.id;
      render();
    });
    els.contactList.append(button);
  });
}

function renderEditor() {
  const contact = selectedContact();
  const hasSelection = Boolean(contact);
  els.emptyState.hidden = hasSelection;
  els.editorPanel.hidden = !hasSelection;
  if (!contact) return;

  const category = detectCategory(contact);
  els.selectedCategory.textContent = CATEGORY_LABELS[category];
  els.selectedName.textContent = contact.name || '名前なし';
  els.selectedMeta.textContent = [contact.company, contact.email].filter(Boolean).join(' / ');
  els.excludeToggle.checked = contact.blocked;
  els.metAtInput.value = contact.metAt;
  els.referrerInput.value = contact.referrer;
  els.serviceInput.value = contact.serviceNeed;
  els.statusInput.value = contact.status;
  els.memoInput.value = contact.memo;
  els.subjectInput.value = contact.subject;
  els.bodyInput.value = contact.body;
}

function selectedContact() {
  return state.contacts.find((contact) => contact.id === state.selectedId) || null;
}

function updateSelected(patch) {
  const contact = selectedContact();
  if (!contact) return;
  Object.assign(contact, patch);
  render();
}

function importCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    showToast('CSVにデータ行がありません。');
    return;
  }

  state.contacts = rowsToContacts(rows);
  state.selectedId = state.contacts[0] ? state.contacts[0].id : null;
  render();
  showToast(`${state.contacts.length}件を読み込みました。`);
}

function exportCsv() {
  if (state.contacts.length === 0) {
    showToast('書き出すデータがありません。');
    return;
  }

  const headers = ['氏名', '会社名', '部署', '役職', 'メールアドレス', 'グループ', 'メモ', '出会った場所', '紹介者', '見込み業務', '送信ステータス', '配信停止', '件名', '本文'];
  const rows = state.contacts.map((contact) => [
    contact.name,
    contact.company,
    contact.department,
    contact.title,
    contact.email,
    contact.group,
    contact.memo,
    contact.metAt,
    contact.referrer,
    contact.serviceNeed,
    contact.status,
    contact.blocked ? 'TRUE' : '',
    contact.subject,
    contact.body,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `mybridge-mail-drafts-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast('CSVを書き出しました。');
}

function csvEscape(value) {
  const text = String(value || '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function openGmailCompose() {
  const contact = selectedContact();
  if (!contact) return;
  if (!contact.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    showToast('メールアドレスを確認してください。');
    return;
  }
  contact.status = '下書き作成済み';
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: contact.email,
    su: contact.subject,
    body: contact.body,
  });
  window.open(`https://mail.google.com/mail/?${params.toString()}`, '_blank', 'noopener');
  render();
}

async function copyEmail() {
  const contact = selectedContact();
  if (!contact) return;
  const text = `件名: ${contact.subject}\n\n${contact.body}`;
  try {
    await navigator.clipboard.writeText(text);
    showToast('文面をコピーしました。');
  } catch (error) {
    els.bodyInput.select();
    showToast('本文欄を選択しました。手動でコピーしてください。');
  }
}

function regenerateSelected() {
  const contact = selectedContact();
  if (!contact) return;
  const generated = buildEmail(contact);
  contact.subject = generated.subject;
  contact.body = generated.body;
  render();
  showToast('文面を再生成しました。');
}

function saveState() {
  localStorage.setItem('mybridge-mail-webapp', JSON.stringify({
    contacts: state.contacts,
    selectedId: state.selectedId,
  }));
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem('mybridge-mail-webapp') || '{}');
    if (Array.isArray(saved.contacts)) {
      state.contacts = saved.contacts;
      state.selectedId = saved.selectedId || (state.contacts[0] && state.contacts[0].id) || null;
    }
  } catch (error) {
    localStorage.removeItem('mybridge-mail-webapp');
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove('is-visible');
  }, 2200);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

els.csvFile.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  importCsv(await file.text());
  event.target.value = '';
});

els.loadSampleButton.addEventListener('click', () => importCsv(SAMPLE_CSV));
els.exportButton.addEventListener('click', exportCsv);
els.searchInput.addEventListener('input', (event) => {
  state.search = event.target.value;
  render();
});
els.categoryFilter.addEventListener('change', (event) => {
  state.category = event.target.value;
  render();
});
els.excludeToggle.addEventListener('change', (event) => updateSelected({ blocked: event.target.checked }));
els.metAtInput.addEventListener('input', (event) => updateSelected({ metAt: event.target.value }));
els.referrerInput.addEventListener('input', (event) => updateSelected({ referrer: event.target.value }));
els.serviceInput.addEventListener('change', (event) => updateSelected({ serviceNeed: event.target.value }));
els.statusInput.addEventListener('change', (event) => updateSelected({ status: event.target.value }));
els.memoInput.addEventListener('input', (event) => updateSelected({ memo: event.target.value }));
els.subjectInput.addEventListener('input', (event) => updateSelected({ subject: event.target.value }));
els.bodyInput.addEventListener('input', (event) => updateSelected({ body: event.target.value }));
els.regenerateButton.addEventListener('click', regenerateSelected);
els.copyButton.addEventListener('click', copyEmail);
els.gmailButton.addEventListener('click', openGmailCompose);

restoreState();
render();
