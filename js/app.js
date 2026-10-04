/* ==========================================================================
   Aplikasi Cetak Kartu Massal - PT Dayasa Arta Prima
   Core Engine with Evolis Zenius Thermal Printer & ISO CR80 Support
   ========================================================================== */

// Application Global State
const appState = {
  uploadedData: [],
  headers: [],
  currentPreset: "dayasa_equipment_tag_cr80",
  mappingMode: "auto", // "auto" or "manual"
  columnMapping: {},
  activePreviewIndex: 0,
  selectedIndices: new Set(),
  filterSearchQuery: "",
  customLogoDataUrl: null,
  codeType: "QR",
  accentColor: "#00a651",
  paperSize: "EVOLIS_CR80",
  showCropMarks: false
};

// Map of common SAP / Excel field aliases for Auto-Mapping
const FIELD_ALIASES = {
  "FunctionLocation": [
    "functional location", "func. loc.", "functionlocation", "fl", "tag number", "functional_location"
  ],
  "FunctionLocationDesc": [
    "description of functional location", "fl description", "funcloc desc", "location description", "functional location description"
  ],
  "Equipment": [
    "equipment", "eq. number", "eq", "asset no", "equipment no", "equipment_number"
  ],
  "Description": [
    "description of technical object", "equipment description", "description", "eq desc", "tech obj desc", "technical object description"
  ],
  "ObjectType": [
    "technical obj. type", "equipment category", "object type", "type", "category", "technical_object_type"
  ],
  "Manufacturer": [
    "manufacturer of asset", "manufacturer", "mfg", "brand", "maker"
  ],
  "ModelNumber": [
    "manufacturer model number", "model number", "model", "type/model", "model_number"
  ],
  "BadgeText": [
    "main work center", "plant work center", "work center", "dept", "department"
  ]
};

// Initialize Application on Page Load
document.addEventListener("DOMContentLoaded", () => {
  initDropzone();
  loadSampleData(); // Load sample SAP data
});

// Helper: Get strictly filtered & selected records array across ALL tabs
function getFilteredRecords() {
  const query = appState.filterSearchQuery ? appState.filterSearchQuery.toLowerCase().trim() : "";
  
  return appState.uploadedData.filter((record, idx) => {
    if (!appState.selectedIndices.has(idx)) return false;

    if (query) {
      const rowString = Object.values(record).join(" ").toLowerCase();
      if (!rowString.includes(query)) return false;
    }

    return true;
  });
}

// Switch Tab Navigation
function switchTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));
  document.querySelectorAll(".step-btn").forEach(btn => btn.classList.remove("active"));

  const targetPane = document.getElementById(tabId);
  const targetNav = document.getElementById(`nav-${tabId}`);

  if (targetPane) targetPane.classList.add("active");
  if (targetNav) targetNav.classList.add("active");

  if (tabId === "tab-mapping") {
    renderMappingUI();
    updateCardPreview();
  } else if (tabId === "tab-preview") {
    renderBatchPreviewGrid();
  } else if (tabId === "tab-print") {
    renderPrintSheet();
  }

  if (window.lucide) lucide.createIcons();
}

// Load Sample Data
function loadSampleData() {
  if (window.SAMPLE_DATA && window.SAMPLE_DATA.length > 0) {
    appState.uploadedData = JSON.parse(JSON.stringify(window.SAMPLE_DATA));
    appState.headers = Object.keys(appState.uploadedData[0]);
    appState.selectedIndices = new Set(appState.uploadedData.map((_, i) => i));
    appState.activePreviewIndex = 0;
    appState.filterSearchQuery = "";

    autoDetectColumnMapping();
    renderDataTable();
    updateCardPreview();
    alertToast("Data Contoh SAP PT Dayasa Arta Prima berhasil dimuat!", "success");
  }
}

