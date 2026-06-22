const SAMPLE_CSV = `氏名,会社名,部署,役職,メールアドレス,グループ,メモ,出会った場所,紹介者,見込み業務
山田太郎,株式会社サンプル,開発部,代表取締役,taro.yamada@example.com,交流会,バー開業予定。深夜酒類の相談可能性あり,BNI,佐藤さん,風営法
鈴木花子,鈴木建設株式会社,総務部,部長,hanako.suzuki@example.com,建設業,建設業許可の更新時期が近い,倫理法人会,,建設業許可
田中一郎,田中税理士事務所,,税理士,ichiro.tanaka@example.com,士業,許認可案件が出たら紹介したいとのこと,交流会,,士業連携
山田太郎,株式会社サンプル,開発部,代表取締役,taro.yamada@example.com,交流会,重複チェック用の同一メール,BNI,佐藤さん,風営法`;

const DEFAULT_OFFICE = {
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

const TONE_LABELS = {
  polite: '丁寧',
  warm: 'やわらかめ',
  short: '短め',
  referral: '紹介お願い寄り',
};

const FIELD_DEFS = [
  { key: 'name', label: '氏名', required: true, aliases: ['氏名', '名前', '姓名', 'Name', 'name'] },
  { key: 'email', label: 'メールアドレス', required: true, aliases: ['メールアドレス', 'メール', 'Email', 'email', 'E-mail', 'Mail'] },
  { key: 'company', label: '会社名', aliases: ['会社名', '会社', '勤務先', 'Company', 'company'] },
  { key: 'department', label: '部署', aliases: ['部署', 'Department', 'department'] },
  { key: 'title', label: '役職', aliases: ['役職', '肩書き', 'Title', 'title'] },
  { key: 'group', label: 'グループ', aliases: ['グループ', 'Group', 'group'] },
  { key: 'memo', label: 'メモ', aliases: ['メモ', 'Memo', 'memo', '備考'] },
  { key: 'metAt', label: '出会った場所', aliases: ['出会った場所', '会った場所', '交流会'] },
  { key: 'referrer', label: '紹介者', aliases: ['紹介者'] },
  { key: 'category', label: '見込み業務', aliases: ['見込み業務', '業務', '分類'] },
  { key: 'tone', label: '文体', aliases: ['文体', 'トーン'] },
  { key: 'status', label: 'ステータス', aliases: ['送信ステータス', 'ステータス'] },
  { key: 'blocked', label: '配信停止', aliases: ['配信停止', '除外'] },
  { key: 'subject', label: '件名', aliases: ['件名', 'Subject'] },
  { key: 'body', label: '本文', aliases: ['本文', 'Body'] },
];

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-fuei',
    name: '風営法 初回挨拶',
    subject: '【{{office}}】{{company}} {{name}}様、許認可手続きの件でご挨拶',
    body: '{{greeting}}\n\n先日は名刺交換のお時間をいただき、ありがとうございました。\n{{context}}\n\n弊所では、飲食店営業許可、深夜酒類提供飲食店営業開始届、風俗営業許可など、店舗開業まわりの許認可手続きをサポートしています。\n\n必要になりましたら、情報整理だけでもお気軽にご相談ください。\n\n{{optOut}}\n\n{{signature}}',
  },
  {
    id: 'tpl-referral',
    name: '士業連携 紹介お願い',
    subject: '【{{office}}】{{company}} {{name}}様、業務連携の件でご挨拶',
    body: '{{greeting}}\n\n先日はありがとうございました。\n{{context}}\n\n許認可や補助金まわりでお困りの方がいらっしゃいましたら、連携先の一つとして思い出していただけますと幸いです。\n\nまずはご挨拶までとなりますが、今後よい形で連携できましたら幸いです。\n\n{{optOut}}\n\n{{signature}}',
  },
];

const state = {
  contacts: [],
  selectedId: null,
  search: '',
  category: 'all',
  activeView: 'editor',
  pendingRows: null,
  pendingHeaders: [],
  columnMap: {},
  office: { ...DEFAULT_OFFICE },
  templates: [...DEFAULT_TEMPLATES],
};

