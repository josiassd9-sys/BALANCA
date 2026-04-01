import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNumber } from '@/components/scale/format-number';
import type { WeighingSet } from '@/components/scale/types';
import { defaultPrintLayoutConfig, normalizePrintLayoutConfig, type PrintLayoutConfig } from '@/services/print-settings';

export const FINALIZED_WEIGHINGS_DIR = 'PesagensFinalizadas';
const TEKO_VFS_FILE = 'Teko-wght.ttf';
const TEKO_PUBLIC_PATH = '/fonts/Teko-wght.ttf';
let tekoFontRegistered = false;

type HeaderData = {
  client: string;
  plate: string;
  driver: string;
};

type GenerateWeighingPdfParams = {
  headerData: HeaderData;
  weighingSets: WeighingSet[];
  grandTotalLiquido: number;
  printLayoutConfig?: PrintLayoutConfig;
};

function hexToRgb(color: string): [number, number, number] {
  const fallback: [number, number, number] = [0, 0, 0];
  if (!color || !color.startsWith('#')) return fallback;

  let normalized = color.slice(1).trim();
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
  }

  if (normalized.length !== 6) return fallback;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if ([r, g, b].some((channel) => Number.isNaN(channel))) return fallback;
  return [r, g, b];
}

function resolveDashPattern(style: PrintLayoutConfig['tableLines']['headerSeparatorStyle']): number[] {
  switch (style) {
    case 'dotted-fine':
      return [0.5, 1.2];
    case 'dotted-medium':
      return [1, 1.8];
    case 'dotted-wide':
      return [1.5, 2.5];
    case 'dashed-short':
      return [2.2, 1.8];
    case 'dashed-long':
      return [4, 2.2];
    default:
      return [];
  }
}