// Custom Logo Upload Handler
function handleLogoUpload(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      appState.customLogoDataUrl = e.target.result;
      updateCardPreview();
      alertToast("Gambar logo berhasil diunggah!", "success");
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function resetDefaultLogo() {
  appState.customLogoDataUrl = null;
  updateCardPreview();
  alertToast("Logo direset ke gambar logo default DayasaPaper.", "info");
}

// Update Textarea Placeholder based on Paste Target Switch
function updatePastePlaceholder() {
  const pasteInput = document.getElementById("bulk-paste-input");
  const targetVal = document.querySelector('input[name="paste-target"]:checked')?.value || "funloc";

  if (!pasteInput) return;

  if (targetVal === "funloc") {
    pasteInput.placeholder = "Tempelkan daftar Functional Location (Fun Loc) di sini:\nDP-01-SP1-APS-RF05\nDAP1-PM1-DRY-DRY01\nDAP1-PM1-STK-PMP02";
  } else if (targetVal === "equipment") {
    pasteInput.placeholder = "Tempelkan daftar Nomor Equipment di sini:\nMRFD00013\n10023489\n10023490";
  } else {
    pasteInput.placeholder = "Tempelkan kata kunci / kode bebas di sini (dipisahkan baris baru / koma)";
  }
}

// Bulk Paste Filter
function applyBulkPasteFilter() {
  const pasteInput = document.getElementById("bulk-paste-input");
  const targetMode = document.querySelector('input[name="paste-target"]:checked')?.value || "funloc";

  if (!pasteInput) return;

  const rawText = pasteInput.value.trim();
  if (!rawText) {
    alertToast("Silakan tempel (paste) daftar Fun Loc atau Equipment terlebih dahulu.", "warning");
    return;
  }

  const pastedList = rawText
    .split(/[\n,\t;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (pastedList.length === 0) return;

  if (appState.uploadedData.length === 0) {
    alertToast("Silakan unggah file database SAP atau klik 'Data Contoh SAP' terlebih dahulu.", "warning");
    return;
  }

  const newSelectedIndices = new Set();
  let matchedCount = 0;

  const flHeader = appState.columnMapping["FunctionLocation"] || "Functional Location";
  const eqHeader = appState.columnMapping["Equipment"] || "Equipment";

  appState.uploadedData.forEach((row, idx) => {
    let checkValues = [];

    if (targetMode === "funloc") {
      checkValues = [row[flHeader], row["Functional Location"], row["Description of functional location"]].filter(Boolean).map(v => String(v).toLowerCase().trim());
    } else if (targetMode === "equipment") {
      checkValues = [row[eqHeader], row["Equipment"]].filter(Boolean).map(v => String(v).toLowerCase().trim());
    } else {
      checkValues = Object.values(row).map(v => String(v).toLowerCase().trim());
    }

    const isMatch = pastedList.some(pastedItem => {
      const p = pastedItem.toLowerCase().trim();
      return checkValues.some(cv => cv === p || cv.includes(p) || p.includes(cv));
    });

    if (isMatch) {
      newSelectedIndices.add(idx);
      matchedCount++;
    }
  });

  appState.selectedIndices = newSelectedIndices;
  appState.activePreviewIndex = 0;
  renderDataTable();
  updateCardPreview();

  const labelText = targetMode === "funloc" ? "Fun Loc" : targetMode === "equipment" ? "Equipment" : "item";
  if (matchedCount > 0) {
    alertToast(`Berhasil menemukan ${matchedCount} Equipment dari ${pastedList.length} ${labelText} hasil paste!`, "success");
  } else {
    alertToast(`Tidak ditemukan Equipment yang cocok dengan ${pastedList.length} ${labelText} yang dipaste.`, "warning");
  }
}

function clearPasteInput() {
  const pasteInput = document.getElementById("bulk-paste-input");
  if (pasteInput) pasteInput.value = "";
  appState.selectedIndices = new Set(appState.uploadedData.map((_, i) => i));
  appState.activePreviewIndex = 0;
  renderDataTable();
  updateCardPreview();
  alertToast("Filter paste dibersihkan. Menampilkan semua data.", "info");
}

// Real-time Partial Text Search Filter
function filterTable() {
  const searchInput = document.getElementById("table-search");
  if (!searchInput) return;

  appState.filterSearchQuery = searchInput.value.toLowerCase().trim();
  appState.activePreviewIndex = 0;
  renderDataTable();
  updateCardPreview();
}

// Auto-Detect Column Mapping Algorithm
function autoDetectColumnMapping() {
  const preset = window.CARD_PRESETS[appState.currentPreset];
  const newMapping = {};

  if (!preset || !appState.headers || appState.headers.length === 0) return;

  preset.fields.forEach(field => {
    const fieldKey = field.key;
    const aliases = FIELD_ALIASES[fieldKey] || [];
    
    let defaultSuggest = preset.defaultMapping ? preset.defaultMapping[fieldKey] : null;
    let matchedHeader = null;

    if (defaultSuggest && appState.headers.includes(defaultSuggest)) {
      matchedHeader = defaultSuggest;
    } else {
      for (let header of appState.headers) {
        const normalizedHeader = header.toLowerCase().trim();
        if (aliases.some(alias => normalizedHeader.includes(alias) || alias.includes(normalizedHeader))) {
          matchedHeader = header;
          break;
        }
      }
    }

    newMapping[fieldKey] = matchedHeader || appState.headers[0] || "";
  });

  let codeSuggest = preset.codeField || "Equipment";
  if (appState.headers.includes(codeSuggest)) {
    newMapping["_codeField"] = codeSuggest;
  } else {
    newMapping["_codeField"] = appState.headers[0] || "";
  }

  appState.columnMapping = newMapping;
}

// Set Mapping Mode (Auto vs Manual)
function setMappingMode(mode) {
  appState.mappingMode = mode;
  
  const autoBtn = document.getElementById("mode-auto-btn");
  const manualBtn = document.getElementById("mode-manual-btn");
  const descEl = document.getElementById("mapping-mode-desc");

  if (mode === "auto") {
    autoBtn.classList.add("active");
    manualBtn.classList.remove("active");
    descEl.textContent = "Kolom dicocokkan secara otomatis berdasarkan kecocokan nama header SAP Excel.";
    autoDetectColumnMapping();
  } else {
    autoBtn.classList.remove("active");
    manualBtn.classList.add("active");
    descEl.textContent = "Modus Manual: Anda dapat memilih pemetaan kolom header secara bebas dari dropdown.";
  }

  renderMappingUI();
  updateCardPreview();
}

// Render Mapping UI Select Inputs
function renderMappingUI() {
  const container = document.getElementById("fields-mapping-container");
  const preset = window.CARD_PRESETS[appState.currentPreset];

  if (!container || !preset) return;

  container.innerHTML = "";

  preset.fields.forEach(field => {
    const cardEl = document.createElement("div");
    cardEl.className = "field-map-card";

    const currentVal = appState.columnMapping[field.key] || "";

    const optionsHTML = appState.headers.map(header => {
      const selected = header === currentVal ? "selected" : "";
      return `<option value="${escapeHtml(header)}" ${selected}>${escapeHtml(header)}</option>`;
    }).join("");

    cardEl.innerHTML = `
      <div class="field-map-label">
        <span>Field Kartu: <strong>${escapeHtml(field.label)} (${escapeHtml(field.key)})</strong></span>
        ${field.required ? '<span class="badge-req">Wajib</span>' : ''}
      </div>
      <select class="form-select" onchange="updateSingleFieldMapping('${field.key}', this.value)" ${appState.mappingMode === 'auto' ? 'disabled' : ''}>
        <option value="">-- Pilih Kolom Data --</option>
        ${optionsHTML}
      </select>
    `;

    container.appendChild(cardEl);
  });

  const qrCard = document.createElement("div");
  qrCard.className = "field-map-card";
  qrCard.style.borderColor = "var(--primary)";
  const currentQrVal = appState.columnMapping["_codeField"] || "";

  const qrOptionsHTML = appState.headers.map(header => {
    const selected = header === currentQrVal ? "selected" : "";
    return `<option value="${escapeHtml(header)}" ${selected}>${escapeHtml(header)}</option>`;
  }).join("");

  qrCard.innerHTML = `
    <div class="field-map-label">
      <span style="color: var(--primary);"><i data-lucide="qr-code"></i> Data Sumber QR Code</span>
    </div>
    <select class="form-select" onchange="updateSingleFieldMapping('_codeField', this.value)" ${appState.mappingMode === 'auto' ? 'disabled' : ''}>
      ${qrOptionsHTML}
    </select>
  `;
  container.appendChild(qrCard);

  if (window.lucide) lucide.createIcons();
}

function updateSingleFieldMapping(fieldKey, newValue) {
  appState.columnMapping[fieldKey] = newValue;
  updateCardPreview();
}

function changePreset(presetId) {
  if (window.CARD_PRESETS[presetId]) {
    appState.currentPreset = presetId;
    autoDetectColumnMapping();
    renderMappingUI();
    updateCardPreview();
  }
}

// Render Exact Card HTML with CR80 Evolis Zenius support
function buildCardHTML(record, index, uniqueIdPrefix = "card") {
  const preset = window.CARD_PRESETS[appState.currentPreset];
  const mapping = appState.columnMapping;
  const isCr80 = preset.widthMm < 90 || appState.paperSize === "EVOLIS_CR80";

  if (!record) {
    return `<div style="padding:1rem; color:red;">Tidak ada data</div>`;
  }

  const getVal = (key) => {
    const mappedHeader = mapping[key];
    return (mappedHeader && record[mappedHeader] !== undefined) ? String(record[mappedHeader]) : "";
  };

  const flVal = getVal("FunctionLocation") || "DP-01-SP1-APS-RF05";
  const flDescVal = getVal("FunctionLocationDesc") || "REFINER LF #3";
  const eqVal = getVal("Equipment") || "MRFD00013";
  const eqDescVal = getVal("Description") || "REFINER LF3";
  const typeVal = getVal("ObjectType") || "";
  const mfgVal = getVal("Manufacturer") || "";
  const modelVal = getVal("ModelNumber") || "";
  const badgeVal = getVal("BadgeText") || preset.badgeText || "ME";

  const qrBoxId = `${uniqueIdPrefix}-qr-${index}`;

  const logoSrc = appState.customLogoDataUrl || window.DEFAULT_LOGO_IMAGE || "DayasaPaper Corporate Logo.png";
  const logoHTML = `<img src="${logoSrc}" class="card-brand-logo-img" alt="DayasaPaper Logo">`;

  return `
    <div class="printable-card ${isCr80 ? 'card-cr80' : ''}">
      <!-- Header Row -->
      <div class="card-header-row">
        <div class="card-brand-group">
          ${logoHTML}
        </div>

        <div class="card-header-right">
          <span class="card-header-tagtext">${escapeHtml(badgeVal)}</span>
          <div class="card-header-greenblock"></div>
        </div>
      </div>

      <!-- Dark Green Divider Line -->
      <div class="card-header-line"></div>

      <!-- Card Body Row -->
      <div class="card-body-row">
        <!-- Left Fields -->
        <div class="card-fields-left">
          <!-- FL Line (Top - Full Width Above QR) -->
          <div class="card-field-row card-row-top">
            <span class="card-label-col">FL</span>
            <span class="card-val-col">${escapeHtml(flVal)}</span>
          </div>
          ${flDescVal ? `<div class="card-subval-row card-subval-top">${escapeHtml(flDescVal)}</div>` : ''}

          <!-- EQ Line (Bottom - QR Avoid) -->
          <div class="card-field-row card-row-bottom">
            <span class="card-label-col">EQ</span>
            <span class="card-val-col">${escapeHtml(eqVal)}</span>
          </div>
          ${eqDescVal ? `<div class="card-subval-row card-subval-bottom">${escapeHtml(eqDescVal)}</div>` : ''}

          <!-- Type Line -->
          <div class="card-field-row card-row-bottom">
            <span class="card-label-col">Type</span>
            <span class="card-val-col">${escapeHtml(typeVal)}</span>
          </div>

          <!-- Mfg Line -->
          <div class="card-field-row card-row-bottom">
            <span class="card-label-col">Mfg</span>
            <span class="card-val-col">${escapeHtml(mfgVal)}</span>
          </div>

          <!-- Model Line -->
          <div class="card-field-row card-row-bottom">
            <span class="card-label-col">Model</span>
            <span class="card-val-col">${escapeHtml(modelVal)}</span>
          </div>
        </div>

        <!-- Bottom Right QR Code (Exact 2.20 cm x 2.20 cm) -->
        <div class="card-qr-bottom-right" id="${qrBoxId}"></div>
      </div>
    </div>
  `;
}

// Generate Blue QR Code Graphic (2.20 cm x 2.20 cm)
function generateCodeGraphic(containerId, textValue) {
  setTimeout(() => {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = "";

    if (window.QRCode) {
      new QRCode(el, {
        text: textValue || "SAMPLE-QR",
        width: 88,
        height: 88,
        colorDark: "#1c4da1",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      el.innerHTML = `<svg width="22mm" height="22mm" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ffffff"/><rect x="5" y="5" width="40" height="40" fill="#1c4da1"/><rect x="55" y="5" width="40" height="40" fill="#1c4da1"/><rect x="5" y="55" width="40" height="40" fill="#1c4da1"/><rect x="55" y="55" width="40" height="40" fill="#1c4da1"/></svg>`;
    }
  }, 50);
}

// Update Main Live Preview Card
function updateCardPreview() {
  const previewCardEl = document.getElementById("main-preview-card");
  const recordIndexSpan = document.getElementById("preview-record-index");

  if (!previewCardEl || appState.uploadedData.length === 0) return;

  const filteredRecords = getFilteredRecords();

  if (filteredRecords.length === 0) {
    previewCardEl.innerHTML = `<div style="padding:2rem; text-align:center; color:#94a3b8; font-size:0.9rem;">Tidak ada data yang cocok dengan filter Anda.</div>`;
    if (recordIndexSpan) recordIndexSpan.textContent = `Record 0 / 0`;
    return;
  }

  if (appState.activePreviewIndex >= filteredRecords.length) {
    appState.activePreviewIndex = 0;
  }

  const activeRecord = filteredRecords[appState.activePreviewIndex];
  if (recordIndexSpan) {
    recordIndexSpan.textContent = `Record ${appState.activePreviewIndex + 1} / ${filteredRecords.length}`;
  }

  previewCardEl.parentElement.innerHTML = `<div class="printable-card" id="main-preview-card"></div>`;
  const newCardEl = document.getElementById("main-preview-card");
  
  newCardEl.outerHTML = buildCardHTML(activeRecord, 0, "preview");

  const getVal = (key) => {
    const mappedHeader = appState.columnMapping[key];
    return (mappedHeader && activeRecord[mappedHeader] !== undefined) ? String(mappedHeader) : "";
  };
  const qrVal = getVal("_codeField") || getVal("Equipment") || "MRFD00013";
  generateCodeGraphic("preview-qr-0", qrVal);
}

function prevPreviewRecord() {
  if (appState.activePreviewIndex > 0) {
    appState.activePreviewIndex--;
    updateCardPreview();
  }
}

function nextPreviewRecord() {
  const filteredRecords = getFilteredRecords();
  if (appState.activePreviewIndex < filteredRecords.length - 1) {
    appState.activePreviewIndex++;
    updateCardPreview();
  }
}

// Render Data Table Editor
function renderDataTable() {
  const headEl = document.getElementById("data-table-head");
  const bodyEl = document.getElementById("data-table-body");
  const countBadge = document.getElementById("data-count-badge");

  if (!headEl || !bodyEl) return;

  const filteredRecords = getFilteredRecords();

  if (countBadge) countBadge.textContent = `${filteredRecords.length} dari ${appState.uploadedData.length} Terpilih`;

  if (appState.headers.length === 0 || appState.uploadedData.length === 0) {
    bodyEl.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada data.</td></tr>`;
    return;
  }

  const displayHeaders = appState.headers.slice(0, 7);
  headEl.innerHTML = `
    <tr>
      <th style="width: 35px;"><input type="checkbox" id="select-all-checkbox" ${filteredRecords.length === appState.uploadedData.length ? 'checked' : ''} onchange="selectAllTableRows(this.checked)"></th>
      <th style="width: 40px;">#</th>
      ${displayHeaders.map(h => `<th>${escapeHtml(h)}</th>`).join("")}
      <th style="width: 70px;">Aksi</th>
    </tr>
  `;

  const query = appState.filterSearchQuery;

  bodyEl.innerHTML = appState.uploadedData.map((row, idx) => {
    const isChecked = appState.selectedIndices.has(idx);

    if (query) {
      const rowString = Object.values(row).join(" ").toLowerCase();
      if (!rowString.includes(query)) {
        return "";
      }
    }

    const cellsHTML = displayHeaders.map(h => {
      const val = row[h] !== undefined ? row[h] : "";
      return `<td contenteditable="true" onblur="updateTableCell(${idx}, '${escapeHtml(h)}', this.innerText)">${escapeHtml(String(val))}</td>`;
    }).join("");

    return `
      <tr style="${isChecked ? 'background: rgba(0, 166, 81, 0.08);' : 'opacity: 0.5;'}">
        <td><input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleSelectTableRow(${idx}, this.checked)"></td>
        <td><strong>${idx + 1}</strong></td>
        ${cellsHTML}
        <td>
          <button class="btn btn-outline btn-sm" onclick="deleteTableRow(${idx})" style="color: var(--accent-danger); padding: 2px 6px;">
            <i data-lucide="trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

function toggleSelectTableRow(idx, checked) {
  if (checked) appState.selectedIndices.add(idx);
  else appState.selectedIndices.delete(idx);
  renderDataTable();
  updateCardPreview();
}

function selectAllTableRows(selectAll) {
  if (selectAll) {
    appState.selectedIndices = new Set(appState.uploadedData.map((_, i) => i));
  } else {
    appState.selectedIndices.clear();
  }
  renderDataTable();
  updateCardPreview();
}

function updateTableCell(rowIdx, headerName, newVal) {
  if (appState.uploadedData[rowIdx]) {
    appState.uploadedData[rowIdx][headerName] = newVal.trim();
    updateCardPreview();
  }
}

function deleteTableRow(rowIdx) {
  appState.uploadedData.splice(rowIdx, 1);
  appState.selectedIndices = new Set(appState.uploadedData.map((_, i) => i));
  renderDataTable();
  updateCardPreview();
}

function addNewRow() {
  const newRow = {};
  appState.headers.forEach(h => newRow[h] = "Data Baru");
  appState.uploadedData.push(newRow);
  appState.selectedIndices.add(appState.uploadedData.length - 1);
  renderDataTable();
  updateCardPreview();
}

function clearData() {
  if (confirm("Apakah Anda yakin ingin menghapus semua data?")) {
    appState.uploadedData = [];
    appState.headers = [];
    appState.selectedIndices.clear();
    renderDataTable();
    updateCardPreview();
  }
}

// File Upload Handler
function initDropzone() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
      e.target.value = ""; // Reset value to allow uploading same file repeatedly
    }
  });
}

function handleFileUpload(file) {
  if (!file) return;

  const fileName = file.name;
  const ext = fileName.split(".").pop().toLowerCase();

  const parseJsonData = (data) => {
    if (!data || data.length === 0) {
      alertToast("File kosong atau tidak memiliki baris data.", "warning");
      return;
    }

    // Filter out completely empty rows
    const validRows = data.filter(row => {
      if (!row) return false;
      return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== "");
    });

    if (validRows.length === 0) {
      alertToast("File tidak memiliki baris data SAP yang valid.", "warning");
      return;
    }

    appState.uploadedData = validRows;
    appState.headers = Object.keys(validRows[0]);
    appState.selectedIndices = new Set(appState.uploadedData.map((_, i) => i));
    appState.activePreviewIndex = 0;
    appState.filterSearchQuery = "";
    autoDetectColumnMapping();
    renderDataTable();
    updateCardPreview();
    alertToast(`Database SAP dimuat (${validRows.length} data).`, "success");
  };

  if (ext === "csv") {
    if (typeof Papa === "undefined") {
      alertToast("Library CSV (PapaParse) belum dimuat. Periksa koneksi internet.", "warning");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          parseJsonData(results.data);
        } else {
          alertToast("File CSV kosong atau tidak valid.", "warning");
        }
      },
      error: (err) => {
        alertToast("Gagal membaca CSV: " + err.message, "warning");
      }
    });
  } else if (ext === "xlsx" || ext === "xls" || ext === "ods" || ext === "xlsm") {
    if (typeof XLSX === "undefined") {
      alertToast("Library Excel (SheetJS) belum dimuat. Periksa koneksi internet.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("File Excel tidak memiliki sheet yang valid.");
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (json && json.length > 0) {
          parseJsonData(json);
        } else {
          alertToast("Sheet Excel pertama kosong.", "warning");
        }
      } catch (err) {
        console.error("Excel Read Error:", err);
        alertToast("Gagal membaca file Excel: " + err.message, "warning");
      }
    };
    reader.onerror = () => {
      alertToast("Gagal membaca file dari sistem komputer.", "warning");
    };
    reader.readAsArrayBuffer(file);
  } else {
    alertToast("Format file tidak didukung. Harap upload file .xlsx, .xls, atau .csv", "warning");
  }
}

