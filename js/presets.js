// Card Template Presets including Evolis Zenius CR80 PVC Card Support
window.CARD_PRESETS = {
  dayasa_equipment_tag_cr80: {
    id: "dayasa_equipment_tag_cr80",
    name: "PT Dayasa Arta Prima - Evolis Zenius / PVC CR80 (85.6mm x 54mm)",
    widthMm: 85.6,
    heightMm: 54,
    orientation: "landscape",
    accentColor: "#00a651",
    logoTextPrimary: "DayasaPaper",
    logoTextSub: "PT Dayasa Arta Prima",
    badgeText: "ME",
    codeType: "QR",
    codeField: "Equipment",
    defaultMapping: {
      "FunctionLocation": "Functional Location",
      "FunctionLocationDesc": "Description of functional location",
      "Equipment": "Equipment",
      "Description": "Description of Technical Object",
      "ObjectType": "Technical obj. type",
      "Manufacturer": "Manufacturer of asset",
      "ModelNumber": "Manufacturer Model number",
      "BadgeText": "Main work center"
    },
    fields: [
      { key: "FunctionLocation", label: "FL", required: true },
      { key: "FunctionLocationDesc", label: "FL Desc", isSubline: true },
      { key: "Equipment", label: "EQ", required: true },
      { key: "Description", label: "EQ Desc", isSubline: true },
      { key: "ObjectType", label: "Type" },
      { key: "Manufacturer", label: "Mfg" },
      { key: "ModelNumber", label: "Model" }
    ]
  },

  dayasa_equipment_tag: {
    id: "dayasa_equipment_tag",
    name: "PT Dayasa Arta Prima - Tagging A4 Sheet (100mm x 50mm)",
    widthMm: 100,
    heightMm: 50,
    orientation: "landscape",
    accentColor: "#00a651",
    logoTextPrimary: "DayasaPaper",
    logoTextSub: "PT Dayasa Arta Prima",
    badgeText: "ME",
    codeType: "QR",
    codeField: "Equipment",
    defaultMapping: {
      "FunctionLocation": "Functional Location",
      "FunctionLocationDesc": "Description of functional location",
      "Equipment": "Equipment",
      "Description": "Description of Technical Object",
      "ObjectType": "Technical obj. type",
      "Manufacturer": "Manufacturer of asset",
      "ModelNumber": "Manufacturer Model number",
      "BadgeText": "Main work center"
    },
    fields: [
      { key: "FunctionLocation", label: "FL", required: true },
      { key: "FunctionLocationDesc", label: "FL Desc", isSubline: true },
      { key: "Equipment", label: "EQ", required: true },
      { key: "Description", label: "EQ Desc", isSubline: true },
      { key: "ObjectType", label: "Type" },
      { key: "Manufacturer", label: "Mfg" },
      { key: "ModelNumber", label: "Model" }
    ]
  },
  
  employee_id_card: {
    id: "employee_id_card",
    name: "Kartu Pegawai / Employee ID Card (CR80)",
    widthMm: 85.6,
    heightMm: 54,
    orientation: "landscape",
    accentColor: "#1e40af",
    logoTextPrimary: "DayasaPaper",
    logoTextSub: "KARTU PEGAWAI / ID BADGE",
    badgeText: "STAFF",
    codeType: "BARCODE",
    codeField: "Equipment",
    defaultMapping: {
      "FunctionLocation": "Equipment",
      "FunctionLocationDesc": "Description of Technical Object",
      "Equipment": "Plant Work Center",
      "Description": "Cost Center",
      "ObjectType": "Main work center",
      "Manufacturer": "Manufacturer of asset",
      "ModelNumber": "Serial Number",
      "BadgeText": "Main work center"
    },
    fields: [
      { key: "FunctionLocation", label: "ID NO" },
      { key: "FunctionLocationDesc", label: "NAMA" },
      { key: "Equipment", label: "DEPT" },
      { key: "Description", label: "JABATAN" },
      { key: "ObjectType", label: "SHIF" }
    ]
  }
};