const els = {
  csvFile: document.getElementById('csvFile'),
  importButton: document.getElementById('importButton'),
  heroImportButton: document.getElementById('heroImportButton'),
  loadSampleButton: document.getElementById('loadSampleButton'),
  heroSampleButton: document.getElementById('heroSampleButton'),
  exportButton: document.getElementById('exportButton'),
  startPanel: document.getElementById('startPanel'),
  workspace: document.getElementById('workspace'),
  mappingPanel: document.getElementById('mappingPanel'),
  mappingMessage: document.getElementById('mappingMessage'),
  mappingFields: document.getElementById('mappingFields'),
  applyMappingButton: document.getElementById('applyMappingButton'),
  cancelMappingButton: document.getElementById('cancelMappingButton'),
  diagnosticsPanel: document.getElementById('diagnosticsPanel'),
  stepImport: document.getElementById('stepImport'),
  stepReview: document.getElementById('stepReview'),
  stepSend: document.getElementById('stepSend'),
  nextActionText: document.getElementById('nextActionText'),
  searchInput: document.getElementById('searchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  contactCountLabel: document.getElementById('contactCountLabel'),
  totalCount: document.getElementById('totalCount'),
  pendingCount: document.getElementById('pendingCount'),
  draftCount: document.getElementById('draftCount'),
  blockedCount: document.getElementById('blockedCount'),
  contactList: document.getElementById('contactList'),
  editorPanel: document.getElementById('editorPanel'),
  targetsPanel: document.getElementById('targetsPanel'),
  previewPanel: document.getElementById('previewPanel'),
  templatesPanel: document.getElementById('templatesPanel'),
  settingsPanel: document.getElementById('settingsPanel'),
  selectedCategory: document.getElementById('selectedCategory'),
  selectedName: document.getElementById('selectedName'),
  selectedMeta: document.getElementById('selectedMeta'),
  riskList: document.getElementById('riskList'),
  excludeToggle: document.getElementById('excludeToggle'),
  emailInput: document.getElementById('emailInput'),
  metAtInput: document.getElementById('metAtInput'),
  referrerInput: document.getElementById('referrerInput'),
  serviceInput: document.getElementById('serviceInput'),
  toneInput: document.getElementById('toneInput'),
  statusInput: document.getElementById('statusInput'),
  memoInput: document.getElementById('memoInput'),
  subjectInput: document.getElementById('subjectInput'),
  bodyInput: document.getElementById('bodyInput'),
  regenerateButton: document.getElementById('regenerateButton'),
  saveTemplateButton: document.getElementById('saveTemplateButton'),
  aiPromptButton: document.getElementById('aiPromptButton'),
  copyButton: document.getElementById('copyButton'),
  gmailButton: document.getElementById('gmailButton'),
  eligibleCount: document.getElementById('eligibleCount'),
  excludedCount: document.getElementById('excludedCount'),
  duplicateCount: document.getElementById('duplicateCount'),
  targetList: document.getElementById('targetList'),
  copyTargetsButton: document.getElementById('copyTargetsButton'),
  previewList: document.getElementById('previewList'),
  copyAllPreviewButton: document.getElementById('copyAllPreviewButton'),
  templateSelect: document.getElementById('templateSelect'),
  templateNameInput: document.getElementById('templateNameInput'),
  templatePreview: document.getElementById('templatePreview'),
  applyTemplateButton: document.getElementById('applyTemplateButton'),
  saveNamedTemplateButton: document.getElementById('saveNamedTemplateButton'),
  deleteTemplateButton: document.getElementById('deleteTemplateButton'),
  officeNameInput: document.getElementById('officeNameInput'),
  senderNameInput: document.getElementById('senderNameInput'),
  senderContactInput: document.getElementById('senderContactInput'),
  optOutInput: document.getElementById('optOutInput'),
  resetSettingsButton: document.getElementById('resetSettingsButton'),
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
    if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') value += char;
  }

  row.push(value);
  rows.push(row);
  return rows.filter((items) => items.some((item) => item.trim() !== ''));
}

function normalizeHeader(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function buildAutoMap(headers) {
  const normalized = headers.map(normalizeHeader);
  const map = {};
  FIELD_DEFS.forEach((field) => {
    const aliases = field.aliases.map(normalizeHeader);
    const index = normalized.findIndex((header) => aliases.includes(header));
    map[field.key] = index >= 0 ? headers[index] : '';
  });
  return map;
}

function importCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    showToast('CSVにデータ行がありません。');
    return;
  }

  const headers = rows[0].map((header) => header.trim());
  const map = buildAutoMap(headers);
  state.pendingRows = rows;
  state.pendingHeaders = headers;
  state.columnMap = map;

  const missing = requiredMissing(map);
  if (missing.length > 0) {
    state.contacts = [];
    state.selectedId = null;
    render();
    showMappingPanel(`必須列が見つかりません: ${missing.join('、')}`);
    return;
  }

  loadRowsWithMap(rows, map);
  showToast(`${state.contacts.length}件を読み込みました。`);
}

function requiredMissing(map) {
  return FIELD_DEFS.filter((field) => field.required && !map[field.key]).map((field) => field.label);
}

function showMappingPanel(message) {
  els.mappingPanel.hidden = false;
  els.mappingMessage.textContent = message;
  renderMappingFields();
}

