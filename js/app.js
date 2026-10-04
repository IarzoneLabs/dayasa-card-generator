/* ==========================================================================
   Aplikasi Cetak Kartu Massal - PT Dayasa Arta Prima
   Core Engine v3.0 - Clean Rewrite (No Patches, No Duplicates)
   ========================================================================== */

// ─── Global State ──────────────────────────────────────────────────────────
const appState = {
  uploadedData: [],
  headers: [],
  currentPreset: "dayasa_equipment_tag_cr80",
  mappingMode: "auto",
  columnMapping: {},
  activePreviewIndex: 0,
  selectedIndices: new Set(),
  filterSearchQuery: "",
  customLogoDataUrl: null,
  codeType: "QR",
  paperSize: "EVOLIS_CR80",
  showCropMarks: false
};

// ─── SAP Field Aliases (Auto-Mapping) ──────────────────────────────────────
const FIELD_ALIASES = {
  "FunctionLocation": ["functional location", "func. loc.", "functionlocation", "fl", "tag number", "functional_location"],
  "FunctionLocationDesc": ["description of functional location", "fl description", "funcloc desc", "location description", "functional location description"],
  "Equipment": ["equipment", "eq. number", "eq", "asset no", "equipment no", "equipment_number"],
  "Description": ["description of technical object", "equipment description", "description", "eq desc", "tech obj desc", "technical object description"],
  "ObjectType": ["technical obj. type", "equipment category", "object type", "type", "category", "technical_object_type"],
  "Manufacturer": ["manufacturer of asset", "manufacturer", "mfg", "brand", "maker"],
  "ModelNumber": ["manufacturer model number", "model number", "model", "type/model", "model_number"],
  "BadgeText": ["main work center", "plant work center", "work center", "dept", "department"]
};

// ─── App Initialization ─────────────────────────────────────────────────────
function initApp() {
  initDropzone();
  loadSampleData();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// ─── File Upload ────────────────────────────────────────────────────────────
// Called from onchange="handleFileSelect(this)" in HTML (100% reliable)
function handleFileSelect(inputEl) {
  if (inputEl && inputEl.files && inputEl.files.length > 0) {
    handleFileUpload(inputEl.files[0]);
    // Reset so same file can be re-uploaded
    setTimeout(() => { try { inputEl.value = ""; } catch(e) {} }, 200);
  }
}

function initDropzone() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFileUpload(f);
  });
  // Also handle via addEventListener in case onchange attribute is stripped
  fileInput.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      handleFileUpload(f);
      setTimeout(() => { try { e.target.value = ""; } catch(err) {} }, 200);
    }
  });
}

function handleFileUpload(file) {
  if (!file) return;
  const ext = file.name.split(".").pop().toLowerCase();

  const onData = (rawData) => {
    if (!rawData || rawData.length === 0) {
      alertToast("File kosong atau tidak ada data.", "warning");
      return;
    }
    // Remove completely empty rows
    const rows = rawData.filter(row =>
      row && Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== "")
    );
    if (rows.length === 0) {
      alertToast("Tidak ada baris data yang valid di file ini.", "warning");
      return;
    }
    appState.uploadedData = rows;
    appState.headers = Object.keys(rows[0]);
    appState.selectedIndices = new Set(rows.map((_, i) => i));
    appState.activePreviewIndex = 0;
    appState.filterSearchQuery = "";
    autoDetectColumnMapping();
    renderDataTable();
    updateCardPreview();
    alertToast(`✅ ${rows.length} data SAP berhasil dimuat!`, "success");
  };

  if (ext === "csv") {
    if (typeof Papa === "undefined") {
      alertToast("Library PapaParse belum dimuat (cek koneksi internet).", "warning");
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => r.data && r.data.length > 0 ? onData(r.data) : alertToast("File CSV kosong.", "warning"),
      error: (err) => alertToast("Gagal baca CSV: " + err.message, "warning")
    });
  } else if (["xlsx", "xls", "xlsm", "ods"].includes(ext)) {
    if (typeof XLSX === "undefined") {
      alertToast("Library SheetJS belum dimuat (cek koneksi internet).", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        if (!wb || !wb.SheetNames || !wb.SheetNames.length) throw new Error("Tidak ada sheet.");
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        json && json.length > 0 ? onData(json) : alertToast("Sheet Excel kosong.", "warning");
      } catch (err) {
        alertToast("Gagal baca Excel: " + err.message, "warning");
      }
    };
    reader.onerror = () => alertToast("Gagal membaca file.", "warning");
    reader.readAsArrayBuffer(file);
  } else {
    alertToast("Format tidak didukung. Gunakan .xlsx, .xls, atau .csv", "warning");
  }
}