// Render Batch Preview Grid
function renderBatchPreviewGrid() {
  const container = document.getElementById("batch-preview-grid");
  const countBadge = document.getElementById("batch-count-badge");

  if (!container) return;

  const filteredRecords = getFilteredRecords();

  if (countBadge) countBadge.textContent = `${filteredRecords.length} Kartu Terpilih`;

  if (filteredRecords.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--text-muted);">Belum ada data terpilih untuk dipratinjau.</div>`;
    return;
  }

  container.innerHTML = filteredRecords.map((record, idx) => {
    const originalIdx = appState.uploadedData.indexOf(record);
    return `
      <div class="batch-card-item">
        <div class="batch-card-header">
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" checked onchange="toggleSelectBatchCard(${originalIdx}, this.checked)">
            <span><strong>#${idx + 1}</strong> - ${escapeHtml(String(record[appState.headers[0]] || 'Record'))}</span>
          </label>
        </div>
        ${buildCardHTML(record, idx, "batch")}
      </div>
    `;
  }).join("");

  filteredRecords.forEach((record, idx) => {
    const mappedHeader = appState.columnMapping["_codeField"] || appState.columnMapping["Equipment"];
    const qrVal = (mappedHeader && record[mappedHeader] !== undefined) ? String(record[mappedHeader]) : "SAMPLE";
    generateCodeGraphic(`batch-qr-${idx}`, qrVal);
  });
}

