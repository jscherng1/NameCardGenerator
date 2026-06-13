const canvas = document.querySelector("#badgeCanvas");
const ctx = canvas.getContext("2d");

const inputs = {
  name: document.querySelector("#nameInput"),
  role: document.querySelector("#roleInput"),
  customRole: document.querySelector("#customRoleInput"),
  bg: document.querySelector("#bgColorInput"),
  accent: document.querySelector("#accentColorInput"),
  soft: document.querySelector("#softColorInput"),
  pattern: document.querySelector("#patternInput"),
  bgImage: document.querySelector("#bgImageInput"),
  excel: document.querySelector("#excelInput"),
};

const sizeControls = {
  preset: document.querySelector("#sizePresetInput"),
  customFields: document.querySelector("#customSizeFields"),
  width: document.querySelector("#badgeWidthInput"),
  height: document.querySelector("#badgeHeightInput"),
  label: document.querySelector("#previewSizeLabel"),
};

const fontControls = {
  nameAuto: document.querySelector("#autoNameFontInput"),
  nameSize: document.querySelector("#nameFontSizeInput"),
  nameValue: document.querySelector("#nameFontSizeValue"),
  roleAuto: document.querySelector("#autoRoleFontInput"),
  roleSize: document.querySelector("#roleFontSizeInput"),
  roleValue: document.querySelector("#roleFontSizeValue"),
};

const peopleList = document.querySelector("#peopleList");
const importStatus = document.querySelector("#importStatus");
const backgroundStatus = document.querySelector("#backgroundStatus");
const downloadPngButton = document.querySelector("#downloadPngButton");
const downloadPdfButton = document.querySelector("#downloadPdfButton");
const clearBatchButton = document.querySelector("#clearBatchButton");
const clearBgImageButton = document.querySelector("#clearBgImageButton");
const exportQualityInput = document.querySelector("#exportQualityInput");
const mobileColorPicker = document.querySelector("#mobileColorPicker");
const mobileColorCanvas = document.querySelector("#mobileColorCanvas");
const mobileColorMarker = document.querySelector("#mobileColorMarker");
const mobileColorPreview = document.querySelector("#mobileColorPreview");
const mobileColorPickerTitle = document.querySelector("#mobileColorPickerTitle");
const mobileColorCancel = document.querySelector("#mobileColorCancel");
const mobileColorDone = document.querySelector("#mobileColorDone");
const mobileColorButtons = [...document.querySelectorAll(".mobile-color-button")];

let people = [];
let activeIndex = -1;
let backgroundImage = null;
let activeColorInput = null;
let colorBeforePicker = "";

const baseSize = {
  width: 1080,
  height: 1560,
};

const previewPixelsPerCm = 120;

const exportQualities = {
  compact: { dpi: 150, jpegQuality: 0.72, label: "小檔案" },
  standard: { dpi: 200, jpegQuality: 0.82, label: "標準" },
  high: { dpi: 300, jpegQuality: 0.92, label: "高品質" },
};

const sizePresets = {
  "9:13": { ratioWidth: 9, ratioHeight: 13, widthCm: 9, heightCm: 13 },
  "9:16": { ratioWidth: 9, ratioHeight: 16, widthCm: 9, heightCm: 16 },
  "4:5": { ratioWidth: 4, ratioHeight: 5, widthCm: 12, heightCm: 15 },
  "3:4": { ratioWidth: 3, ratioHeight: 4, widthCm: 12, heightCm: 16 },
  "1:1": { ratioWidth: 1, ratioHeight: 1, widthCm: 12, heightCm: 12 },
};

const badgeSize = {
  width: 1080,
  height: 1560,
  widthCm: 9,
  heightCm: 13,
};

function currentPerson() {
  const importedRole = activeIndex >= 0 ? people[activeIndex]?.role : "";
  return {
    name: inputs.name.value.trim() || "王小明",
    role: importedRole || selectedFallbackRole(),
  };
}