// ─── Sample Data ────────────────────────────────────────────────────────────
function loadSampleData() {
  if (!window.SAMPLE_DATA || window.SAMPLE_DATA.length === 0) return;
  appState.uploadedData = JSON.parse(JSON.stringify(window.SAMPLE_DATA));
  appState.headers = Object.keys(appState.uploadedData[0]);
  appState.selectedIndices = new Set(appState.uploadedData.map((_, i) => i));
  appState.activePreviewIndex = 0;
  appState.filterSearchQuery = "";
  autoDetectColumnMapping();
  renderDataTable();
  updateCardPreview();
  alertToast("Data Contoh SAP PT Dayasa Arta Prima dimuat!", "success");
}

// ─── Column Mapping ─────────────────────────────────────────────────────────
function autoDetectColumnMapping() {
  const preset = window.CARD_PRESETS && window.CARD_PRESETS[appState.currentPreset];
  if (!preset || !appState.headers.length) return;

  const newMapping = {};
  preset.fields.forEach(field => {
    const aliases = FIELD_ALIASES[field.key] || [];
    const defaultSuggest = preset.defaultMapping && preset.defaultMapping[field.key];
    let matched = null;
    if (defaultSuggest && appState.headers.includes(defaultSuggest)) {
      matched = defaultSuggest;
    } else {
      for (const h of appState.headers) {
        const hn = h.toLowerCase().trim();
        if (aliases.some(a => hn.includes(a) || a.includes(hn))) { matched = h; break; }
      }
    }
    newMapping[field.key] = matched || appState.headers[0] || "";
  });
  // QR code source field
  const codeField = preset.codeField || "Equipment";
  newMapping["_codeField"] = appState.headers.includes(codeField) ? codeField : (appState.headers[0] || "");
  appState.columnMapping = newMapping;
}

function setMappingMode(mode) {
  appState.mappingMode = mode;
  document.getElementById("mode-auto-btn")?.classList.toggle("active", mode === "auto");
  document.getElementById("mode-manual-btn")?.classList.toggle("active", mode === "manual");
  const desc = document.getElementById("mapping-mode-desc");
  if (desc) desc.textContent = mode === "auto"
    ? "Kolom dicocokkan otomatis dari header SAP Excel."
    : "Modus Manual: Pilih pemetaan kolom dari dropdown.";
  if (mode === "auto") autoDetectColumnMapping();
  renderMappingUI();
  updateCardPreview();
}

function renderMappingUI() {
  const container = document.getElementById("fields-mapping-container");
  const preset = window.CARD_PRESETS && window.CARD_PRESETS[appState.currentPreset];
  if (!container || !preset) return;
  const isAuto = appState.mappingMode === "auto";
  const makeOpts = (currentVal) => appState.headers.map(h =>
    `<option value="${escapeHtml(h)}"${h === currentVal ? " selected" : ""}>${escapeHtml(h)}</option>`
  ).join("");

  container.innerHTML = [...preset.fields.map(field => `
    <div class="field-map-card">
      <div class="field-map-label">
        <span>Field Kartu: <strong>${escapeHtml(field.label)} (${escapeHtml(field.key)})</strong></span>
        ${field.required ? '<span class="badge-req">Wajib</span>' : ""}
      </div>
      <select class="form-select" onchange="updateSingleFieldMapping('${field.key}', this.value)" ${isAuto ? "disabled" : ""}>
        <option value="">-- Pilih Kolom Data --</option>
        ${makeOpts(appState.columnMapping[field.key] || "")}
      </select>
    </div>`),
    `<div class="field-map-card" style="border-color:var(--primary)">
      <div class="field-map-label"><span style="color:var(--primary)">Data Sumber QR Code</span></div>
      <select class="form-select" onchange="updateSingleFieldMapping('_codeField', this.value)" ${isAuto ? "disabled" : ""}>
        ${makeOpts(appState.columnMapping["_codeField"] || "")}
      </select>
    </div>`
  ].join("");

  if (window.lucide) lucide.createIcons();
}