function toggleSelectBatchCard(idx, checked) {
  if (checked) appState.selectedIndices.add(idx);
  else appState.selectedIndices.delete(idx);
  renderBatchPreviewGrid();
  updateCardPreview();
}

function selectAllBatchCards(selectAll) {
  if (selectAll) {
    appState.selectedIndices = new Set(appState.uploadedData.map((_, i) => i));
  } else {
    appState.selectedIndices.clear();
  }
  renderBatchPreviewGrid();
  updateCardPreview();
}

// Render Print Sheet Layout (Supports Evolis Zenius Single CR80 Tray & A4 Paper)
function renderPrintSheet() {
  const sheetContainer = document.getElementById("sheet-preview");
  const sheetInfo = document.getElementById("sheet-info");
  const paperSelect = document.getElementById("paper-size-select")?.value || "EVOLIS_CR80";
  const cropSelect = document.getElementById("crop-marks-select")?.value === "true";

  appState.paperSize = paperSelect;

  if (!sheetContainer) return;

  const filteredRecords = getFilteredRecords();

  if (filteredRecords.length === 0) {
    sheetContainer.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:3rem; color:#64748b;">Pilih atau paste Fun Loc / Equipment terlebih dahulu untuk mencetak.</div>`;
    return;
  }

  if (paperSelect === "EVOLIS_CR80") {
    sheetContainer.className = "sheet-evolis-container";
    sheetContainer.innerHTML = filteredRecords.map((record, idx) => {
      return `<div class="sheet-evolis-card">${buildCardHTML(record, idx, "print")}</div>`;
    }).join("");

    if (sheetInfo) {
      sheetInfo.textContent = `Printer Evolis Zenius / CR80: Total ${filteredRecords.length} Kartu Plastik (Cetak Satuan Otomatis)`;
    }
  } else {
    sheetContainer.className = "sheet-a4" + (cropSelect ? " show-crop-marks" : "");
    sheetContainer.innerHTML = filteredRecords.map((record, idx) => {
      return buildCardHTML(record, idx, "print");
    }).join("");

    const cardsPerPage = paperSelect === "A4_PORTRAIT" ? 10 : 8;
    const totalPages = Math.ceil(filteredRecords.length / cardsPerPage);

    if (sheetInfo) {
      sheetInfo.textContent = `Kertas A4: Total ${filteredRecords.length} Kartu (${totalPages} Halaman A4)`;
    }
  }

  filteredRecords.forEach((record, idx) => {
    const mappedHeader = appState.columnMapping["_codeField"] || appState.columnMapping["Equipment"];
    const qrVal = (mappedHeader && record[mappedHeader] !== undefined) ? String(record[mappedHeader]) : "SAMPLE";
    generateCodeGraphic(`print-qr-${idx}`, qrVal);
  });
}