function renderMappingFields() {
  els.mappingFields.innerHTML = FIELD_DEFS.map((field) => {
    const options = [''].concat(state.pendingHeaders).map((header) => {
      const selected = state.columnMap[field.key] === header ? ' selected' : '';
      const label = header || '使わない';
      return `<option value="${escapeHtml(header)}"${selected}>${escapeHtml(label)}</option>`;
    }).join('');
    const requiredClass = field.required ? ' class="is-required"' : '';
    return `<label${requiredClass}><span>${escapeHtml(field.label)}</span><select data-map-key="${field.key}">${options}</select></label>`;
  }).join('');
}

function applyColumnMap() {
  const selects = Array.from(els.mappingFields.querySelectorAll('select[data-map-key]'));
  selects.forEach((select) => {
    state.columnMap[select.dataset.mapKey] = select.value;
  });
  const missing = requiredMissing(state.columnMap);
  if (missing.length > 0) {
    els.mappingMessage.textContent = `必須列が未設定です: ${missing.join('、')}`;
    showToast('氏名とメールアドレスの列を指定してください。');
    return;
  }
  loadRowsWithMap(state.pendingRows, state.columnMap);
  showToast(`${state.contacts.length}件を読み込みました。`);
}

function loadRowsWithMap(rows, map) {
  state.contacts = rowsToContacts(rows, map);
  state.selectedId = state.contacts[0] ? state.contacts[0].id : null;
  state.search = '';
  state.category = 'all';
  state.activeView = 'editor';
  state.pendingRows = null;
  state.pendingHeaders = [];
  els.mappingPanel.hidden = true;
  els.searchInput.value = '';
  els.categoryFilter.value = 'all';
  render();
}

function rowsToContacts(rows, map) {
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row, index) => {
    const record = {};
    headers.forEach((header, headerIndex) => {
      record[header] = row[headerIndex] || '';
    });

    const contact = {
      id: crypto.randomUUID ? crypto.randomUUID() : `contact-${Date.now()}-${index}`,
      name: valueFromMap(record, map.name),
      company: valueFromMap(record, map.company),
      department: valueFromMap(record, map.department),
      title: valueFromMap(record, map.title),
      email: valueFromMap(record, map.email),
      group: valueFromMap(record, map.group),
      memo: valueFromMap(record, map.memo),
      metAt: valueFromMap(record, map.metAt),
      referrer: valueFromMap(record, map.referrer),
      categoryOverride: categoryFromText(valueFromMap(record, map.category)),
      tone: toneFromText(valueFromMap(record, map.tone)) || 'polite',
      status: valueFromMap(record, map.status),
      blocked: parseBoolean(valueFromMap(record, map.blocked)),
      subject: valueFromMap(record, map.subject),
      body: valueFromMap(record, map.body),
    };
    if (!contact.subject || !contact.body) regenerateEmail(contact);
    return contact;
  }).filter((contact) => contact.name || contact.company || contact.email);
}

function valueFromMap(record, columnName) {
  if (!columnName) return '';
  return String(record[columnName] == null ? '' : record[columnName]).trim();
}

function parseBoolean(value) {
  return ['true', '1', 'yes', 'y', '済', 'チェック', '配信停止'].includes(String(value).trim().toLowerCase());
}

function categoryFromText(value) {
  const text = String(value || '');
  if (!text) return '';
  if (/(風営|深夜|酒類|バー|スナック|飲食|店舗|開業)/.test(text)) return 'fuei';
  if (/(建設|建築|工事|解体|電気|管工事|内装)/.test(text)) return 'construction';
  if (/(補助金|助成金|小規模|ものづくり|事業再構築)/.test(text)) return 'subsidy';
  if (/(士業|税理士|社労士|司法書士|紹介|連携|BNI|倫理)/i.test(text)) return 'referral';
  if (/(一般|挨拶)/.test(text)) return 'general';
  return '';
}

function toneFromText(value) {
  const text = String(value || '');
  if (!text) return '';
  if (/やわらか|柔らか|カジュアル/.test(text)) return 'warm';
  if (/短|簡潔/.test(text)) return 'short';
  if (/紹介/.test(text)) return 'referral';
  if (/丁寧/.test(text)) return 'polite';
  return '';
}

function detectCategory(contact) {
  if (contact.categoryOverride) return contact.categoryOverride;
  return categoryFromText([contact.group, contact.memo, contact.metAt].join(' ')) || 'general';
}

function regenerateEmail(contact) {
  const generated = buildEmail(contact);
  contact.subject = generated.subject;
  contact.body = generated.body;
}

function buildEmail(contact) {
  const category = detectCategory(contact);
  const tone = contact.tone || 'polite';
  const name = contact.name || 'ご担当者';
  const prefix = contact.company ? `${contact.company} ${name}様` : `${name}様`;
  const subject = `【${state.office.name}】${prefix}、${CATEGORY_SUBJECTS[category]}の件でご挨拶`;
  const lines = [
    buildGreeting(contact),
    '',
    buildOpening(tone),
    buildContextLine(contact),
    '',
    buildServiceParagraph(category, tone),
    '',
    buildClosing(tone),
    '',
    state.office.optOut,
    '',
    buildSignature(),
  ];
  return { subject, body: lines.filter((line) => line !== null).join('\n') };
}