function updateSingleFieldMapping(fieldKey, newValue) {
  appState.columnMapping[fieldKey] = newValue;
  updateCardPreview();
}

function changePreset(presetId) {
  if (window.CARD_PRESETS && window.CARD_PRESETS[presetId]) {
    appState.currentPreset = presetId;
    autoDetectColumnMapping();
    renderMappingUI();
    updateCardPreview();
  }
}

// ─── Card HTML Builder ──────────────────────────────────────────────────────
function buildCardHTML(record, index, uniqueIdPrefix = "card") {
  const preset = window.CARD_PRESETS && window.CARD_PRESETS[appState.currentPreset];
  const mapping = appState.columnMapping;
  const isCr80 = !preset || preset.widthMm < 90 || appState.paperSize === "EVOLIS_CR80";

  if (!record) return `<div style="padding:1rem;color:red">Tidak ada data</div>`;

  const g = (key) => {
    const h = mapping[key];
    return (h && record[h] !== undefined) ? String(record[h]) : "";
  };

  const flVal    = g("FunctionLocation")     || "DP-01-SP1-APS-RF05";
  const flDesc   = g("FunctionLocationDesc") || "REFINER LF #3";
  const eqVal    = g("Equipment")            || "MRFD00013";
  const eqDesc   = g("Description")          || "REFINER LF3";
  const typeVal  = g("ObjectType")           || "";
  const mfgVal   = g("Manufacturer")         || "";
  const modelVal = g("ModelNumber")          || "";
  const badge    = g("BadgeText")            || (preset && preset.badgeText) || "ME";
  const qrId     = `${uniqueIdPrefix}-qr-${index}`;
  const logoSrc  = appState.customLogoDataUrl || window.DEFAULT_LOGO_IMAGE || "img/dayasa_logo.png";

  return `
    <div class="printable-card ${isCr80 ? "card-cr80" : ""}">
      <div class="card-header-row">
        <div class="card-brand-group">
          <img src="${logoSrc}" class="card-brand-logo-img" alt="DayasaPaper Logo">
        </div>
        <div class="card-header-right">
          <span class="card-header-tagtext">${escapeHtml(badge)}</span>
          <div class="card-header-greenblock"></div>
        </div>
      </div>
      <div class="card-header-line"></div>
      <div class="card-body-row">
        <div class="card-fields-left">
          <div class="card-field-row card-row-top">
            <span class="card-label-col">FL</span>
            <span class="card-val-col">${escapeHtml(flVal)}</span>
          </div>
          ${flDesc ? `<div class="card-subval-row card-subval-top">${escapeHtml(flDesc)}</div>` : ""}
          <div class="card-field-row card-row-bottom">
            <span class="card-label-col">EQ</span>
            <span class="card-val-col">${escapeHtml(eqVal)}</span>
          </div>
          ${eqDesc ? `<div class="card-subval-row card-subval-bottom">${escapeHtml(eqDesc)}</div>` : ""}
          <div class="card-field-row card-row-bottom">
            <span class="card-label-col">Type</span>
            <span class="card-val-col">${escapeHtml(typeVal)}</span>
          </div>
          <div class="card-field-row card-row-bottom">
            <span class="card-label-col">Mfg</span>
            <span class="card-val-col">${escapeHtml(mfgVal)}</span>
          </div>
          <div class="card-field-row card-row-bottom">
            <span class="card-label-col">Model</span>
            <span class="card-val-col">${escapeHtml(modelVal)}</span>
          </div>
        </div>
        <div class="card-qr-bottom-right" id="${qrId}"></div>
      </div>
    </div>`;
}