export async function generateWeighingPdf({
  headerData,
  weighingSets,
  grandTotalLiquido,
  printLayoutConfig,
}: GenerateWeighingPdfParams): Promise<'native' | 'web'> {
  const printConfig = normalizePrintLayoutConfig(printLayoutConfig || defaultPrintLayoutConfig);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  await ensurePdfTekoFont(doc);

  const now = new Date();
  const dataFormatada = now.toLocaleDateString('pt-BR');
  const horaFormatada = now.toLocaleTimeString('pt-BR');

  const palavrasIgnoradas = ['E', 'DE', 'DA', 'DO', 'DOS', 'DAS'];

  const iniciaisCliente = (headerData.client || 'SEM CLIENTE')
    .toUpperCase()
    .replace(/[^\w\s]/gi, '')
    .split(' ')
    .filter((p) => p && !palavrasIgnoradas.includes(p))
    .map((p) => p[0])
    .join('_');

  const dia = String(now.getDate()).padStart(2, '0');
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const ano = String(now.getFullYear()).slice(-2);
  const hora = String(now.getHours()).padStart(2, '0');
  const minuto = String(now.getMinutes()).padStart(2, '0');

  let iniciaisFormatadas = iniciaisCliente;
  if (!iniciaisCliente.includes('_')) {
    iniciaisFormatadas = iniciaisCliente.slice(0, 3);
  }

  const codigoPesagem = `PS.${iniciaisFormatadas.replace(/_/g, '')}.${dia}${mes}${ano}-${hora}${minuto}`;
  const numeroPesagem = `${codigoPesagem} - ${dataFormatada} ${horaFormatada}`;
  const nomeArquivo = `Pesagem_${codigoPesagem}.pdf`;

  doc.setFontSize(printConfig.logo.fontSize);
  setPdfFont(doc, printConfig.logo.fontFamily, printConfig.logo.fontStyle);
  setPdfCharSpacing(doc, getHeaderCharSpacing(printConfig.logo.fontFamily, 'logo'));
  doc.text(printConfig.logo.text || defaultPrintLayoutConfig.logo.text, 105, 18, { align: 'center' });
  setPdfCharSpacing(doc, 0);

  doc.setFontSize(printConfig.companyName.fontSize);
  setPdfFont(doc, printConfig.companyName.fontFamily, printConfig.companyName.fontStyle);
  setPdfCharSpacing(doc, getHeaderCharSpacing(printConfig.companyName.fontFamily, 'company'));
  doc.text(printConfig.companyName.text || defaultPrintLayoutConfig.companyName.text, 105, 28, { align: 'center' });
  setPdfCharSpacing(doc, 0);

  doc.setFontSize(printConfig.phone.fontSize);
  setPdfFont(doc, printConfig.phone.fontFamily, printConfig.phone.fontStyle);
  const phonesText = printConfig.phone.text || defaultPrintLayoutConfig.phone.text;
  const dateTimeText = `${dataFormatada} ${horaFormatada}`;
  const numberText = `Nº: ${codigoPesagem}`;
  const rowLeft = 20;
  const rowRight = 190;
  const rowGap = 3;

  doc.text(phonesText, rowLeft, 36);

  const numberWidth = doc.getTextWidth(numberText);
  doc.text(numberText, rowRight, 36, { align: 'right' });

  const middleStart = rowLeft + doc.getTextWidth(phonesText) + rowGap;
  const middleEnd = rowRight - numberWidth - rowGap;
  const middleWidth = middleEnd - middleStart;

  let centeredDateText = dateTimeText;
  if (middleWidth > 0) {
    while (doc.getTextWidth(centeredDateText) > middleWidth && centeredDateText.length > 0) {
      centeredDateText = centeredDateText.slice(0, -1);
    }
  }

  const dateX = middleWidth > 0
    ? middleStart + (middleWidth - doc.getTextWidth(centeredDateText)) / 2
    : 105;
  doc.text(centeredDateText, dateX, 36);

  setPdfFont(doc, printConfig.address.fontFamily, printConfig.address.fontStyle);
  doc.setFontSize(printConfig.address.fontSize);

  const addressY = 41;
  const streetText = printConfig.address.street || defaultPrintLayoutConfig.address.street;
  const districtText = printConfig.address.district || defaultPrintLayoutConfig.address.district;
  const cityText = printConfig.address.city || defaultPrintLayoutConfig.address.city;

  const trimToFit = (text: string, maxWidth: number) => {
    let trimmed = text;
    while (doc.getTextWidth(trimmed) > maxWidth && trimmed.length > 0) {
      trimmed = trimmed.slice(0, -1);
    }
    return trimmed;
  };

  const addressLeft = 20;
  const addressRight = 190;

  const maxStreetWidth = 75;
  const maxCityWidth = 55;

  const streetFinal = trimToFit(streetText, maxStreetWidth);
  const cityFinal = trimToFit(cityText, maxCityWidth);

  doc.text(streetFinal, addressLeft, addressY);
  doc.text(cityFinal, addressRight, addressY, { align: 'right' });

  const streetWidth = doc.getTextWidth(streetFinal);
  const cityWidth = doc.getTextWidth(cityFinal);
  const districtZoneStart = addressLeft + streetWidth + 3;
  const districtZoneEnd = addressRight - cityWidth - 3;
  const districtZoneWidth = districtZoneEnd - districtZoneStart;
  const districtFinal = trimToFit(districtText, Math.max(districtZoneWidth, 0));
  const districtWidth = doc.getTextWidth(districtFinal);
  const districtX = districtZoneWidth > 0 ? districtZoneStart + (districtZoneWidth - districtWidth) / 2 : 105;
  doc.text(districtFinal, districtX, addressY);

  doc.setFont('helvetica', 'normal');

  const yHeader = 52;
  doc.setFontSize(printConfig.infoRow.fontSize);
  setPdfFont(doc, printConfig.infoRow.fontFamily, printConfig.infoRow.fontStyle);

  const clientLabel = (printConfig.infoRow.clientLabel || 'Cliente').trim();
  const driverLabel = (printConfig.infoRow.driverLabel || 'Motorista').trim();
  const plateLabel = (printConfig.infoRow.plateLabel || 'Placa').trim();

  let clienteText = `${clientLabel}: ${headerData.client || 'N/A'}`;
  const motoristaText = `${driverLabel}: ${headerData.driver || 'N/A'}`;
  const placaText = `${plateLabel}: ${headerData.plate || 'N/A'}`;

  const marginLeft = 20;
  const marginRight = 190;
  const gap = Math.max(0, printConfig.infoRow.horizontalGap);

  const cortarTexto = (texto: string, maxWidth: number) => {
    let txt = texto;
    while (doc.getTextWidth(txt) > maxWidth && txt.length > 0) {
      txt = txt.slice(0, -1);
    }
    return txt;
  };

  const clienteMax = (marginRight - marginLeft) * 0.5;
  clienteText = cortarTexto(clienteText, clienteMax);

  const clienteWidth = doc.getTextWidth(clienteText);
  const clienteX = marginLeft;
  doc.text(clienteText, clienteX, yHeader);

  const placaWidth = doc.getTextWidth(placaText);
  const placaX = marginRight;
  doc.text(placaText, placaX, yHeader, { align: 'right' });

  const inicioEspaco = clienteX + clienteWidth + gap;
  const fimEspaco = placaX - placaWidth - gap;
  const larguraEspaco = fimEspaco - inicioEspaco;

  const motoristaFinal = cortarTexto(motoristaText, larguraEspaco);
  const motoristaWidth = doc.getTextWidth(motoristaFinal);
  const motoristaX = inicioEspaco + (larguraEspaco - motoristaWidth) / 2;
  doc.text(motoristaFinal, motoristaX, yHeader);

  let y = 58;

  const setTitleAlign = printConfig.setTitle.align;
  const setTitleX = setTitleAlign === 'left' ? 20 : setTitleAlign === 'right' ? 190 : 105;

  const setTitleTextOptions =
    setTitleAlign === 'left'
      ? undefined
      : ({ align: setTitleAlign } as { align: 'center' | 'right' });

  weighingSets.forEach((set, index) => {
    y += index === 0 ? printConfig.setTitle.topSpacingFirstSet : printConfig.setTitle.topSpacingNextSets;

    doc.setFontSize(printConfig.setTitle.fontSize);
    setPdfFont(doc, printConfig.setTitle.fontFamily, printConfig.setTitle.fontStyle);
    doc.text(set.name.toUpperCase(), setTitleX, y, setTitleTextOptions);
    y += printConfig.setTitle.bottomSpacing;

    const tableData = set.items.map((item) => [
      item.material || '-',
      formatNumber(item.bruto, true),
      formatNumber(item.tara, true),
      formatNumber(item.descontos, true),
      formatNumber(item.liquido, true),
    ]);

    const tableHeaderLabels = [
      printConfig.tableHeader.productLabel || 'Produto',
      printConfig.tableHeader.brutoLabel || 'Bruto',
      printConfig.tableHeader.taraLabel || 'Tara',
      printConfig.tableHeader.descLabel || 'Desc',
      printConfig.tableHeader.liquidoLabel || 'Liquido',
    ];

    const tableHeaderFillColor = printConfig.tableHeader.showBackground
      ? hexToRgb(printConfig.tableHeader.backgroundColor)
      : [255, 255, 255] as [number, number, number];
    const tableHeaderTextColor = hexToRgb(printConfig.tableHeader.textColor);

    autoTable(doc, {
      startY: y,
      head: [tableHeaderLabels],
      body: tableData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: printConfig.tableLines.rowCellPadding, halign: 'right', lineWidth: 0 },
      headStyles: { fillColor: tableHeaderFillColor, textColor: tableHeaderTextColor, fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'left', cellWidth: 80 } },
      margin: { left: 20, right: 20 },
    });

    const tableRef = (doc as any).lastAutoTable;

    if (tableRef) {
      const headCells = (Object.values((tableRef.head?.[0]?.cells || {})) as Array<{
        x: number;
        y: number;
        width: number;
        height: number;
      }>).filter(
        (cell) =>
          isFiniteNumber(cell?.x)
          && isFiniteNumber(cell?.y)
          && isFiniteNumber(cell?.width)
          && isFiniteNumber(cell?.height)
      );

      const sortedHeadCells = headCells.sort((a, b) => a.x - b.x);

      if (sortedHeadCells.length > 0) {
        const leftX = sortedHeadCells[0].x;
        const rightX = sortedHeadCells[sortedHeadCells.length - 1].x + sortedHeadCells[sortedHeadCells.length - 1].width;
        const topY = sortedHeadCells[0].y;
        const headerBottomY = sortedHeadCells[0].y + sortedHeadCells[0].height;
        const bottomY = tableRef.finalY;
        const lineColor = hexToRgb(printConfig.tableLines.lineColor);

        if (!isFiniteNumber(leftX) || !isFiniteNumber(rightX) || !isFiniteNumber(topY) || !isFiniteNumber(headerBottomY) || !isFiniteNumber(bottomY)) {
          return;
        }

        doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);

        if (printConfig.tableLines.showVerticalLines) {
          const verticalDash = resolveDashPattern(printConfig.tableLines.verticalLineStyle);
          safeSetLineDashPattern(doc, verticalDash);
          doc.setLineWidth(printConfig.tableLines.verticalLineWidth);

          const verticalXs: number[] = sortedHeadCells.map((cell) => cell.x);
          verticalXs.push(rightX);

          verticalXs.filter((xLine) => isFiniteNumber(xLine)).forEach((xLine) => {
            doc.line(xLine, topY, xLine, bottomY);
          });
        }

        if (printConfig.tableLines.headerSeparatorEnabled) {
          const headerDash = resolveDashPattern(printConfig.tableLines.headerSeparatorStyle);
          safeSetLineDashPattern(doc, headerDash);
          doc.setLineWidth(printConfig.tableLines.headerSeparatorWidth);
          doc.line(leftX, headerBottomY, rightX, headerBottomY);
        }

        if (printConfig.tableLines.rowHorizontalLineMode !== 'none') {
          const rowDash = resolveDashPattern(printConfig.tableLines.rowHorizontalLineMode);
          safeSetLineDashPattern(doc, rowDash);
          doc.setLineWidth(printConfig.tableLines.rowHorizontalLineWidth);

          (tableRef.body || []).forEach((row: { y: number; height: number }) => {
            if (!isFiniteNumber(row?.y) || !isFiniteNumber(row?.height)) return;
            const rowBottomY = row.y + row.height;
            if (!isFiniteNumber(rowBottomY)) return;
            doc.line(leftX, rowBottomY, rightX, rowBottomY);
          });
        }

        safeSetLineDashPattern(doc, []);
      }
    }

    const finalY = tableRef?.finalY || y + 20;

    doc.setFontSize(printConfig.setSummary.fontSize);
    setPdfFont(doc, printConfig.setSummary.fontFamily, printConfig.setSummary.fontStyle);

    const discountLabel = printConfig.setSummary.discountLabel || 'Desconto Cacamba';
    const totalLabel = printConfig.setSummary.totalLabel || 'Total Cacamba';

    const discountY = finalY + printConfig.setSummary.discountTopSpacing;
    doc.text(`${discountLabel}: -${formatNumber(set.descontoCacamba, true)} kg`, 190, discountY, { align: 'right' });

    const totalY = discountY + printConfig.setSummary.totalTopSpacing;
    doc.text(
      `${totalLabel}: ${formatNumber(
        set.items.reduce((acc, i) => acc + i.liquido, 0) - set.descontoCacamba,
        true
      )} kg`,
      190,
      totalY,
      { align: 'right' }
    );

    y = totalY + printConfig.setSummary.sectionBottomSpacing;
  });

  const totalLineY = y + printConfig.grandTotal.topSpacing;

  if (printConfig.grandTotal.showSeparator) {
    doc.setLineWidth(printConfig.grandTotal.separatorLineWidth);
    doc.line(20, totalLineY, 190, totalLineY);
  }

  const totalTextY = totalLineY + printConfig.grandTotal.textTopSpacing;

  doc.setFontSize(printConfig.grandTotal.labelFontSize);
  setPdfFont(doc, printConfig.grandTotal.labelFontFamily, printConfig.grandTotal.labelFontStyle);
  doc.text(printConfig.grandTotal.labelText || 'Peso Liquido Total:', 20, totalTextY);

  doc.setFontSize(printConfig.grandTotal.valueFontSize);
  setPdfFont(doc, printConfig.grandTotal.valueFontFamily, printConfig.grandTotal.valueFontStyle);
  doc.text(`${new Intl.NumberFormat('pt-BR').format(grandTotalLiquido)} KG`, 190, totalTextY, { align: 'right' });

  if (Capacitor.isNativePlatform()) {
    const dataUri = doc.output('datauristring');
    const commaIndex = dataUri.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('jsPDF retornou formato de data URI inválido');
    }
    const pdfBase64 = dataUri.slice(commaIndex + 1);

    const writeResult = await Filesystem.writeFile({
      path: `${FINALIZED_WEIGHINGS_DIR}/${nomeArquivo}`,
      data: pdfBase64,
      directory: Directory.Documents,
      recursive: true,
    });

    await Share.share({
      title: `Pesagem ${numeroPesagem}`,
      text: `Comprovante de pesagem - ${headerData.client || 'Cliente'}`,
      url: writeResult.uri,
      dialogTitle: 'Compartilhar comprovante de pesagem',
    });
    return 'native';
  }

  doc.save(nomeArquivo);
  return 'web';
}