function buildGreeting(contact) {
  const parts = [];
  if (contact.company) parts.push(contact.company);
  if (contact.department) parts.push(contact.department);
  if (contact.title) parts.push(contact.title);
  parts.push(`${contact.name || 'ご担当者'}様`);
  return parts.join('\n');
}

function buildOpening(tone) {
  if (tone === 'warm') return '先日はありがとうございました。お話しできてうれしかったです。';
  return '先日は名刺交換のお時間をいただき、ありがとうございました。';
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

function buildServiceParagraph(category, tone) {
  if (tone === 'referral') return '許認可や補助金まわりでお困りの方がいらっしゃいましたら、連携先の一つとして思い出していただけますと幸いです。もちろん、ご本人様のご相談も歓迎です。';
  if (category === 'fuei') return '弊所では、飲食店営業許可、深夜酒類提供飲食店営業開始届、風俗営業許可など、店舗開業まわりの許認可手続きをサポートしています。';
  if (category === 'construction') return '弊所では、建設業許可、更新、決算変更届、各種変更届など、建設業者様の許認可手続きをサポートしています。';
  if (category === 'subsidy') return '弊所では、補助金申請や事業計画の整理、関連する許認可手続きの確認をサポートしています。';
  if (category === 'referral') return '許認可や補助金まわりでお困りの方がいらっしゃいましたら、連携先としてお力になれれば幸いです。';
  return '弊所では、許認可手続きや補助金申請を中心に、事業者様の手続き面をサポートしています。';
}

function buildClosing(tone) {
  if (tone === 'short') return '必要な際はお気軽にご連絡ください。今後ともよろしくお願いいたします。';
  if (tone === 'warm') return '何かお力になれそうなことがあれば、気軽にお声がけください。今後ともよろしくお願いいたします。';
  if (tone === 'referral') return 'まずはご挨拶までとなりますが、今後よい形で連携できましたら幸いです。どうぞよろしくお願いいたします。';
  return '必要になりましたら、情報整理だけでもお気軽にご相談ください。\n突然のご連絡となり恐縮ですが、今後ともどうぞよろしくお願いいたします。';
}

function buildSignature() {
  return ['------------------------------', state.office.name, state.office.sender, state.office.contact, '------------------------------'].join('\n');
}

function render() {
  ensureSelection();
  renderMode();
  renderWorkflow();
  renderDiagnostics();
  renderSummary();
  renderList();
  renderTabs();
  renderEditor();
  renderTargets();
  renderPreviewList();
  renderTemplates();
  renderSettings();
  saveState();
}

function renderMode() {
  const hasContacts = state.contacts.length > 0;
  const mappingActive = state.pendingRows && !els.mappingPanel.hidden;
  els.startPanel.hidden = hasContacts || mappingActive;
  els.workspace.hidden = !hasContacts && !mappingActive;
}

function renderWorkflow() {
  const selected = selectedContact();
  const hasContacts = state.contacts.length > 0;
  const hasDrafted = selected && selected.status === '下書き作成済み';
  setStep(els.stepImport, hasContacts ? 'done' : 'active');
  setStep(els.stepReview, hasContacts ? (hasDrafted ? 'done' : 'active') : '');
  setStep(els.stepSend, hasDrafted ? 'active' : '');

  if (!hasContacts) els.nextActionText.textContent = 'CSVを読み込むか、サンプルで試してください。';
  else if (!selected) els.nextActionText.textContent = '左の一覧から相手を選んでください。';
  else if (!isValidEmail(selected.email)) els.nextActionText.textContent = 'メールアドレスを確認してください。';
  else if (selected.blocked) els.nextActionText.textContent = '配信停止の相手です。送信対象から外れています。';
  else els.nextActionText.textContent = '文面を確認して、問題なければGmailで開いてください。';
}

function setStep(element, status) {
  element.classList.remove('is-active', 'is-done');
  if (status === 'active') element.classList.add('is-active');
  if (status === 'done') element.classList.add('is-done');
}

function computeDiagnostics() {
  const duplicateInfo = computeDuplicateInfo();
  const missingEmail = state.contacts.filter((contact) => !isValidEmail(contact.email)).length;
  const blocked = state.contacts.filter((contact) => contact.blocked || contact.status === '対象外').length;
  const eligible = sendCandidates().length;
  return { duplicateInfo, duplicateCount: duplicateInfo.extras.size, missingEmail, blocked, eligible };
}

function renderDiagnostics() {
  const d = computeDiagnostics();
  const pills = [
    `<span class="diagnostic-pill">送信OK ${d.eligible}件</span>`,
    `<span class="diagnostic-pill ${d.missingEmail ? 'danger' : ''}">メール要確認 ${d.missingEmail}件</span>`,
    `<span class="diagnostic-pill ${d.duplicateCount ? 'warn' : ''}">重複 ${d.duplicateCount}件</span>`,
    `<span class="diagnostic-pill ${d.blocked ? 'warn' : ''}">除外 ${d.blocked}件</span>`,
  ];
  els.diagnosticsPanel.innerHTML = pills.join('');
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
  const pending = state.contacts.filter((contact) => !contact.status && !contact.blocked).length;
  const drafted = state.contacts.filter((contact) => contact.status === '下書き作成済み').length;
  const blocked = state.contacts.filter((contact) => contact.blocked || contact.status === '対象外').length;
  els.totalCount.textContent = String(state.contacts.length);
  els.pendingCount.textContent = String(pending);
  els.draftCount.textContent = String(drafted);
  els.blockedCount.textContent = String(blocked);
  els.contactCountLabel.textContent = `${filteredContacts().length}件`;
}

function renderList() {
  const contacts = filteredContacts();
  const duplicateInfo = computeDuplicateInfo();
  els.contactList.innerHTML = '';
  if (contacts.length === 0) {
    els.contactList.innerHTML = '<div class="contact-item"><span class="contact-name">該当する名刺がありません</span><span class="contact-company">検索や分類を変えてください。</span></div>';
    return;
  }

  contacts.forEach((contact) => {
    const category = detectCategory(contact);
    const invalid = !isValidEmail(contact.email);
    const duplicate = duplicateInfo.extras.has(contact.id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = ['contact-item', contact.id === state.selectedId ? 'is-active' : '', contact.status === '下書き作成済み' ? 'is-draft' : '', contact.blocked ? 'is-blocked' : '', invalid ? 'is-invalid' : ''].filter(Boolean).join(' ');
    button.innerHTML = `
      <span class="contact-topline">
        <span class="contact-name">${escapeHtml(contact.name || '名前なし')}</span>
        <span class="badge">${CATEGORY_LABELS[category]}</span>
      </span>
      <span class="contact-company">${escapeHtml(contact.company || contact.email || '会社名なし')}</span>
      <span class="contact-note">${escapeHtml(contact.memo || contact.group || 'メモなし')}</span>
      <span class="badge-row">${renderContactBadges(contact, invalid, duplicate)}</span>
    `;
    button.addEventListener('click', () => {
      state.selectedId = contact.id;
      state.activeView = 'editor';
      render();
    });
    els.contactList.append(button);
  });
}

function renderContactBadges(contact, invalid, duplicate) {
  const badges = [];
  if (contact.status) badges.push(`<span class="badge ${statusClass(contact.status)}">${escapeHtml(contact.status)}</span>`);
  if (!contact.status && !contact.blocked && !invalid) badges.push('<span class="badge status-pending">未処理</span>');
  if (contact.blocked) badges.push('<span class="badge status-blocked">配信停止</span>');
  if (invalid) badges.push('<span class="badge status-invalid">メール要確認</span>');
  if (duplicate) badges.push('<span class="badge status-pending">重複</span>');
  return badges.join('');
}

function statusClass(status) {
  if (status === '下書き作成済み') return 'status-draft';
  if (status === '送信済み') return 'status-sent';
  if (status === '対象外') return 'status-blocked';
  return 'status-pending';
}

function renderTabs() {
  document.querySelectorAll('.view-tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.view === state.activeView);
  });
  els.editorPanel.hidden = state.activeView !== 'editor';
  els.targetsPanel.hidden = state.activeView !== 'targets';
  els.previewPanel.hidden = state.activeView !== 'preview';
  els.templatesPanel.hidden = state.activeView !== 'templates';
  els.settingsPanel.hidden = state.activeView !== 'settings';
}

function renderEditor() {
  const contact = selectedContact();
  if (!contact) {
    els.editorPanel.hidden = true;
    return;
  }
  const category = detectCategory(contact);
  els.selectedCategory.textContent = CATEGORY_LABELS[category];
  els.selectedName.textContent = contact.name || '名前なし';
  els.selectedMeta.textContent = [contact.company, contact.email].filter(Boolean).join(' / ');
  els.excludeToggle.checked = contact.blocked;
  els.emailInput.value = contact.email;
  els.metAtInput.value = contact.metAt;
  els.referrerInput.value = contact.referrer;
  els.serviceInput.value = contact.categoryOverride;
  els.toneInput.value = contact.tone || 'polite';
  els.statusInput.value = contact.status;
  els.memoInput.value = contact.memo;
  els.subjectInput.value = contact.subject;
  els.bodyInput.value = contact.body;
  els.gmailButton.disabled = !isValidEmail(contact.email) || contact.blocked;
  renderRisks(contact);
}

function renderRisks(contact) {
  const duplicateInfo = computeDuplicateInfo();
  const risks = [];
  if (!isValidEmail(contact.email)) risks.push({ type: 'danger', text: 'メールアドレスを確認してください。' });
  if (contact.blocked) risks.push({ type: 'danger', text: '配信停止の相手です。Gmailで開く操作は止めています。' });
  if (duplicateInfo.extras.has(contact.id)) risks.push({ type: 'warn', text: '同じメールアドレスまたは同じ会社名＋氏名の名刺があります。二重送信に注意してください。' });
  if (contact.status === '下書き作成済み') risks.push({ type: 'info', text: 'この相手は作成済みです。再送前に内容を確認してください。' });
  if (!contact.name) risks.push({ type: 'warn', text: '氏名が空欄です。宛名を確認してください。' });
  if (risks.length === 0) risks.push({ type: 'info', text: `分類は「${CATEGORY_LABELS[detectCategory(contact)]}」、文体は「${TONE_LABELS[contact.tone || 'polite']}」です。` });
  els.riskList.innerHTML = risks.map((risk) => `<div class="risk-item ${risk.type}">${escapeHtml(risk.text)}</div>`).join('');
}

function renderTargets() {
  const duplicateInfo = computeDuplicateInfo();
  const candidates = sendCandidates();
  const excluded = state.contacts.length - candidates.length;
  els.eligibleCount.textContent = String(candidates.length);
  els.excludedCount.textContent = String(excluded);
  els.duplicateCount.textContent = String(duplicateInfo.extras.size);
  els.targetList.innerHTML = state.contacts.map((contact) => {
    const reason = exclusionReason(contact, duplicateInfo);
    return `<div class="table-row">
      <div><strong>${escapeHtml(contact.name || '名前なし')}</strong><span>${escapeHtml(contact.company || '')}</span></div>
      <div><span>${escapeHtml(contact.email || 'メールなし')}</span></div>
      <div>${reason ? `<span class="badge status-invalid">${escapeHtml(reason)}</span>` : '<span class="badge status-draft">送信OK</span>'}</div>
    </div>`;
  }).join('');
}

function renderPreviewList() {
  els.previewList.innerHTML = state.contacts.map((contact) => `<div class="preview-card">
    <strong>${escapeHtml(contact.name || '名前なし')} / ${escapeHtml(contact.company || '')}</strong>
    <span>${escapeHtml(contact.email || 'メールなし')}</span>
    <pre>件名: ${escapeHtml(contact.subject)}\n\n${escapeHtml(contact.body)}</pre>
  </div>`).join('');
}

function renderTemplates() {
  els.templateSelect.innerHTML = state.templates.map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)}</option>`).join('');
  const template = selectedTemplate();
  els.templatePreview.innerHTML = template ? `<div class="preview-card"><strong>${escapeHtml(template.name)}</strong><pre>件名: ${escapeHtml(template.subject)}\n\n${escapeHtml(template.body)}</pre></div>` : '';
}

function renderSettings() {
  els.officeNameInput.value = state.office.name;
  els.senderNameInput.value = state.office.sender;
  els.senderContactInput.value = state.office.contact;
  els.optOutInput.value = state.office.optOut;
}

function selectedTemplate() {
  const id = els.templateSelect.value || (state.templates[0] && state.templates[0].id);
  return state.templates.find((template) => template.id === id) || null;
}

function applyTemplateToSelected() {
  const contact = selectedContact();
  const template = selectedTemplate();
  if (!contact || !template) return;
  contact.subject = renderTemplateText(template.subject, contact);
  contact.body = renderTemplateText(template.body, contact);
  state.activeView = 'editor';
  render();
  showToast('テンプレートを適用しました。');
}

function renderTemplateText(text, contact) {
  const replacements = {
    office: state.office.name,
    name: contact.name || 'ご担当者',
    company: contact.company || '',
    greeting: buildGreeting(contact),
    context: buildContextLine(contact),
    optOut: state.office.optOut,
    signature: buildSignature(),
  };
  return String(text).replace(/\{\{(\w+)\}\}/g, (_, key) => replacements[key] == null ? '' : replacements[key]);
}

function saveCurrentAsTemplate() {
  const contact = selectedContact();
  if (!contact) return;
  const name = els.templateNameInput.value.trim() || `${CATEGORY_LABELS[detectCategory(contact)]} ${TONE_LABELS[contact.tone || 'polite']}`;
  state.templates.push({
    id: `tpl-${Date.now()}`,
    name,
    subject: contact.subject,
    body: contact.body,
    custom: true,
  });
  els.templateNameInput.value = '';
  state.activeView = 'templates';
  render();
  showToast('テンプレートを保存しました。');
}

function deleteSelectedTemplate() {
  const template = selectedTemplate();
  if (!template) return;
  if (!template.custom && template.id.startsWith('tpl-')) {
    showToast('初期テンプレートは削除せず、必要なら上書き用を保存してください。');
    return;
  }
  state.templates = state.templates.filter((item) => item.id !== template.id);
  if (state.templates.length === 0) state.templates = [...DEFAULT_TEMPLATES];
  render();
  showToast('テンプレートを削除しました。');
}

function computeDuplicateInfo() {
  const firstByKey = new Map();
  const extras = new Set();
  state.contacts.forEach((contact) => {
    const keys = [];
    if (contact.email) keys.push(`email:${contact.email.toLowerCase()}`);
    if (contact.name && contact.company) keys.push(`person:${contact.company.toLowerCase()}|${contact.name.toLowerCase()}`);
    keys.forEach((key) => {
      if (firstByKey.has(key)) extras.add(contact.id);
      else firstByKey.set(key, contact.id);
    });
  });
  return { extras };
}

function sendCandidates() {
  const duplicateInfo = computeDuplicateInfo();
  return state.contacts.filter((contact) => !exclusionReason(contact, duplicateInfo));
}

function exclusionReason(contact, duplicateInfo) {
  if (!isValidEmail(contact.email)) return 'メール要確認';
  if (contact.blocked || contact.status === '対象外') return '配信停止';
  if (duplicateInfo.extras.has(contact.id)) return '重複';
  return '';
}

function selectedContact() {
  return state.contacts.find((contact) => contact.id === state.selectedId) || null;
}

function updateSelected(patch, options = {}) {
  const contact = selectedContact();
  if (!contact) return;
  Object.assign(contact, patch);
  if (options.regenerate) regenerateEmail(contact);
  render();
}

function exportCsv() {
  if (state.contacts.length === 0) {
    showToast('書き出すデータがありません。');
    return;
  }
  const headers = ['氏名', '会社名', '部署', '役職', 'メールアドレス', 'グループ', 'メモ', '出会った場所', '紹介者', '見込み業務', '文体', '送信ステータス', '配信停止', '件名', '本文'];
  const rows = state.contacts.map((contact) => [contact.name, contact.company, contact.department, contact.title, contact.email, contact.group, contact.memo, contact.metAt, contact.referrer, CATEGORY_LABELS[detectCategory(contact)], TONE_LABELS[contact.tone || 'polite'], contact.status, contact.blocked ? 'TRUE' : '', contact.subject, contact.body]);
  downloadText([headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n'), `mybridge-mail-drafts-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
  showToast('編集結果をCSVで保存しました。');
}