function generateCodeGraphic(containerId, textValue) {
  setTimeout(() => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = "";
    if (window.QRCode) {
      try {
        new QRCode(el, {
          text: textValue || "DAYASA",
          width: 88, height: 88,
          colorDark: "#1c4da1", colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch(e) {}
    }
  }, 50);
}

// ─── Tab Navigation ─────────────────────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".step-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(tabId)?.classList.add("active");
  document.getElementById(`nav-${tabId}`)?.classList.add("active");

  if (tabId === "tab-mapping") { renderMappingUI(); updateCardPreview(); }
  else if (tabId === "tab-preview") renderBatchPreviewGrid();
  else if (tabId === "tab-print") renderPrintSheet();

  if (window.lucide) lucide.createIcons();
}

// ─── Data Table ─────────────────────────────────────────────────────────────
function getFilteredRecords() {
  const query = (appState.filterSearchQuery || "").toLowerCase().trim();
  return appState.uploadedData.filter((record, idx) => {
    if (!appState.selectedIndices.has(idx)) return false;
    if (query) {
      const rowStr = Object.values(record).join(" ").toLowerCase();
      if (!rowStr.includes(query)) return false;
    }
    return true;
  });
}

function renderDataTable() {
  const headEl  = document.getElementById("data-table-head");
  const bodyEl  = document.getElementById("data-table-body");
  const badge   = document.getElementById("data-count-badge");
  if (!headEl || !bodyEl) return;

  const filtered = getFilteredRecords();
  if (badge) badge.textContent = `${filtered.length} dari ${appState.uploadedData.length} Terpilih`;

  if (!appState.headers.length || !appState.uploadedData.length) {
    bodyEl.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:2rem">Belum ada data.</td></tr>`;
    return;
  }

  const cols = appState.headers.slice(0, 7);
  headEl.innerHTML = `<tr>
    <th style="width:35px"><input type="checkbox" id="select-all-checkbox" ${filtered.length === appState.uploadedData.length ? "checked" : ""} onchange="selectAllTableRows(this.checked)"></th>
    <th style="width:40px">#</th>
    ${cols.map(h => `<th>${escapeHtml(h)}</th>`).join("")}
    <th style="width:70px">Aksi</th>
  </tr>`;

  const query = appState.filterSearchQuery;
  bodyEl.innerHTML = appState.uploadedData.map((row, idx) => {
    if (query && !Object.values(row).join(" ").toLowerCase().includes(query)) return "";
    const checked = appState.selectedIndices.has(idx);
    const cells = cols.map(h =>
      `<td contenteditable="true" onblur="updateTableCell(${idx},'${escapeHtml(h)}',this.innerText)">${escapeHtml(String(row[h] ?? ""))}</td>`
    ).join("");
    return `<tr style="${checked ? "background:rgba(0,166,81,0.08)" : "opacity:0.5"}">
      <td><input type="checkbox" ${checked ? "checked" : ""} onchange="toggleSelectTableRow(${idx},this.checked)"></td>
      <td><strong>${idx + 1}</strong></td>
      ${cells}
      <td><button class="btn btn-outline btn-sm" onclick="deleteTableRow(${idx})" style="color:var(--accent-danger);padding:2px 6px"><i data-lucide="trash"></i></button></td>
    </tr>`;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

function toggleSelectTableRow(idx, checked) {
  checked ? appState.selectedIndices.add(idx) : appState.selectedIndices.delete(idx);
  renderDataTable(); updateCardPreview();
}
function selectAllTableRows(selectAll) {
  appState.selectedIndices = selectAll ? new Set(appState.uploadedData.map((_,i)=>i)) : new Set();
  renderDataTable(); updateCardPreview();
}
function updateTableCell(rowIdx, headerName, newVal) {
  if (appState.uploadedData[rowIdx]) { appState.uploadedData[rowIdx][headerName] = newVal.trim(); updateCardPreview(); }
}
function deleteTableRow(rowIdx) {
  appState.uploadedData.splice(rowIdx, 1);
  appState.selectedIndices = new Set(appState.uploadedData.map((_,i)=>i));
  renderDataTable(); updateCardPreview();
}
function addNewRow() {
  const row = {};
  appState.headers.forEach(h => row[h] = "Data Baru");
  appState.uploadedData.push(row);
  appState.selectedIndices.add(appState.uploadedData.length - 1);
  renderDataTable(); updateCardPreview();
}
function clearData() {
  if (confirm("Hapus semua data?")) {
    appState.uploadedData = []; appState.headers = []; appState.selectedIndices.clear();
    renderDataTable(); updateCardPreview();
  }
}
function filterTable() {
  const el = document.getElementById("table-search");
  if (!el) return;
  appState.filterSearchQuery = el.value.toLowerCase().trim();
  appState.activePreviewIndex = 0;
  renderDataTable(); updateCardPreview();
}

// ─── Bulk Paste Filter ───────────────────────────────────────────────────────
function updatePastePlaceholder() {
  const el = document.getElementById("bulk-paste-input");
  const mode = document.querySelector('input[name="paste-target"]:checked')?.value || "funloc";
  if (!el) return;
  el.placeholder = mode === "funloc"
    ? "Tempelkan daftar Fun Loc di sini:\nDP-01-SP1-APS-RF05\nDAP1-PM1-DRY"
    : mode === "equipment"
    ? "Tempelkan Nomor Equipment di sini:\nMRFD00013\n10023489"
    : "Tempelkan kata kunci bebas (baris baru / koma)";
}

function applyBulkPasteFilter() {
  const el = document.getElementById("bulk-paste-input");
  if (!el) return;
  const raw = el.value.trim();
  if (!raw) { alertToast("Paste daftar Fun Loc / Equipment terlebih dahulu.", "warning"); return; }
  if (!appState.uploadedData.length) { alertToast("Upload file database SAP dulu.", "warning"); return; }

  const mode = document.querySelector('input[name="paste-target"]:checked')?.value || "funloc";
  const list = raw.split(/[\n,\t;]+/).map(s => s.trim()).filter(s => s.length > 0);
  const flH  = appState.columnMapping["FunctionLocation"] || "Functional Location";
  const eqH  = appState.columnMapping["Equipment"] || "Equipment";

  const newSel = new Set();
  appState.uploadedData.forEach((row, idx) => {
    let vals = [];
    if (mode === "funloc") vals = [row[flH], row["Functional Location"]].filter(Boolean).map(v => String(v).toLowerCase());
    else if (mode === "equipment") vals = [row[eqH], row["Equipment"]].filter(Boolean).map(v => String(v).toLowerCase());
    else vals = Object.values(row).map(v => String(v).toLowerCase());

    const match = list.some(p => vals.some(v => v === p.toLowerCase() || v.includes(p.toLowerCase()) || p.toLowerCase().includes(v)));
    if (match) newSel.add(idx);
  });

  appState.selectedIndices = newSel;
  appState.activePreviewIndex = 0;
  renderDataTable(); updateCardPreview();
  alertToast(newSel.size > 0 ? `Ditemukan ${newSel.size} Equipment dari ${list.length} item paste.` : `Tidak ada yang cocok dari ${list.length} item.`, newSel.size > 0 ? "success" : "warning");
}

function clearPasteInput() {
  const el = document.getElementById("bulk-paste-input");
  if (el) el.value = "";
  appState.selectedIndices = new Set(appState.uploadedData.map((_,i) => i));
  appState.activePreviewIndex = 0;
  renderDataTable(); updateCardPreview();
  alertToast("Filter paste dibersihkan.", "info");
}

// ─── Card Preview ────────────────────────────────────────────────────────────
function updateCardPreview() {
  const wrapper = document.querySelector(".card-canvas-wrapper");
  const indexSpan = document.getElementById("preview-record-index");
  if (!wrapper) return;

  const filtered = getFilteredRecords();
  if (!filtered.length) {
    wrapper.innerHTML = `<div class="printable-card card-cr80" id="main-preview-card"><div style="padding:2rem;text-align:center;color:#94a3b8">Tidak ada data.</div></div>`;
    if (indexSpan) indexSpan.textContent = "Record 0 / 0";
    return;
  }
  if (appState.activePreviewIndex >= filtered.length) appState.activePreviewIndex = 0;
  const record = filtered[appState.activePreviewIndex];
  if (indexSpan) indexSpan.textContent = `Record ${appState.activePreviewIndex + 1} / ${filtered.length}`;

  wrapper.innerHTML = buildCardHTML(record, 0, "preview");
  const qrH = appState.columnMapping["_codeField"] || appState.columnMapping["Equipment"];
  const qrVal = (qrH && record[qrH]) ? String(record[qrH]) : "MRFD00013";
  generateCodeGraphic("preview-qr-0", qrVal);
}

function prevPreviewRecord() {
  if (appState.activePreviewIndex > 0) { appState.activePreviewIndex--; updateCardPreview(); }
}
function nextPreviewRecord() {
  const f = getFilteredRecords();
  if (appState.activePreviewIndex < f.length - 1) { appState.activePreviewIndex++; updateCardPreview(); }
}

// ─── Batch Preview Grid ──────────────────────────────────────────────────────
function renderBatchPreviewGrid() {
  const container = document.getElementById("batch-preview-grid");
  const badge = document.getElementById("batch-count-badge");
  if (!container) return;
  const filtered = getFilteredRecords();
  if (badge) badge.textContent = `${filtered.length} Kartu Terpilih`;
  if (!filtered.length) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted)">Belum ada data terpilih.</div>`;
    return;
  }
  container.innerHTML = filtered.map((record, idx) => {
    const origIdx = appState.uploadedData.indexOf(record);
    return `<div class="batch-card-item">
      <div class="batch-card-header">
        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer">
          <input type="checkbox" checked onchange="toggleSelectBatchCard(${origIdx},this.checked)">
          <span><strong>#${idx+1}</strong> - ${escapeHtml(String(record[appState.headers[0]] || ""))}</span>
        </label>
      </div>
      ${buildCardHTML(record, idx, "batch")}
    </div>`;
  }).join("");

  filtered.forEach((record, idx) => {
    const qrH = appState.columnMapping["_codeField"] || appState.columnMapping["Equipment"];
    generateCodeGraphic(`batch-qr-${idx}`, (qrH && record[qrH]) ? String(record[qrH]) : "SAMPLE");
  });
}

function toggleSelectBatchCard(idx, checked) {
  checked ? appState.selectedIndices.add(idx) : appState.selectedIndices.delete(idx);
  renderBatchPreviewGrid(); updateCardPreview();
}
function selectAllBatchCards(selectAll) {
  appState.selectedIndices = selectAll ? new Set(appState.uploadedData.map((_,i)=>i)) : new Set();
  renderBatchPreviewGrid(); updateCardPreview();
}

// ─── Print Sheet ─────────────────────────────────────────────────────────────
function renderPrintSheet() {
  const sheetEl  = document.getElementById("sheet-preview");
  const sheetInfo = document.getElementById("sheet-info");
  const paperSel  = document.getElementById("paper-size-select")?.value || "EVOLIS_CR80";
  const cropSel   = document.getElementById("crop-marks-select")?.value === "true";
  appState.paperSize = paperSel;
  if (!sheetEl) return;

  const filtered = getFilteredRecords();
  if (!filtered.length) {
    sheetEl.innerHTML = `<div style="text-align:center;padding:3rem;color:#64748b">Pilih atau paste Fun Loc / Equipment untuk mencetak.</div>`;
    return;
  }

  if (paperSel === "EVOLIS_CR80") {
    sheetEl.className = "sheet-evolis-container";
    sheetEl.innerHTML = filtered.map((r, i) => `<div class="sheet-evolis-card">${buildCardHTML(r, i, "print")}</div>`).join("");
    if (sheetInfo) sheetInfo.textContent = `Evolis CR80: ${filtered.length} Kartu`;
  } else {
    sheetEl.className = "sheet-a4" + (cropSel ? " show-crop-marks" : "");
    sheetEl.innerHTML = filtered.map((r, i) => buildCardHTML(r, i, "print")).join("");
    const perPage = paperSel === "A4_PORTRAIT" ? 10 : 8;
    if (sheetInfo) sheetInfo.textContent = `A4: ${filtered.length} Kartu (${Math.ceil(filtered.length / perPage)} Halaman)`;
  }

  filtered.forEach((record, idx) => {
    const qrH = appState.columnMapping["_codeField"] || appState.columnMapping["Equipment"];
    generateCodeGraphic(`print-qr-${idx}`, (qrH && record[qrH]) ? String(record[qrH]) : "SAMPLE");
  });
}

// ─── Print / Export ──────────────────────────────────────────────────────────
function executePrint() {
  renderPrintSheet();
  const paperSel = document.getElementById("paper-size-select")?.value || "EVOLIS_CR80";
  let styleEl = document.getElementById("dynamic-print-page-style");
  if (!styleEl) { styleEl = document.createElement("style"); styleEl.id = "dynamic-print-page-style"; document.head.appendChild(styleEl); }
  styleEl.innerHTML = paperSel === "EVOLIS_CR80"
    ? `@media print { @page { size: 85.6mm 54.0mm landscape !important; margin: 0mm !important; } }`
    : paperSel === "A4_PORTRAIT"
    ? `@media print { @page { size: A4 portrait !important; margin: 0mm !important; } }`
    : `@media print { @page { size: A4 landscape !important; margin: 0mm !important; } }`;
  setTimeout(() => window.print(), 300);
}

// Ultra-Fast In-Memory QR Data URL
function _makeQrDataUrl(text) {
  return new Promise(resolve => {
    const div = document.createElement("div");
    div.style.cssText = "position:absolute;left:-9999px;top:-9999px";
    document.body.appendChild(div);
    try {
      new QRCode(div, { text: text || "DAYASA", width: 260, height: 260, colorDark: "#1c4da1", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
      setTimeout(() => {
        const c = div.querySelector("canvas");
        const img = div.querySelector("img");
        const url = c ? c.toDataURL("image/png") : (img && img.src ? img.src : "");
        div.remove(); resolve(url);
      }, 10);
    } catch(e) { div.remove(); resolve(""); }
  });
}

// 100% Pixel-Perfect HTML Card Renderer (Matches Web UI Preview Exactly)
async function _renderCardHTMLToCanvas(record, index) {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:85.6mm;height:54mm;background:#fff;z-index:-9999;";
  wrapper.innerHTML = buildCardHTML(record, index, "pdf-temp");
  document.body.appendChild(wrapper);

  const qrH = appState.columnMapping["_codeField"] || appState.columnMapping["Equipment"];
  const qrVal = (qrH && record[qrH]) ? String(record[qrH]) : "SAMPLE";

  const qrEl = wrapper.querySelector(`#pdf-temp-qr-${index}`);
  if (qrEl && window.QRCode) {
    try {
      new QRCode(qrEl, { text: qrVal, width: 88, height: 88, colorDark: "#1c4da1", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    } catch(e) {}
  }

  // Allow QR Code canvas/image to draw
  await new Promise(r => setTimeout(r, 40));

  const cardEl = wrapper.querySelector(".printable-card");
  const h2c = window.html2canvas;

  let canvas;
  if (typeof h2c === "function") {
    canvas = await h2c(cardEl, { scale: 3, useCORS: true, allowTaint: true, logging: false });
  } else {
    canvas = await _renderCardNative(record);
  }

  wrapper.remove();
  return canvas;
}

function _showProgress(msg) {
  let t = document.getElementById("pdf-progress-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "pdf-progress-toast";
    Object.assign(t.style, { position:"fixed", bottom:"20px", right:"20px", background:"linear-gradient(135deg,#00a651,#059669)", color:"#fff", padding:"0.9rem 1.6rem", borderRadius:"10px", boxShadow:"0 8px 24px rgba(0,0,0,0.4)", fontSize:"0.95rem", fontWeight:"700", zIndex:"99999", maxWidth:"340px" });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  return t;
}
function _removeProgress() { document.getElementById("pdf-progress-toast")?.remove(); }

async function exportPdf() {
  const filtered = getFilteredRecords();
  if (!filtered.length) { alertToast("Tidak ada kartu untuk diekspor.", "warning"); return; }

  const paperSel = document.getElementById("paper-size-select")?.value || "EVOLIS_CR80";
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) { alertToast("Library jsPDF belum dimuat (cek koneksi internet).", "warning"); return; }

  const toast = _showProgress(`Memulai PDF... (0 dari ${filtered.length} kartu)`);

  try {
    if (paperSel === "EVOLIS_CR80") {
      const pdf = new jsPDF({ orientation:"landscape", unit:"mm", format:[85.6, 54], compress:true });
      const total = filtered.length;

      for (let i = 0; i < total; i++) {
        toast.textContent = `Membuat PDF CR80: ${i+1} dari ${total} (${Math.round(((i+1)/total)*100)}%)`;
        await new Promise(r => setTimeout(r, 15));
        const c = await _renderCardHTMLToCanvas(filtered[i], i);
        const imgData = c.toDataURL("image/jpeg", 0.95);
        if (i > 0) pdf.addPage([85.6, 54], "landscape");
        pdf.addImage(imgData, "JPEG", 0, 0, 85.6, 54, undefined, "FAST");
      }

      _removeProgress();
      pdf.save(`Kartu_Equipment_Tag_DayasaPaper_CR80_${total}Kartu.pdf`);
      alertToast(`✅ ${total} kartu CR80 presisi HD berhasil diunduh!`, "success");
    } else {
      toast.textContent = "Mengekspor PDF A4...";
      const sheetEl = document.getElementById("sheet-preview");
      if (!sheetEl) throw new Error("Elemen sheet tidak ditemukan.");
      const h2c = window.html2canvas;
      if (!h2c) throw new Error("html2canvas tidak tersedia.");
      const cv = await h2c(sheetEl, { scale:2, useCORS:true, allowTaint:true, logging:false });
      const pdf = new jsPDF("portrait", "mm", "a4", true);
      pdf.addImage(cv.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save("Kartu_Equipment_Tag_DayasaPaper_A4.pdf");
      _removeProgress();
      alertToast("PDF A4 berhasil diunduh!", "success");
    }
  } catch (err) {
    _removeProgress();
    console.error("PDF Error:", err);
    alertToast("Gagal ekspor PDF: " + err.message, "warning");
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────
function downloadSampleCsv() {
  if (!window.SAMPLE_DATA || typeof Papa === "undefined") return;
  const csv = Papa.unparse(window.SAMPLE_DATA);
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8;"})), download: "Format_Sample_SAP_DayasaPaper.csv" });
  a.click();
}

function handleLogoUpload(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => { appState.customLogoDataUrl = e.target.result; updateCardPreview(); alertToast("Logo berhasil diunggah!", "success"); };
    reader.readAsDataURL(input.files[0]);
  }
}
function resetDefaultLogo() { appState.customLogoDataUrl = null; updateCardPreview(); alertToast("Logo direset ke default.", "info"); }

function alertToast(msg, type = "info") {
  const colors = { success:"#00a651", warning:"#d97706", info:"#3b82f6" };
  const t = document.createElement("div");
  Object.assign(t.style, { position:"fixed", bottom:"20px", right:"20px", background:colors[type]||colors.info, color:"#fff", padding:"0.75rem 1.25rem", borderRadius:"8px", boxShadow:"0 4px 14px rgba(0,0,0,0.3)", fontSize:"0.875rem", fontWeight:"600", zIndex:"9999", maxWidth:"360px" });
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