export type FinalizedWeighingPdf = {
  name: string;
  path: string;
  uri: string;
};

export async function listFinalizedWeighingPdfs(): Promise<FinalizedWeighingPdf[]> {
  if (!Capacitor.isNativePlatform()) return [];

  let result: Awaited<ReturnType<typeof Filesystem.readdir>>;
  try {
    result = await Filesystem.readdir({
      path: FINALIZED_WEIGHINGS_DIR,
      directory: Directory.Documents,
    });
  } catch {
    // Directory may not exist yet in first app run.
    return [];
  }

  const entries = (result.files || []) as Array<string | { name?: string }>;
  const names = entries
    .map((entry) => (typeof entry === 'string' ? entry : entry.name || ''))
    .filter((name) => name.toLowerCase().endsWith('.pdf'))
    .sort((a, b) => b.localeCompare(a, 'pt-BR'));

  const results = await Promise.allSettled(
    names.map(async (name) => {
      const path = `${FINALIZED_WEIGHINGS_DIR}/${name}`;
      const uriResult = await Filesystem.getUri({
        path,
        directory: Directory.Documents,
      });

      return {
        name,
        path,
        uri: uriResult.uri,
      };
    })
  );

  const files = results
    .filter((r): r is PromiseFulfilledResult<FinalizedWeighingPdf> => r.status === 'fulfilled')
    .map((r) => r.value);

  return files;
}