function csvEscape(value) {
  const text = String(value || '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadText(text, filename, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openGmailCompose() {
  const contact = selectedContact();
  if (!contact) return;
  if (!isValidEmail(contact.email)) {
    showToast('メールアドレスを確認してください。');
    return;
  }
  if (contact.blocked) {
    showToast('配信停止の相手です。');
    return;
  }
  contact.status = '下書き作成済み';
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: contact.email, su: contact.subject, body: contact.body });
  window.open(`https://mail.google.com/mail/?${params.toString()}`, '_blank', 'noopener');
  render();
}

async function copyEmail() {
  const contact = selectedContact();
  if (!contact) return;
  await writeClipboard(`To: ${contact.email}\n件名: ${contact.subject}\n\n${contact.body}`, '文面をコピーしました。');
}

function copyTargets() {
  const headers = ['氏名', '会社名', 'メールアドレス', '件名'];
  const rows = sendCandidates().map((contact) => [contact.name, contact.company, contact.email, contact.subject]);
  writeClipboard([headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n'), '送信対象CSVをコピーしました。');
}

function copyAllPreview() {
  const text = state.contacts.map((contact) => `${contact.name || '名前なし'} / ${contact.company || ''}\nTo: ${contact.email}\n件名: ${contact.subject}\n\n${contact.body}`).join('\n\n====================\n\n');
  writeClipboard(text, '全員分のプレビューをコピーしました。');
}

function copyAiPrompt() {
  const contact = selectedContact();
  if (!contact) return;
  const prompt = `次の名刺交換相手に送る営業メールを、失礼がなく自然な日本語に整えてください。売り込みすぎず、行政書士として信頼感が出る文面にしてください。\n\n相手: ${contact.company} ${contact.name}様\nメール: ${contact.email}\n出会った場所: ${contact.metAt}\n紹介者: ${contact.referrer}\nメモ: ${contact.memo}\n分類: ${CATEGORY_LABELS[detectCategory(contact)]}\n文体: ${TONE_LABELS[contact.tone || 'polite']}\n現在の件名: ${contact.subject}\n現在の本文:\n${contact.body}`;
  writeClipboard(prompt, 'AI用プロンプトをコピーしました。');
}

async function writeClipboard(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch (error) {
    showToast('コピーできませんでした。ブラウザの権限を確認してください。');
  }
}

function regenerateSelected() {
  const contact = selectedContact();
  if (!contact) return;
  regenerateEmail(contact);
  render();
  showToast('文面を再生成しました。');
}

function updateOffice(patch) {
  state.office = { ...state.office, ...patch };
  render();
}

function resetOfficeSettings() {
  state.office = { ...DEFAULT_OFFICE };
  render();
  showToast('事務所情報を初期値に戻しました。');
}

function saveState() {
  localStorage.setItem('mybridge-mail-webapp', JSON.stringify({
    contacts: state.contacts,
    selectedId: state.selectedId,
    office: state.office,
    templates: state.templates,
  }));
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem('mybridge-mail-webapp') || '{}');
    if (Array.isArray(saved.contacts)) {
      state.contacts = saved.contacts.map((contact) => ({ tone: 'polite', categoryOverride: '', ...contact }));
      state.selectedId = saved.selectedId || (state.contacts[0] && state.contacts[0].id) || null;
    }
    if (saved.office) state.office = { ...DEFAULT_OFFICE, ...saved.office };
    if (Array.isArray(saved.templates) && saved.templates.length > 0) state.templates = saved.templates;
  } catch (error) {
    localStorage.removeItem('mybridge-mail-webapp');
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove('is-visible'), 2200);
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function openFilePicker() {
  els.csvFile.click();
}

els.csvFile.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  importCsv(await file.text());
  event.target.value = '';
});