function executePrint() {
  renderPrintSheet();

  const paperSelect = document.getElementById("paper-size-select")?.value || "EVOLIS_CR80";
  let styleEl = document.getElementById("dynamic-print-page-style");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "dynamic-print-page-style";
    document.head.appendChild(styleEl);
  }

  if (paperSelect === "EVOLIS_CR80") {
    styleEl.innerHTML = `@media print { @page { size: 85.6mm 54.0mm landscape !important; margin: 0mm !important; } }`;
  } else if (paperSelect === "A4_PORTRAIT") {
    styleEl.innerHTML = `@media print { @page { size: A4 portrait !important; margin: 0mm !important; } }`;
  } else {
    styleEl.innerHTML = `@media print { @page { size: A4 landscape !important; margin: 0mm !important; } }`;
  }

  setTimeout(() => {
    window.print();
  }, 300);
}

// Cache for on-demand Base64 logo conversion (PDF export only)
window._cachedBase64Logo = null;

async function getTaintFreeLogoUrl() {
  if (appState.customLogoDataUrl) return appState.customLogoDataUrl;
  return window.DEFAULT_LOGO_IMAGE;
}

// Initialize Application on Page Load (Ultra-Fast & Lightweight)
document.addEventListener("DOMContentLoaded", () => {
  initDropzone();
// Native Memory QR Code Data URL Generator
function generateQrDataUrl(textValue) {
  return new Promise((resolve) => {
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "-9999px";
    document.body.appendChild(tempDiv);

    try {
      new QRCode(tempDiv, {
        text: textValue || "DAYASA",
        width: 260,
        height: 260,
        colorDark: "#0b4a8b",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });

      const checkResult = () => {
        const canvas = tempDiv.querySelector("canvas");
        const img = tempDiv.querySelector("img");
        let dataUrl = "";
        if (canvas) {
          dataUrl = canvas.toDataURL("image/png");
        } else if (img && img.src) {
          dataUrl = img.src;
        }
        tempDiv.remove();
        resolve(dataUrl);
      };

      setTimeout(checkResult, 10);
    } catch (e) {
      tempDiv.remove();
      resolve("");
    }
  });
}

// Ultra-Fast Native 2D Canvas Card Renderer (0.002s per card, 100% Vector Crisp & Zero Freeze)
async function renderCardToCanvas(record) {
  const canvas = document.createElement("canvas");
  canvas.width = 1011;  // 85.6mm @ 300 DPI
  canvas.height = 638;  // 54.0mm @ 300 DPI
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const mapping = appState.columnMapping || {};
  const getVal = (key) => {
    const mappedHeader = mapping[key];
    return (mappedHeader && record[mappedHeader] !== undefined) ? String(record[mappedHeader]) : "";
  };

  const flVal = getVal("FunctionLocation") || "DP-01-SP1-APS-RF05";
  const flDescVal = getVal("FunctionLocationDesc") || "REFINER LF #3";
  const eqVal = getVal("Equipment") || "MRFD00013";
  const eqDescVal = getVal("Description") || "REFINER LF3";
  const typeVal = getVal("ObjectType") || "";
  const mfgVal = getVal("Manufacturer") || "";
  const modelVal = getVal("ModelNumber") || "";
  const badgeVal = getVal("BadgeText") || "ME";

  // 1. Logo
  const logoSrc = appState.customLogoDataUrl || window.DEFAULT_LOGO_IMAGE;
  if (logoSrc) {
    const logoImg = new Image();
    logoImg.src = logoSrc;
    if (!logoImg.complete) {
      await new Promise(r => { logoImg.onload = r; logoImg.onerror = r; setTimeout(r, 60); });
    }
    try {
      ctx.drawImage(logoImg, 30, 20, 290, 62);
    } catch (e) {}
  }

  // 2. Badge & Green Block
  ctx.font = "bold 26px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "right";
  ctx.fillText(badgeVal, 920, 58);

  ctx.fillStyle = "#00a651";
  ctx.fillRect(935, 30, 46, 32);

  // 3. Dark Green Divider Line
  ctx.fillRect(30, 92, 951, 6);

  // 4. Fields Layout
  ctx.textAlign = "left";
  let y = 135;

  // FL Row (Top - Full Width)
  ctx.font = "bold 24px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#1e293b";
  ctx.fillText("FL", 30, y);
  ctx.fillStyle = "#000000";
  ctx.fillText(flVal, 140, y);
  y += 32;

  if (flDescVal) {
    ctx.font = "bold 22px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.fillText(flDescVal, 140, y);
    y += 36;
  } else {
    y += 6;
  }

  // EQ Row
  ctx.font = "bold 24px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#1e293b";
  ctx.fillText("EQ", 30, y);
  ctx.fillStyle = "#000000";
  ctx.fillText(eqVal, 140, y);
  y += 32;

  if (eqDescVal) {
    ctx.font = "bold 22px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#1e293b";
    const truncDesc = eqDescVal.length > 34 ? eqDescVal.substring(0, 32) + '...' : eqDescVal;
    ctx.fillText(truncDesc, 140, y);
    y += 36;
  } else {
    y += 6;
  }

  // Type Row
  if (typeVal) {
    ctx.font = "bold 22px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.fillText("Type", 30, y);
    ctx.fillStyle = "#000000";
    ctx.fillText(typeVal, 140, y);
    y += 36;
  }

  // Mfg Row
  if (mfgVal) {
    ctx.font = "bold 22px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.fillText("Mfg", 30, y);
    ctx.fillStyle = "#000000";
    ctx.fillText(mfgVal, 140, y);
    y += 36;
  }

  // Model Row
  if (modelVal) {
    ctx.font = "bold 22px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.fillText("Model", 30, y);
    ctx.fillStyle = "#000000";
    ctx.fillText(modelVal, 140, y);
  }

  // 5. QR Code (Bottom Right 260px x 260px)
  const qrText = eqVal || flVal || "DAYASA";
  const qrDataUrl = await generateQrDataUrl(qrText);
  if (qrDataUrl) {
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    if (!qrImg.complete) {
      await new Promise(r => { qrImg.onload = r; qrImg.onerror = r; setTimeout(r, 60); });
    }
    try {
      ctx.drawImage(qrImg, 715, 345, 260, 260);
    } catch(e) {}
  }

  return canvas;
}

async function exportPdf() {
  const filteredRecords = getFilteredRecords();
  if (filteredRecords.length === 0) {
    alertToast("Tidak ada kartu untuk diekspor ke PDF.", "warning");
    return;
  }

  const paperSelect = document.getElementById("paper-size-select")?.value || "EVOLIS_CR80";
  const { jsPDF } = window.jspdf;

  let progressToast = document.getElementById("pdf-progress-toast");
  if (!progressToast) {
    progressToast = document.createElement("div");
    progressToast.id = "pdf-progress-toast";
    progressToast.style.position = "fixed";
    progressToast.style.bottom = "20px";
    progressToast.style.right = "20px";
    progressToast.style.background = "linear-gradient(135deg, #00a651, #059669)";
    progressToast.style.color = "#fff";
    progressToast.style.padding = "0.9rem 1.6rem";
    progressToast.style.borderRadius = "10px";
    progressToast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
    progressToast.style.fontSize = "0.95rem";
    progressToast.style.fontWeight = "700";
    progressToast.style.zIndex = "99999";
    document.body.appendChild(progressToast);
  }

  try {
    if (paperSelect === "EVOLIS_CR80") {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 54],
        compress: true
      });

      const totalCards = filteredRecords.length;

      for (let idx = 0; idx < totalCards; idx++) {
        const percent = Math.round(((idx + 1) / totalCards) * 100);
        progressToast.textContent = `Memproses PDF CR80 (Super Cepat): ${idx + 1} dari ${totalCards} Kartu (${percent}%)...`;

        // Yield tick to allow DOM text update
        await new Promise(resolve => setTimeout(resolve, 10));

        const cardCanvas = await renderCardToCanvas(filteredRecords[idx]);
        const imgData = cardCanvas.toDataURL("image/jpeg", 0.92);

        if (idx > 0) {
          pdf.addPage([85.6, 54], "landscape");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, 85.6, 54, undefined, "FAST");
      }

      progressToast.remove();
      pdf.save(`Kartu_Equipment_Tag_DayasaPaper_CR80_${totalCards}_Kartu.pdf`);
      alertToast(`Berhasil mengunduh ${totalCards} kartu PDF CR80 presisi!`, "success");
    } else {
      alertToast("Mengekspor PDF A4 Grid...", "info");
      const sheetEl = document.getElementById("sheet-preview");
      const canvas = await html2canvas(sheetEl, { scale: 1.6, useCORS: true, allowTaint: false, logging: false });
      const imgData = canvas.toDataURL("image/jpeg", 0.88);
      const pdf = new jsPDF("portrait", "mm", "a4", true);
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save("Kartu_Equipment_Tag_DayasaPaper_A4.pdf");
      if (progressToast) progressToast.remove();
      alertToast("File PDF Lembar A4 berhasil diunduh!", "success");
    }
  } catch (err) {
    console.error("PDF Export Error:", err);
    if (progressToast) progressToast.remove();
    alertToast("Gagal mengunduh PDF: " + err.message, "warning");
  }
}

function downloadSampleCsv() {
  if (!window.SAMPLE_DATA) return;
  const csv = Papa.unparse(window.SAMPLE_DATA);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Format_Sample_SAP_Equipment_DayasaPaper.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function alertToast(msg, type = "info") {
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.background = type === "success" ? "#00a651" : type === "warning" ? "#d97706" : "#3b82f6";
  toast.style.color = "#fff";
  toast.style.padding = "0.75rem 1.25rem";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 4px 14px rgba(0,0,0,0.3)";
  toast.style.fontSize = "0.875rem";
  toast.style.fontWeight = "600";
  toast.style.zIndex = "9999";
  toast.textContent = msg;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
