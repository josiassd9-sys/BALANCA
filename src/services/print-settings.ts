export type PrintFontFamily = 'helvetica' | 'times' | 'courier' | 'square' | 'teko';
export type PrintFontStyle = 'normal' | 'bold';

export type PrintHeaderFieldConfig = {
  text: string;
  fontFamily: PrintFontFamily;
  fontSize: number;
  fontStyle: PrintFontStyle;
};

export type PrintAddressConfig = {
  street: string;
  district: string;
  city: string;
  fontFamily: PrintFontFamily;
  fontSize: number;
  fontStyle: PrintFontStyle;
};

export type PrintTableHeaderConfig = {
  productLabel: string;
  brutoLabel: string;
  taraLabel: string;
  descLabel: string;
  liquidoLabel: string;
  showBackground: boolean;
  backgroundColor: string;
  textColor: string;
};

export type PrintTableLineStyle =
  | 'solid'
  | 'dotted-fine'
  | 'dotted-medium'
  | 'dotted-wide'
  | 'dashed-short'
  | 'dashed-long';

export type PrintTableLineMode = PrintTableLineStyle | 'none';

export type PrintTableLinesConfig = {
  lineColor: string;
  headerSeparatorEnabled: boolean;
  headerSeparatorStyle: PrintTableLineStyle;
  headerSeparatorWidth: number;
  rowCellPadding: number;
  rowHorizontalLineMode: PrintTableLineMode;
  rowHorizontalLineWidth: number;
  showVerticalLines: boolean;
  verticalLineStyle: PrintTableLineStyle;
  verticalLineWidth: number;
};

export type PrintInfoRowConfig = {
  clientLabel: string;
  driverLabel: string;
  plateLabel: string;
  fontFamily: PrintFontFamily;
  fontSize: number;
  fontStyle: PrintFontStyle;
  horizontalGap: number;
};

export type PrintSetTitleConfig = {
  fontFamily: PrintFontFamily;
  fontSize: number;
  fontStyle: PrintFontStyle;
  align: 'left' | 'center' | 'right';
  topSpacingFirstSet: number;
  topSpacingNextSets: number;
  bottomSpacing: number;
};

export type PrintSetSummaryConfig = {
  discountLabel: string;
  totalLabel: string;
  fontFamily: PrintFontFamily;
  fontSize: number;
  fontStyle: PrintFontStyle;
  discountTopSpacing: number;
  totalTopSpacing: number;
  sectionBottomSpacing: number;
};

export type PrintGrandTotalConfig = {
  labelText: string;
  labelFontFamily: PrintFontFamily;
  labelFontSize: number;
  labelFontStyle: PrintFontStyle;
  valueFontFamily: PrintFontFamily;
  valueFontSize: number;
  valueFontStyle: PrintFontStyle;
  showSeparator: boolean;
  separatorLineWidth: number;
  topSpacing: number;
  textTopSpacing: number;
};

export type PrintLayoutConfig = {
  logo: PrintHeaderFieldConfig;
  companyName: PrintHeaderFieldConfig;
  phone: PrintHeaderFieldConfig;
  address: PrintAddressConfig;
  tableHeader: PrintTableHeaderConfig;
  tableLines: PrintTableLinesConfig;
  infoRow: PrintInfoRowConfig;
  setTitle: PrintSetTitleConfig;
  setSummary: PrintSetSummaryConfig;
  grandTotal: PrintGrandTotalConfig;
};

const PRINT_SETTINGS_KEY = 'print-layout-config';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const sanitizeFontFamily = (value: unknown): PrintFontFamily => {
  if (value === 'helvetica' || value === 'times' || value === 'courier' || value === 'square' || value === 'teko') return value;
  return 'helvetica';
};

const sanitizeFontStyle = (value: unknown): PrintFontStyle => {
  if (value === 'normal' || value === 'bold') return value;
  return 'normal';
};

const sanitizeText = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  return value.trim();
};

const sanitizeBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value !== 'boolean') return fallback;
  return value;
};

const sanitizeColor = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed) || /^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return fallback;
};

const sanitizeFontSize = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return clamp(Math.round(value), 8, 72);
};

const sanitizeCellPadding = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return clamp(Number(value), 0.4, 4);
};

const sanitizeGap = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return clamp(Number(value), 0, 12);
};

const sanitizeSetTitleAlign = (value: unknown, fallback: 'left' | 'center' | 'right'): 'left' | 'center' | 'right' => {
  if (value === 'left' || value === 'center' || value === 'right') return value;
  return fallback;
};

const sanitizeSpacing = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return clamp(Number(value), 0, 20);
};

const sanitizeLineWidth = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return clamp(Number(value), 0, 3);
};