function selectedFallbackRole() {
  return inputs.customRole.value.trim() || inputs.role.value.trim();
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawMobileColorPalette() {
  const paletteContext = mobileColorCanvas.getContext("2d");
  const { width, height } = mobileColorCanvas;
  const hueGradient = paletteContext.createLinearGradient(0, 0, width, 0);
  [
    [0, "#ff0000"],
    [1 / 6, "#ffff00"],
    [2 / 6, "#00ff00"],
    [3 / 6, "#00ffff"],
    [4 / 6, "#0000ff"],
    [5 / 6, "#ff00ff"],
    [1, "#ff0000"],
  ].forEach(([offset, color]) => hueGradient.addColorStop(offset, color));
  paletteContext.fillStyle = hueGradient;
  paletteContext.fillRect(0, 0, width, height);

  const lightGradient = paletteContext.createLinearGradient(0, 0, 0, height);
  lightGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  lightGradient.addColorStop(0.48, "rgba(255, 255, 255, 0)");
  lightGradient.addColorStop(0.52, "rgba(0, 0, 0, 0)");
  lightGradient.addColorStop(1, "rgba(0, 0, 0, 1)");
  paletteContext.fillStyle = lightGradient;
  paletteContext.fillRect(0, 0, width, height);
}

function syncMobileColorButtons() {
  mobileColorButtons.forEach((button) => {
    const input = document.querySelector(`#${button.dataset.colorTarget}`);
    button.style.setProperty("--selected-color", input.value);
  });
}

function setMobilePickerColor(event) {
  if (!activeColorInput) return;
  const bounds = mobileColorCanvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
  const y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
  const pixelX = Math.min(mobileColorCanvas.width - 1, Math.round((x / bounds.width) * mobileColorCanvas.width));
  const pixelY = Math.min(mobileColorCanvas.height - 1, Math.round((y / bounds.height) * mobileColorCanvas.height));
  const [r, g, b] = mobileColorCanvas.getContext("2d").getImageData(pixelX, pixelY, 1, 1).data;
  const color = `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;

  activeColorInput.value = color;
  mobileColorPreview.style.setProperty("--selected-color", color);
  mobileColorMarker.style.left = `${(x / bounds.width) * 100}%`;
  mobileColorMarker.style.top = `${(y / bounds.height) * 100}%`;
  syncMobileColorButtons();
  activeColorInput.dispatchEvent(new Event("input", { bubbles: true }));
}

function openMobileColorPicker(button) {
  activeColorInput = document.querySelector(`#${button.dataset.colorTarget}`);
  colorBeforePicker = activeColorInput.value;
  mobileColorPickerTitle.textContent = button.getAttribute("aria-label");
  mobileColorPreview.style.setProperty("--selected-color", activeColorInput.value);
  mobileColorPicker.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeMobileColorPicker(restoreColor = false) {
  if (restoreColor && activeColorInput) {
    activeColorInput.value = colorBeforePicker;
    activeColorInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
  mobileColorPicker.hidden = true;
  document.body.style.overflow = "";
  activeColorInput = null;
  syncMobileColorButtons();
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function fitText(text, maxWidth, baseSize, minSize, weight = 900) {
  let size = baseSize;
  ctx.font = `${weight} ${size}px "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 4;
    ctx.font = `${weight} ${size}px "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
  }
  return size;
}

function fontScale(input) {
  return Number(input.value) / 100;
}

function adjustedFontSize(text, maxWidth, baseSize, minSize, weight, autoInput, scaleInput) {
  const size = autoInput.checked ? baseSize : baseSize * fontScale(scaleInput);
  return fitText(text, maxWidth, size, minSize, weight);
}

function drawLeaf(x, y, scale, rotate, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotate);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -70);
  ctx.bezierCurveTo(74, -38, 92, 34, 0, 86);
  ctx.bezierCurveTo(-92, 34, -74, -38, 0, -70);
  ctx.fill();
  ctx.restore();
}

function drawCoverImage(image, width, height) {
  const imageRatio = image.width / image.height;
  const canvasRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let x = 0;
  let y = 0;

  if (imageRatio > canvasRatio) {
    drawHeight = height;
    drawWidth = height * imageRatio;
    x = (width - drawWidth) / 2;
  } else {
    drawWidth = width;
    drawHeight = width / imageRatio;
    y = (height - drawHeight) / 2;
  }

  ctx.drawImage(image, x, y, drawWidth, drawHeight);
  ctx.fillStyle = rgba(inputs.bg.value, 0.34);
  ctx.fillRect(0, 0, width, height);
}

function drawWavePattern(width, height, accent) {
  ctx.save();
  ctx.strokeStyle = rgba(accent, 0.28);
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  for (let y = 170; y < height; y += 210) {
    ctx.beginPath();
    for (let x = -80; x <= width + 80; x += 40) {
      const pointY = y + Math.sin((x + y) / 95) * 28;
      if (x === -80) ctx.moveTo(x, pointY);
      else ctx.lineTo(x, pointY);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawDotPattern(width, height, accent, soft) {
  ctx.save();
  for (let y = 120; y < height; y += 145) {
    for (let x = 105; x < width; x += 155) {
      ctx.fillStyle = (x + y) % 2 === 0 ? rgba(accent, 0.28) : rgba(soft, 0.62);
      ctx.beginPath();
      ctx.arc(x, y, 18 + ((x + y) % 3) * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawSparklePattern(width, height, accent, soft) {
  ctx.save();
  const sx = width / baseSize.width;
  const sy = height / baseSize.height;
  const points = [
    [160, 210, 34],
    [870, 250, 27],
    [250, 1220, 30],
    [900, 1130, 42],
    [805, 1390, 24],
    [180, 1410, 22],
  ];
  points.forEach(([x, y, size], index) => {
    ctx.strokeStyle = index % 2 ? rgba(accent, 0.42) : rgba(soft, 0.78);
    ctx.lineWidth = Math.max(5, 8 * Math.min(sx, sy));
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo((x - size) * sx, y * sy);
    ctx.lineTo((x + size) * sx, y * sy);
    ctx.moveTo(x * sx, (y - size) * sy);
    ctx.lineTo(x * sx, (y + size) * sy);
    ctx.stroke();
  });
  ctx.restore();
}

function drawConfettiPattern(width, height, accent, soft) {
  const sx = width / baseSize.width;
  const sy = height / baseSize.height;
  const scale = Math.min(sx, sy);
  const pieces = [
    [130, 170, 0.42, 62],
    [330, 120, -0.68, 48],
    [875, 210, 0.78, 58],
    [965, 430, -0.36, 44],
    [155, 1120, -0.82, 54],
    [350, 1390, 0.55, 46],
    [780, 1260, -0.48, 64],
    [930, 1430, 0.9, 42],
  ];

  ctx.save();
  pieces.forEach(([x, y, rotation, length], index) => {
    ctx.translate(x * sx, y * sy);
    ctx.rotate(rotation);
    ctx.strokeStyle = index % 2 ? rgba(accent, 0.42) : rgba(soft, 0.86);
    ctx.lineWidth = 14 * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo((-length / 2) * scale, 0);
    ctx.lineTo((length / 2) * scale, 0);
    ctx.stroke();
    ctx.rotate(-rotation);
    ctx.translate(-x * sx, -y * sy);
  });
  ctx.restore();
}

function drawBlockPattern(width, height, accent, soft) {
  const sx = width / baseSize.width;
  const sy = height / baseSize.height;
  const scale = Math.min(sx, sy);
  const blocks = [
    [55, 80, 155, 155, -0.2],
    [840, 105, 125, 125, 0.18],
    [70, 1220, 135, 135, 0.28],
    [820, 1260, 190, 190, -0.18],
  ];

  ctx.save();
  blocks.forEach(([x, y, blockWidth, blockHeight, rotation], index) => {
    ctx.translate((x + blockWidth / 2) * sx, (y + blockHeight / 2) * sy);
    ctx.rotate(rotation);
    ctx.fillStyle = index % 2 ? rgba(accent, 0.22) : rgba(soft, 0.72);
    roundRect(
      (-blockWidth / 2) * scale,
      (-blockHeight / 2) * scale,
      blockWidth * scale,
      blockHeight * scale,
      28 * scale
    );
    ctx.fill();
    ctx.rotate(-rotation);
    ctx.translate(-(x + blockWidth / 2) * sx, -(y + blockHeight / 2) * sy);
  });
  ctx.restore();
}

function drawBubblePattern(width, height, accent, soft) {
  const sx = width / baseSize.width;
  const sy = height / baseSize.height;
  const scale = Math.min(sx, sy);
  const bubbles = [
    [135, 170, 72],
    [310, 250, 42],
    [910, 220, 58],
    [960, 1100, 76],
    [780, 1370, 46],
    [170, 1320, 62],
  ];

  ctx.save();
  bubbles.forEach(([x, y, radius], index) => {
    ctx.strokeStyle = index % 2 ? rgba(accent, 0.38) : rgba(soft, 0.9);
    ctx.lineWidth = 14 * scale;
    ctx.beginPath();
    ctx.arc(x * sx, y * sy, radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

function drawDiagonalPattern(width, height, accent, soft) {
  const spacing = Math.max(120, width * 0.16);

  ctx.save();
  ctx.lineWidth = Math.max(7, width * 0.008);
  ctx.lineCap = "round";
  for (let x = -height; x < width + height; x += spacing) {
    ctx.strokeStyle =
      Math.round(x / spacing) % 2 === 0 ? rgba(accent, 0.2) : rgba(soft, 0.52);
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + height, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLeafPattern(width, height, accent, soft) {
  const sx = width / baseSize.width;
  const sy = height / baseSize.height;
  const scale = Math.min(sx, sy);

  ctx.fillStyle = rgba(soft, 0.86);
  ctx.beginPath();
  ctx.ellipse(138 * sx, 170 * sy, 220 * scale, 130 * scale, -0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = rgba(soft, 0.72);
  ctx.beginPath();
  ctx.ellipse(960 * sx, 1350 * sy, 260 * scale, 160 * scale, -0.6, 0, Math.PI * 2);
  ctx.fill();

  drawLeaf(202 * sx, 305 * sy, 1.4 * scale, -0.72, rgba(accent, 0.48));
  drawLeaf(862 * sx, 264 * sy, 0.92 * scale, 0.82, rgba(accent, 0.34));
  drawLeaf(250 * sx, 1268 * sy, 1.02 * scale, 0.34, rgba(accent, 0.28));
  drawLeaf(890 * sx, 1140 * sy, 1.46 * scale, -0.86, rgba(accent, 0.42));
}

function drawSelectedBackground(width, height, accent, soft) {
  if (backgroundImage) {
    drawCoverImage(backgroundImage, width, height);
    return;
  }

  if (inputs.pattern.value === "waves") {
    drawWavePattern(width, height, accent);
  } else if (inputs.pattern.value === "dots") {
    drawDotPattern(width, height, accent, soft);
  } else if (inputs.pattern.value === "sparkles") {
    drawSparklePattern(width, height, accent, soft);
  } else if (inputs.pattern.value === "confetti") {
    drawConfettiPattern(width, height, accent, soft);
  } else if (inputs.pattern.value === "blocks") {
    drawBlockPattern(width, height, accent, soft);
  } else if (inputs.pattern.value === "bubbles") {
    drawBubblePattern(width, height, accent, soft);
  } else if (inputs.pattern.value === "diagonal") {
    drawDiagonalPattern(width, height, accent, soft);
  } else if (inputs.pattern.value === "leaves") {
    drawLeafPattern(width, height, accent, soft);
  }
}

function drawBadge(person = currentPerson()) {
  const { width, height } = badgeSize;
  const unit = Math.min(width / baseSize.width, height / baseSize.height);
  canvas.width = width;
  canvas.height = height;
  canvas.style.aspectRatio = `${width} / ${height}`;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = inputs.bg.value;
  ctx.fillRect(0, 0, width, height);

  const accent = inputs.accent.value;
  const soft = inputs.soft.value;

  drawSelectedBackground(width, height, accent, soft);

  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  roundRect(width * 0.115, height * 0.252, width * 0.77, height * 0.496, 64 * unit);
  ctx.fill();

  ctx.fillStyle = "#151716";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const nameSize = adjustedFontSize(person.name, width * 0.7, 178 * unit, 52 * unit, 900, fontControls.nameAuto, fontControls.nameSize);
  const hasRole = Boolean(person.role);
  const roleSize = hasRole
    ? adjustedFontSize(person.role, width * 0.6, 58 * unit, 26 * unit, 700, fontControls.roleAuto, fontControls.roleSize)
    : 0;

  const groupCenterY = height * 0.525;
  const textGap = hasRole ? Math.max(30 * unit, (nameSize + roleSize) * 0.16) : 0;
  const centerDistance = hasRole ? nameSize * 0.5 + roleSize * 0.5 + textGap : 0;
  const nameY = hasRole ? groupCenterY - centerDistance * 0.5 : groupCenterY;
  const roleY = groupCenterY + centerDistance * 0.5;

  ctx.font = `900 ${nameSize}px "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
  ctx.fillText(person.name, width / 2, nameY);

  if (hasRole) {
    ctx.fillStyle = "#222522";
    ctx.font = `700 ${roleSize}px "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
    ctx.fillText(person.role, width / 2, roleY);

    ctx.strokeStyle = rgba(accent, 0.88);
    ctx.lineWidth = 10 * unit;
    ctx.lineCap = "round";
    const underlineY = roleY + roleSize * 0.85 + 34 * unit;
    ctx.beginPath();
    ctx.moveTo(width * 0.363, underlineY);
    ctx.lineTo(width * 0.637, underlineY);
    ctx.stroke();
  }
}

function clampDimension(value, min, max, fallback) {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function formatCm(value) {
  return Number.isInteger(value) ? String(value) : Number(value.toFixed(2)).toString();
}

function roundCm(value) {
  return Number(value.toFixed(2));
}

function updatePreviewSizeLabel() {
  if (sizeControls.label) {
    sizeControls.label.textContent = `${formatCm(badgeSize.widthCm)} x ${formatCm(badgeSize.heightCm)} cm`;
  }
}

function calculateA4Layout() {
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 5;
  const gap = 5;
  const printWidth = badgeSize.widthCm * 10;
  const printHeight = badgeSize.heightCm * 10;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  if (printWidth > usableWidth || printHeight > usableHeight) {
    return { fits: false, pageWidth, pageHeight, margin, gap, printWidth, printHeight };
  }

  const columns = Math.max(1, Math.floor((usableWidth + gap) / (printWidth + gap)));
  const rows = Math.max(1, Math.floor((usableHeight + gap) / (printHeight + gap)));
  return {
    fits: true,
    pageWidth,
    pageHeight,
    margin,
    gap,
    printWidth,
    printHeight,
    columns,
    rows,
    badgesPerPage: columns * rows,
  };
}

function updateImportLayoutStatus() {
  if (!people.length) return;
  const layout = calculateA4Layout();
  const sizeText = `${formatCm(badgeSize.widthCm)} x ${formatCm(badgeSize.heightCm)} cm`;
  importStatus.textContent = layout.fits
    ? `已匯入 ${people.length} 筆名單。名牌實際尺寸 ${sizeText}，A4 每頁排版 ${layout.badgesPerPage} 張。`
    : `已匯入 ${people.length} 筆名單。名牌實際尺寸 ${sizeText}，超過 A4 可列印範圍。`;
}

function updateFontControl(autoInput, rangeInput, valueOutput) {
  rangeInput.disabled = autoInput.checked;
  valueOutput.textContent = autoInput.checked ? "自動" : `${rangeInput.value}%`;
}

function updateFontControls() {
  updateFontControl(fontControls.nameAuto, fontControls.nameSize, fontControls.nameValue);
  updateFontControl(fontControls.roleAuto, fontControls.roleSize, fontControls.roleValue);
  updatePreviewSizeLabel();
  drawBadge(currentPerson());
}

function applyBadgeSize(options = {}) {
  const { source = "preset", clampValues = true, preserveSource = false } = options;
  const preset = sizeControls.preset.value;
  const isCustom = preset === "custom";
  sizeControls.customFields.hidden = false;

  if (!isCustom && source === "preset") {
    const selectedSize = sizePresets[preset] || sizePresets["9:13"];
    badgeSize.widthCm = selectedSize.widthCm;
    badgeSize.heightCm = selectedSize.heightCm;
  } else if (!isCustom) {
    const selectedSize = sizePresets[preset] || sizePresets["9:13"];
    const ratio = selectedSize.ratioHeight / selectedSize.ratioWidth;

    if (source === "width") {
      const typedWidth = Number.parseFloat(sizeControls.width.value);
      if (!Number.isFinite(typedWidth)) return;
      const minWidth = Math.max(3, 3 / ratio);
      const maxWidth = Math.min(25, 35 / ratio);
      if (!clampValues && (typedWidth < minWidth || typedWidth > maxWidth)) return;
      badgeSize.widthCm = clampDimension(typedWidth, minWidth, maxWidth, badgeSize.widthCm);
      badgeSize.heightCm = roundCm(badgeSize.widthCm * ratio);
    } else {
      const typedHeight = Number.parseFloat(sizeControls.height.value);
      if (!Number.isFinite(typedHeight)) return;
      const minHeight = Math.max(3, 3 * ratio);
      const maxHeight = Math.min(35, 25 * ratio);
      if (!clampValues && (typedHeight < minHeight || typedHeight > maxHeight)) return;
      badgeSize.heightCm = clampDimension(typedHeight, minHeight, maxHeight, badgeSize.heightCm);
      badgeSize.widthCm = roundCm(badgeSize.heightCm / ratio);
    }
  } else {
    const typedWidth = Number.parseFloat(sizeControls.width.value);
    const typedHeight = Number.parseFloat(sizeControls.height.value);
    if (!Number.isFinite(typedWidth) || !Number.isFinite(typedHeight)) return;
    if (!clampValues && (typedWidth < 3 || typedWidth > 25 || typedHeight < 3 || typedHeight > 35)) return;
    badgeSize.widthCm = clampDimension(typedWidth, 3, 25, badgeSize.widthCm);
    badgeSize.heightCm = clampDimension(typedHeight, 3, 35, badgeSize.heightCm);
  }

  badgeSize.width = Math.round(badgeSize.widthCm * previewPixelsPerCm);
  badgeSize.height = Math.round(badgeSize.heightCm * previewPixelsPerCm);
  if (!preserveSource || source !== "width") {
    sizeControls.width.value = formatCm(badgeSize.widthCm);
  }
  if (!preserveSource || source !== "height") {
    sizeControls.height.value = formatCm(badgeSize.heightCm);
  }
  updatePreviewSizeLabel();
  updateImportLayoutStatus();
  drawBadge(currentPerson());
}

function setForm(person) {
  inputs.name.value = person.name || "";
  drawBadge({ ...person, role: person.role || selectedFallbackRole() });
}

function renderPeopleList() {
  peopleList.innerHTML = "";
  if (!people.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "尚未匯入名單。";
    peopleList.append(empty);
    return;
  }

  people.forEach((person, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `person-card${index === activeIndex ? " is-active" : ""}`;
    const wrapper = document.createElement("span");
    const name = document.createElement("strong");
    const role = document.createElement("span");
    name.textContent = person.name;
    role.textContent = person.role || selectedFallbackRole() || "空白";
    wrapper.append(name, role);
    button.append(wrapper);
    button.addEventListener("click", () => {
      activeIndex = index;
      setForm(person);
      renderPeopleList();
    });
    peopleList.append(button);
  });
}

function pickValue(row, keys) {
  const match = keys.find((key) => row[key] !== undefined && String(row[key]).trim() !== "");
  return match ? String(row[match]).trim() : "";
}

function pickRoleValue(row) {
  const exactValue = pickValue(row, [
    "職稱",
    "工作組別",
    "組別",
    "職務",
    "工作內容",
    "負責工作",
    "負責項目",
    "人員類別",
    "志工類別",
    "單位",
    "隊伍",
    "小隊",
    "小隊名稱",
    "服務組別",
    "role",
    "Role",
  ]);
  if (exactValue) return exactValue;

  const roleKeywords = ["職稱", "職務", "工作組", "組別", "單位", "隊伍", "小隊", "負責工作"];
  const matchingEntry = Object.entries(row).find(([key, value]) => {
    const header = String(key).replace(/\s+/g, "").toLowerCase();
    return (
      String(value).trim() !== "" &&
      (roleKeywords.some((keyword) => header.includes(keyword)) ||
        header === "role" ||
        header.includes("position"))
    );
  });
  return matchingEntry ? String(matchingEntry[1]).trim() : "";
}

function normalizeRows(rows) {
  return rows
    .map((row) => ({
      name: pickValue(row, [
        "姓名",
        "中文姓名",
        "名字",
        "人員姓名",
        "工作人員姓名",
        "志工姓名",
        "服務人員姓名",
        "學生姓名",
        "本名",
        "暱稱",
        "姓名/暱稱",
        "name",
        "Name",
      ]),
      role: pickRoleValue(row),
      english: pickValue(row, [
        "英文姓名",
        "英文",
        "英文名字",
        "英文名",
        "English Name",
        "english",
        "English",
      ]),
    }))
    .filter((person) => person.name);
}

async function importSpreadsheet(file) {
  if (!window.XLSX) {
    importStatus.textContent = "Excel 讀取套件載入失敗，請確認網路後重新開啟。";
    return;
  }

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  people = normalizeRows(rows);
  activeIndex = people.length ? 0 : -1;

  if (people.length) {
    setForm(people[0]);
    updateImportLayoutStatus();
  } else {
    importStatus.textContent = "沒有找到可用姓名欄位，請確認表格第一列是欄位名稱。";
  }
  renderPeopleList();
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function safeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

function selectedExportQuality() {
  return exportQualities[exportQualityInput.value] || exportQualities.standard;
}

function useExportResolution() {
  const quality = selectedExportQuality();
  const pixelsPerCm = quality.dpi / 2.54;
  const previewSize = { width: badgeSize.width, height: badgeSize.height };
  badgeSize.width = Math.max(1, Math.round(badgeSize.widthCm * pixelsPerCm));
  badgeSize.height = Math.max(1, Math.round(badgeSize.heightCm * pixelsPerCm));
  return { quality, previewSize };
}

function restorePreviewResolution(previewSize) {
  badgeSize.width = previewSize.width;
  badgeSize.height = previewSize.height;
  drawBadge(currentPerson());
}

function downloadCurrentPng() {
  const person = currentPerson();
  const { quality, previewSize } = useExportResolution();
  drawBadge(person);
  canvas.toBlob((blob) => {
    downloadBlob(blob, `${safeFilename(person.name)}_名牌.png`);
    importStatus.textContent = `PNG 已使用${quality.label}（${quality.dpi} DPI）輸出，實際尺寸 ${formatCm(badgeSize.widthCm)} x ${formatCm(badgeSize.heightCm)} cm。`;
    restorePreviewResolution(previewSize);
  }, "image/png");
}

async function downloadBatchPdf() {
  const batch = people.length ? people : [currentPerson()];
  if (!window.jspdf) {
    importStatus.textContent = "PDF 套件載入失敗，請確認網路後重新開啟。";
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const layout = calculateA4Layout();
  if (!layout.fits) {
    importStatus.textContent = `名牌實際尺寸 ${formatCm(badgeSize.widthCm)} x ${formatCm(badgeSize.heightCm)} cm 超過 A4 可列印範圍。`;
    return;
  }
  const { pageWidth, pageHeight, gap, printWidth, printHeight, columns, rows, badgesPerPage } = layout;
  const layoutWidth = columns * printWidth + (columns - 1) * gap;
  const layoutHeight = rows * printHeight + (rows - 1) * gap;
  const startX = (pageWidth - layoutWidth) / 2;
  const startY = (pageHeight - layoutHeight) / 2;
  const { quality, previewSize } = useExportResolution();

  batch.forEach((person, index) => {
    if (index > 0 && index % badgesPerPage === 0) {
      pdf.addPage();
    }
    drawBadge({ ...person, role: person.role || selectedFallbackRole() });
    const image = canvas.toDataURL("image/jpeg", quality.jpegQuality);
    const pageIndex = index % badgesPerPage;
    const column = pageIndex % columns;
    const row = Math.floor(pageIndex / columns);
    const x = startX + column * (printWidth + gap);
    const y = startY + row * (printHeight + gap);
    pdf.addImage(image, "JPEG", x, y, printWidth, printHeight, undefined, "FAST");
  });

  pdf.save("人員名單.pdf");
  importStatus.textContent = `PDF 已使用${quality.label}（${quality.dpi} DPI）輸出，依 ${formatCm(badgeSize.widthCm)} x ${formatCm(badgeSize.heightCm)} cm 實際尺寸排版，每頁排版 ${badgesPerPage} 張。`;
  restorePreviewResolution(previewSize);
}

Object.values(inputs).forEach((input) => {
  if (input !== inputs.excel && input !== inputs.bgImage) {
    input.addEventListener("input", () => drawBadge(currentPerson()));
    input.addEventListener("change", () => drawBadge(currentPerson()));
  }
});

mobileColorButtons.forEach((button) => {
  button.addEventListener("click", () => openMobileColorPicker(button));
});

mobileColorCanvas.addEventListener("pointerdown", (event) => {
  mobileColorCanvas.setPointerCapture(event.pointerId);
  setMobilePickerColor(event);
});
mobileColorCanvas.addEventListener("pointermove", (event) => {
  if (mobileColorCanvas.hasPointerCapture(event.pointerId)) {
    setMobilePickerColor(event);
  }
});
mobileColorCanvas.addEventListener("pointerup", (event) => {
  if (mobileColorCanvas.hasPointerCapture(event.pointerId)) {
    mobileColorCanvas.releasePointerCapture(event.pointerId);
  }
});
mobileColorCancel.addEventListener("click", () => closeMobileColorPicker(true));
mobileColorDone.addEventListener("click", () => closeMobileColorPicker());
document.querySelector("[data-color-picker-close]").addEventListener("click", () => closeMobileColorPicker(true));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileColorPicker.hidden) {
    closeMobileColorPicker(true);
  }
});

inputs.bgImage.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) return;

  const image = new Image();
  image.onload = () => {
    backgroundImage = image;
    backgroundStatus.textContent = `已套用背景圖：${file.name}`;
    drawBadge(currentPerson());
    URL.revokeObjectURL(image.src);
  };
  image.onerror = () => {
    backgroundStatus.textContent = "背景圖讀取失敗，請換一張 PNG、JPG 或 WebP 圖片。";
  };
  image.src = URL.createObjectURL(file);
});

inputs.excel.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (file) {
    try {
      await importSpreadsheet(file);
    } catch {
      importStatus.textContent = "匯入失敗，請確認檔案格式是否正確。";
    } finally {
      inputs.excel.value = "";
    }
  }
});

downloadPngButton.addEventListener("click", downloadCurrentPng);
downloadPdfButton.addEventListener("click", downloadBatchPdf);
sizeControls.preset.addEventListener("change", () => applyBadgeSize({ source: "preset" }));
sizeControls.width.addEventListener("input", () =>
  applyBadgeSize({ source: "width", clampValues: false, preserveSource: true })
);
sizeControls.height.addEventListener("input", () =>
  applyBadgeSize({ source: "height", clampValues: false, preserveSource: true })
);
sizeControls.width.addEventListener("change", () => applyBadgeSize({ source: "width" }));
sizeControls.height.addEventListener("change", () => applyBadgeSize({ source: "height" }));
Object.values(fontControls).forEach((control) => {
  control.addEventListener("input", updateFontControls);
  control.addEventListener("change", updateFontControls);
});
clearBgImageButton.addEventListener("click", () => {
  backgroundImage = null;
  inputs.bgImage.value = "";
  backgroundStatus.textContent = "已移除背景圖，改用內建背景圖案。";
  drawBadge(currentPerson());
});
clearBatchButton.addEventListener("click", () => {
  people = [];
  activeIndex = -1;
  inputs.excel.value = "";
  importStatus.textContent = "已清空批次名單。";
  renderPeopleList();
  drawBadge(currentPerson());
});

renderPeopleList();
drawMobileColorPalette();
syncMobileColorButtons();
updateFontControls();
applyBadgeSize();
drawBadge();