function resolvePdfFont(
  fontFamily: PrintLayoutConfig['logo']['fontFamily'],
  fontStyle: 'normal' | 'bold'
): { family: string; style: 'normal' | 'bold' } {
  if (fontFamily === 'teko') {
    return { family: 'teko', style: fontStyle };
  }

  if (fontFamily === 'square') {
    return { family: 'courier', style: 'bold' };
  }

  return {
    family: fontFamily,
    style: fontStyle,
  };
}

function setPdfFont(
  doc: jsPDF,
  fontFamily: PrintLayoutConfig['logo']['fontFamily'],
  fontStyle: 'normal' | 'bold'
): void {
  const resolved = resolvePdfFont(fontFamily, fontStyle);
  try {
    doc.setFont(resolved.family, resolved.style);
  } catch {
    doc.setFont('helvetica', fontStyle);
  }
}

async function ensurePdfTekoFont(doc: jsPDF): Promise<void> {
  if (tekoFontRegistered) return;
  if (typeof window === 'undefined') return;

  try {
    const response = await fetch(TEKO_PUBLIC_PATH);
    if (!response.ok) return;

    const fontBuffer = await response.arrayBuffer();
    const fontBase64 = arrayBufferToBase64(fontBuffer);

    if (!fontBase64) return;

    doc.addFileToVFS(TEKO_VFS_FILE, fontBase64);
    doc.addFont(TEKO_VFS_FILE, 'teko', 'normal');
    doc.addFont(TEKO_VFS_FILE, 'teko', 'bold');
    tekoFontRegistered = true;
  } catch {
    // Mantem fallback padrao quando a fonte nao estiver disponivel.
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getHeaderCharSpacing(
  fontFamily: PrintLayoutConfig['logo']['fontFamily'],
  field: 'logo' | 'company'
): number {
  if (fontFamily !== 'teko') return 0;
  return field === 'logo' ? 1.1 : 0.6;
}

function setPdfCharSpacing(doc: jsPDF, value: number): void {
  if (typeof (doc as unknown as { setCharSpace?: unknown }).setCharSpace !== 'function') {
    return;
  }

  try {
    doc.setCharSpace(value);
  } catch {
    // Ignora runtimes sem suporte a char spacing.
  }
}

function safeSetLineDashPattern(doc: jsPDF, pattern: number[]): void {
  if (typeof (doc as unknown as { setLineDashPattern?: unknown }).setLineDashPattern !== 'function') {
    return;
  }

  const normalizedPattern = pattern.filter((value) => isFiniteNumber(value) && value > 0);

  try {
    if (normalizedPattern.length > 0) {
      doc.setLineDashPattern(normalizedPattern, 0);
      return;
    }

    doc.setLineDashPattern([], 0);
  } catch {
    // Fallback silencioso para runtimes que rejeitam dash pattern.
  }
}