const sanitizeTableLineStyle = (value: unknown, fallback: PrintTableLineStyle): PrintTableLineStyle => {
  if (
    value === 'solid'
    || value === 'dotted-fine'
    || value === 'dotted-medium'
    || value === 'dotted-wide'
    || value === 'dashed-short'
    || value === 'dashed-long'
  ) {
    return value;
  }
  return fallback;
};

const sanitizeTableLineMode = (value: unknown, fallback: PrintTableLineMode): PrintTableLineMode => {
  if (value === 'none') return value;
  return sanitizeTableLineStyle(value, fallback === 'none' ? 'solid' : fallback);
};

const sanitizeTableLineWidth = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return clamp(Number(value), 0.1, 3);
};

export const defaultPrintLayoutConfig: PrintLayoutConfig = {
  logo: {
    text: 'PS INOX',
    fontFamily: 'teko',
    fontSize: 28,
    fontStyle: 'bold',
  },
  companyName: {
    text: 'PSINOX COMERCIO DE ACO LTDA',
    fontFamily: 'helvetica',
    fontSize: 14,
    fontStyle: 'normal',
  },
  phone: {
    text: 'Fone: (16) 3761-9564 - Cel: (16) 99788-7055',
    fontFamily: 'helvetica',
    fontSize: 10,
    fontStyle: 'normal',
  },
  address: {
    street: 'Rua Otorino Ravagnani, 600 Batatais/SP',
    district: '',
    city: '',
    fontFamily: 'helvetica',
    fontSize: 10,
    fontStyle: 'normal',
  },
  tableHeader: {
    productLabel: 'Produto',
    brutoLabel: 'Bruto',
    taraLabel: 'Tara',
    descLabel: 'Desc',
    liquidoLabel: 'Liquido',
    showBackground: true,
    backgroundColor: '#DCDCDC',
    textColor: '#000000',
  },
  tableLines: {
    lineColor: '#000000',
    headerSeparatorEnabled: true,
    headerSeparatorStyle: 'solid',
    headerSeparatorWidth: 0.5,
    rowCellPadding: 2,
    rowHorizontalLineMode: 'solid',
    rowHorizontalLineWidth: 0.3,
    showVerticalLines: true,
    verticalLineStyle: 'solid',
    verticalLineWidth: 0.3,
  },
  infoRow: {
    clientLabel: 'Cliente',
    driverLabel: 'Motorista',
    plateLabel: 'Placa',
    fontFamily: 'helvetica',
    fontSize: 11,
    fontStyle: 'normal',
    horizontalGap: 3,
  },
  setTitle: {
    fontFamily: 'helvetica',
    fontSize: 12,
    fontStyle: 'bold',
    align: 'center',
    topSpacingFirstSet: 0,
    topSpacingNextSets: 8,
    bottomSpacing: 6,
  },
  setSummary: {
    discountLabel: 'Desconto Cacamba',
    totalLabel: 'Total Cacamba',
    fontFamily: 'helvetica',
    fontSize: 10,
    fontStyle: 'normal',
    discountTopSpacing: 6,
    totalTopSpacing: 6,
    sectionBottomSpacing: 18,
  },
  grandTotal: {
    labelText: 'Peso Liquido Total:',
    labelFontFamily: 'helvetica',
    labelFontSize: 14,
    labelFontStyle: 'bold',
    valueFontFamily: 'helvetica',
    valueFontSize: 14,
    valueFontStyle: 'bold',
    showSeparator: true,
    separatorLineWidth: 0.5,
    topSpacing: 0,
    textTopSpacing: 8,
  },
};