els.importButton.addEventListener('click', openFilePicker);
els.heroImportButton.addEventListener('click', openFilePicker);
els.loadSampleButton.addEventListener('click', () => importCsv(SAMPLE_CSV));
els.heroSampleButton.addEventListener('click', () => importCsv(SAMPLE_CSV));
els.exportButton.addEventListener('click', exportCsv);
els.applyMappingButton.addEventListener('click', applyColumnMap);
els.cancelMappingButton.addEventListener('click', () => {
  state.pendingRows = null;
  els.mappingPanel.hidden = true;
  render();
});
document.querySelectorAll('.view-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    state.activeView = tab.dataset.view;
    render();
  });
});
els.searchInput.addEventListener('input', (event) => {
  state.search = event.target.value;
  render();
});
els.categoryFilter.addEventListener('change', (event) => {
  state.category = event.target.value;
  render();
});
els.excludeToggle.addEventListener('change', (event) => updateSelected({ blocked: event.target.checked }));
els.emailInput.addEventListener('input', (event) => updateSelected({ email: event.target.value }));
els.metAtInput.addEventListener('input', (event) => updateSelected({ metAt: event.target.value }));
els.referrerInput.addEventListener('input', (event) => updateSelected({ referrer: event.target.value }));
els.serviceInput.addEventListener('change', (event) => updateSelected({ categoryOverride: event.target.value }, { regenerate: true }));
els.toneInput.addEventListener('change', (event) => updateSelected({ tone: event.target.value }, { regenerate: true }));
els.statusInput.addEventListener('change', (event) => updateSelected({ status: event.target.value }));
els.memoInput.addEventListener('input', (event) => updateSelected({ memo: event.target.value }));
els.subjectInput.addEventListener('input', (event) => updateSelected({ subject: event.target.value }));
els.bodyInput.addEventListener('input', (event) => updateSelected({ body: event.target.value }));
els.regenerateButton.addEventListener('click', regenerateSelected);
els.saveTemplateButton.addEventListener('click', saveCurrentAsTemplate);
els.saveNamedTemplateButton.addEventListener('click', saveCurrentAsTemplate);
els.deleteTemplateButton.addEventListener('click', deleteSelectedTemplate);
els.applyTemplateButton.addEventListener('click', applyTemplateToSelected);
els.templateSelect.addEventListener('change', renderTemplates);
els.aiPromptButton.addEventListener('click', copyAiPrompt);
els.copyButton.addEventListener('click', copyEmail);
els.gmailButton.addEventListener('click', openGmailCompose);
els.copyTargetsButton.addEventListener('click', copyTargets);
els.copyAllPreviewButton.addEventListener('click', copyAllPreview);
els.officeNameInput.addEventListener('input', (event) => updateOffice({ name: event.target.value }));
els.senderNameInput.addEventListener('input', (event) => updateOffice({ sender: event.target.value }));
els.senderContactInput.addEventListener('input', (event) => updateOffice({ contact: event.target.value }));
els.optOutInput.addEventListener('input', (event) => updateOffice({ optOut: event.target.value }));
els.resetSettingsButton.addEventListener('click', resetOfficeSettings);

restoreState();
render();