export function normalizePrintLayoutConfig(input?: Partial<PrintLayoutConfig>): PrintLayoutConfig {
  const logoInput: Partial<PrintHeaderFieldConfig> = input?.logo || {};
  const companyInput: Partial<PrintHeaderFieldConfig> = input?.companyName || {};
  const phoneInput: Partial<PrintHeaderFieldConfig> = input?.phone || {};
  const addressInput: Partial<PrintAddressConfig> = input?.address || {};
  const tableHeaderInput: Partial<PrintTableHeaderConfig> = input?.tableHeader || {};
  const tableLinesInput: Partial<PrintTableLinesConfig> = input?.tableLines || {};
  const infoRowInput: Partial<PrintInfoRowConfig> = input?.infoRow || {};
  const setTitleInput: Partial<PrintSetTitleConfig> = input?.setTitle || {};
  const setSummaryInput: Partial<PrintSetSummaryConfig> = input?.setSummary || {};
  const grandTotalInput: Partial<PrintGrandTotalConfig> = input?.grandTotal || {};

  return {
    logo: {
      text: sanitizeText(logoInput.text, defaultPrintLayoutConfig.logo.text),
      fontFamily: sanitizeFontFamily(logoInput.fontFamily),
      fontSize: sanitizeFontSize(logoInput.fontSize, defaultPrintLayoutConfig.logo.fontSize),
      fontStyle: sanitizeFontStyle(logoInput.fontStyle),
    },
    companyName: {
      text: sanitizeText(companyInput.text, defaultPrintLayoutConfig.companyName.text),
      fontFamily: sanitizeFontFamily(companyInput.fontFamily),
      fontSize: sanitizeFontSize(companyInput.fontSize, defaultPrintLayoutConfig.companyName.fontSize),
      fontStyle: sanitizeFontStyle(companyInput.fontStyle),
    },
    phone: {
      text: sanitizeText(phoneInput.text, defaultPrintLayoutConfig.phone.text),
      fontFamily: sanitizeFontFamily(phoneInput.fontFamily),
      fontSize: sanitizeFontSize(phoneInput.fontSize, defaultPrintLayoutConfig.phone.fontSize),
      fontStyle: sanitizeFontStyle(phoneInput.fontStyle),
    },
    address: {
      street: sanitizeText(addressInput.street, defaultPrintLayoutConfig.address.street),
      district: sanitizeText(addressInput.district, defaultPrintLayoutConfig.address.district),
      city: sanitizeText(addressInput.city, defaultPrintLayoutConfig.address.city),
      fontFamily: sanitizeFontFamily(addressInput.fontFamily),
      fontSize: sanitizeFontSize(addressInput.fontSize, defaultPrintLayoutConfig.address.fontSize),
      fontStyle: sanitizeFontStyle(addressInput.fontStyle),
    },
    tableHeader: {
      productLabel: sanitizeText(tableHeaderInput.productLabel, defaultPrintLayoutConfig.tableHeader.productLabel),
      brutoLabel: sanitizeText(tableHeaderInput.brutoLabel, defaultPrintLayoutConfig.tableHeader.brutoLabel),
      taraLabel: sanitizeText(tableHeaderInput.taraLabel, defaultPrintLayoutConfig.tableHeader.taraLabel),
      descLabel: sanitizeText(tableHeaderInput.descLabel, defaultPrintLayoutConfig.tableHeader.descLabel),
      liquidoLabel: sanitizeText(tableHeaderInput.liquidoLabel, defaultPrintLayoutConfig.tableHeader.liquidoLabel),
      showBackground: sanitizeBoolean(tableHeaderInput.showBackground, defaultPrintLayoutConfig.tableHeader.showBackground),
      backgroundColor: sanitizeColor(tableHeaderInput.backgroundColor, defaultPrintLayoutConfig.tableHeader.backgroundColor),
      textColor: sanitizeColor(tableHeaderInput.textColor, defaultPrintLayoutConfig.tableHeader.textColor),
    },
    tableLines: {
      lineColor: sanitizeColor(tableLinesInput.lineColor, defaultPrintLayoutConfig.tableLines.lineColor),
      headerSeparatorEnabled: sanitizeBoolean(
        tableLinesInput.headerSeparatorEnabled,
        defaultPrintLayoutConfig.tableLines.headerSeparatorEnabled
      ),
      headerSeparatorStyle: sanitizeTableLineStyle(
        tableLinesInput.headerSeparatorStyle,
        defaultPrintLayoutConfig.tableLines.headerSeparatorStyle
      ),
      headerSeparatorWidth: sanitizeTableLineWidth(
        tableLinesInput.headerSeparatorWidth,
        defaultPrintLayoutConfig.tableLines.headerSeparatorWidth
      ),
      rowCellPadding: sanitizeCellPadding(
        tableLinesInput.rowCellPadding,
        defaultPrintLayoutConfig.tableLines.rowCellPadding
      ),
      rowHorizontalLineMode: sanitizeTableLineMode(
        tableLinesInput.rowHorizontalLineMode,
        defaultPrintLayoutConfig.tableLines.rowHorizontalLineMode
      ),
      rowHorizontalLineWidth: sanitizeTableLineWidth(
        tableLinesInput.rowHorizontalLineWidth,
        defaultPrintLayoutConfig.tableLines.rowHorizontalLineWidth
      ),
      showVerticalLines: sanitizeBoolean(tableLinesInput.showVerticalLines, defaultPrintLayoutConfig.tableLines.showVerticalLines),
      verticalLineStyle: sanitizeTableLineStyle(
        tableLinesInput.verticalLineStyle,
        defaultPrintLayoutConfig.tableLines.verticalLineStyle
      ),
      verticalLineWidth: sanitizeTableLineWidth(
        tableLinesInput.verticalLineWidth,
        defaultPrintLayoutConfig.tableLines.verticalLineWidth
      ),
    },
    infoRow: {
      clientLabel: sanitizeText(infoRowInput.clientLabel, defaultPrintLayoutConfig.infoRow.clientLabel),
      driverLabel: sanitizeText(infoRowInput.driverLabel, defaultPrintLayoutConfig.infoRow.driverLabel),
      plateLabel: sanitizeText(infoRowInput.plateLabel, defaultPrintLayoutConfig.infoRow.plateLabel),
      fontFamily: sanitizeFontFamily(infoRowInput.fontFamily),
      fontSize: sanitizeFontSize(infoRowInput.fontSize, defaultPrintLayoutConfig.infoRow.fontSize),
      fontStyle: sanitizeFontStyle(infoRowInput.fontStyle),
      horizontalGap: sanitizeGap(infoRowInput.horizontalGap, defaultPrintLayoutConfig.infoRow.horizontalGap),
    },
    setTitle: {
      fontFamily: sanitizeFontFamily(setTitleInput.fontFamily),
      fontSize: sanitizeFontSize(setTitleInput.fontSize, defaultPrintLayoutConfig.setTitle.fontSize),
      fontStyle: sanitizeFontStyle(setTitleInput.fontStyle),
      align: sanitizeSetTitleAlign(setTitleInput.align, defaultPrintLayoutConfig.setTitle.align),
      topSpacingFirstSet: sanitizeSpacing(setTitleInput.topSpacingFirstSet, defaultPrintLayoutConfig.setTitle.topSpacingFirstSet),
      topSpacingNextSets: sanitizeSpacing(setTitleInput.topSpacingNextSets, defaultPrintLayoutConfig.setTitle.topSpacingNextSets),
      bottomSpacing: sanitizeSpacing(setTitleInput.bottomSpacing, defaultPrintLayoutConfig.setTitle.bottomSpacing),
    },
    setSummary: {
      discountLabel: sanitizeText(setSummaryInput.discountLabel, defaultPrintLayoutConfig.setSummary.discountLabel),
      totalLabel: sanitizeText(setSummaryInput.totalLabel, defaultPrintLayoutConfig.setSummary.totalLabel),
      fontFamily: sanitizeFontFamily(setSummaryInput.fontFamily),
      fontSize: sanitizeFontSize(setSummaryInput.fontSize, defaultPrintLayoutConfig.setSummary.fontSize),
      fontStyle: sanitizeFontStyle(setSummaryInput.fontStyle),
      discountTopSpacing: sanitizeSpacing(setSummaryInput.discountTopSpacing, defaultPrintLayoutConfig.setSummary.discountTopSpacing),
      totalTopSpacing: sanitizeSpacing(setSummaryInput.totalTopSpacing, defaultPrintLayoutConfig.setSummary.totalTopSpacing),
      sectionBottomSpacing: sanitizeSpacing(setSummaryInput.sectionBottomSpacing, defaultPrintLayoutConfig.setSummary.sectionBottomSpacing),
    },
    grandTotal: {
      labelText: sanitizeText(grandTotalInput.labelText, defaultPrintLayoutConfig.grandTotal.labelText),
      labelFontFamily: sanitizeFontFamily(grandTotalInput.labelFontFamily),
      labelFontSize: sanitizeFontSize(grandTotalInput.labelFontSize, defaultPrintLayoutConfig.grandTotal.labelFontSize),
      labelFontStyle: sanitizeFontStyle(grandTotalInput.labelFontStyle),
      valueFontFamily: sanitizeFontFamily(grandTotalInput.valueFontFamily),
      valueFontSize: sanitizeFontSize(grandTotalInput.valueFontSize, defaultPrintLayoutConfig.grandTotal.valueFontSize),
      valueFontStyle: sanitizeFontStyle(grandTotalInput.valueFontStyle),
      showSeparator: sanitizeBoolean(grandTotalInput.showSeparator, defaultPrintLayoutConfig.grandTotal.showSeparator),
      separatorLineWidth: sanitizeLineWidth(grandTotalInput.separatorLineWidth, defaultPrintLayoutConfig.grandTotal.separatorLineWidth),
      topSpacing: sanitizeSpacing(grandTotalInput.topSpacing, defaultPrintLayoutConfig.grandTotal.topSpacing),
      textTopSpacing: sanitizeSpacing(grandTotalInput.textTopSpacing, defaultPrintLayoutConfig.grandTotal.textTopSpacing),
    },
  };
}

export function loadPrintLayoutConfig(): PrintLayoutConfig {
  if (typeof window === 'undefined') return defaultPrintLayoutConfig;

  try {
    const raw = window.localStorage.getItem(PRINT_SETTINGS_KEY);
    if (!raw) return defaultPrintLayoutConfig;
    const parsed = JSON.parse(raw) as Partial<PrintLayoutConfig>;
    return normalizePrintLayoutConfig(parsed);
  } catch {
    return defaultPrintLayoutConfig;
  }
}

export function savePrintLayoutConfig(config: PrintLayoutConfig): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PRINT_SETTINGS_KEY, JSON.stringify(normalizePrintLayoutConfig(config)));
  } catch {
    // ignore localStorage persistence errors
  }
}
