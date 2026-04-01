"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  defaultPrintLayoutConfig,
  loadPrintLayoutConfig,
  savePrintLayoutConfig,
  type PrintFontFamily,
  type PrintFontStyle,
  type PrintLayoutConfig,
} from "@/services/print-settings";

type FieldKey = "logo" | "companyName" | "phone";
type PreviewMode = "compact" | "detailed";

type PreviewSample = {
  setName: string;
  client: string;
  driver: string;
  plate: string;
  product: string;
  bruto: string;
  tara: string;
  discount: string;
};

type PreviewSetOnly = {
  setName: string;
  product: string;
  bruto: string;
  tara: string;
  discount: string;
};

type PreviewActionEntry = {
  id: number;
  time: string;
  message: string;
};

const PRINT_PREVIEW_HISTORY_STORAGE_KEY = "balanca_print_preview_history_v1";

const normalizePreviewHistory = (value: unknown): PreviewActionEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is PreviewActionEntry => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const maybeEntry = item as Partial<PreviewActionEntry>;
      return (
        typeof maybeEntry.id === "number"
        && typeof maybeEntry.time === "string"
        && typeof maybeEntry.message === "string"
      );
    })
    .slice(0, 8);
};

const fontOptions: Array<{ value: PrintFontFamily; label: string }> = [
  { value: "helvetica", label: "Helvetica" },
  { value: "times", label: "Times" },
  { value: "courier", label: "Courier" },
  { value: "teko", label: "Teko" },
  { value: "square", label: "Square (similar geometrica)" },
];

const styleOptions: Array<{ value: PrintFontStyle; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Negrito" },
];

const tableLineStyleOptions: Array<{
  value: PrintLayoutConfig["tableLines"]["headerSeparatorStyle"];
  label: string;
}> = [
  { value: "solid", label: "Continua" },
  { value: "dotted-fine", label: "Pontilhada fina" },
  { value: "dotted-medium", label: "Pontilhada media" },
  { value: "dotted-wide", label: "Pontilhada larga" },
  { value: "dashed-short", label: "Tracejada curta" },
  { value: "dashed-long", label: "Tracejada longa" },
];

const tableRowHorizontalModeOptions: Array<{
  value: PrintLayoutConfig["tableLines"]["rowHorizontalLineMode"];
  label: string;
}> = [
  { value: "none", label: "Sem linha horizontal" },
  ...tableLineStyleOptions,
];

const lineStyleToBorderStyle = (
  style: PrintLayoutConfig["tableLines"]["headerSeparatorStyle"] | PrintLayoutConfig["tableLines"]["rowHorizontalLineMode"]
): "solid" | "dotted" | "dashed" => {
  if (style === "dashed-short" || style === "dashed-long") {
    return "dashed";
  }

  if (style === "dotted-fine" || style === "dotted-medium" || style === "dotted-wide") {
    return "dotted";
  }

  return "solid";
};

type PrintPresetId = "classic-professional" | "technical-dotted" | "minimal-clean" | "industrial-square" | "layout-josias";

const printPresetOptions: Array<{ value: PrintPresetId; label: string; description: string }> = [
  {
    value: "classic-professional",
    label: "Profissional Classico",
    description: "Grade continua equilibrada e cabecalho destacado.",
  },
  {
    value: "technical-dotted",
    label: "Tecnico Pontilhado",
    description: "Linhas pontilhadas para leitura tecnica mais leve.",
  },
  {
    value: "minimal-clean",
    label: "Minimalista Limpo",
    description: "Sem linhas horizontais e visual limpo.",
  },
  {
    value: "industrial-square",
    label: "Industrial Square",
    description: "Logo com estilo quadrado e tabela industrial.",
  },
  {
    value: "layout-josias",
    label: "Layout Josias",
    description: "Logo Teko ampliado, sem fundo no cabecalho, sem linhas verticais e espacamento compacto.",
  },
];

export function PrintingSettings() {
  const [config, setConfig] = useState<PrintLayoutConfig>(defaultPrintLayoutConfig);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("detailed");
  const [showSecondSetPreview, setShowSecondSetPreview] = useState(false);
  const [safePresetApplied, setSafePresetApplied] = useState(false);
  const [historyActionFeedback, setHistoryActionFeedback] = useState<{
    kind: "success" | "warning" | "error";
    message: string;
  } | null>(null);
  const [previewHistory, setPreviewHistory] = useState<PreviewActionEntry[]>([]);
  const [isHistoryHydrated, setIsHistoryHydrated] = useState(false);
  const historyImportInputRef = useRef<HTMLInputElement | null>(null);
  const [previewSample, setPreviewSample] = useState<PreviewSample>({
    setName: "CACAMBA 1",
    client: "CLIENTE TESTE",
    driver: "JOSE",
    plate: "ABC1D23",
    product: "SUCATA TESTE",
    bruto: "1000.00",
    tara: "300.00",
    discount: "20.00",
  });
  const [previewSecondSet, setPreviewSecondSet] = useState<PreviewSetOnly>({
    setName: "CACAMBA 2",
    product: "FERRO MISTO",
    bruto: "950.00",
    tara: "280.00",
    discount: "15.00",
  });

  const previewNow = useMemo(() => {
    const now = new Date();
    return `${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR")}`;
  }, []);

  useEffect(() => {
    setConfig(loadPrintLayoutConfig());
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PRINT_PREVIEW_HISTORY_STORAGE_KEY);
      if (!raw) {
        setIsHistoryHydrated(true);
        return;
      }

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setIsHistoryHydrated(true);
        return;
      }

      setPreviewHistory(normalizePreviewHistory(parsed));
    } catch {
      setPreviewHistory([]);
    } finally {
      setIsHistoryHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHistoryHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(PRINT_PREVIEW_HISTORY_STORAGE_KEY, JSON.stringify(previewHistory));
    } catch {
      // ignore storage write errors in restricted environments
    }
  }, [isHistoryHydrated, previewHistory]);

  useEffect(() => {
    if (!safePresetApplied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSafePresetApplied(false);
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [safePresetApplied]);

  useEffect(() => {
    if (!historyActionFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHistoryActionFeedback(null);
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [historyActionFeedback]);

  const updateConfig = (next: PrintLayoutConfig) => {
    setConfig(next);
    savePrintLayoutConfig(next);
  };

  const updateFieldText = (field: FieldKey, text: string) => {
    updateConfig({ ...config, [field]: { ...config[field], text } });
  };

  const updateFieldFontFamily = (field: FieldKey, fontFamily: PrintFontFamily) => {
    updateConfig({ ...config, [field]: { ...config[field], fontFamily } });
  };

  const updateFieldFontStyle = (field: FieldKey, fontStyle: PrintFontStyle) => {
    updateConfig({ ...config, [field]: { ...config[field], fontStyle } });
  };

  const updateFieldFontSize = (field: FieldKey, fontSize: string) => {
    const parsed = Number.parseInt(fontSize, 10);
    updateConfig({
      ...config,
      [field]: {
        ...config[field],
        fontSize: Number.isNaN(parsed) ? config[field].fontSize : parsed,
      },
    });
  };

  const updateAddress = (partial: Partial<PrintLayoutConfig["address"]>) => {
    updateConfig({ ...config, address: { ...config.address, ...partial } });
  };

  const updateTableHeader = (partial: Partial<PrintLayoutConfig["tableHeader"]>) => {
    updateConfig({ ...config, tableHeader: { ...config.tableHeader, ...partial } });
  };

  const updateTableLines = (partial: Partial<PrintLayoutConfig["tableLines"]>) => {
    updateConfig({ ...config, tableLines: { ...config.tableLines, ...partial } });
  };

  const updateInfoRow = (partial: Partial<PrintLayoutConfig["infoRow"]>) => {
    updateConfig({ ...config, infoRow: { ...config.infoRow, ...partial } });
  };

  const updateSetTitle = (partial: Partial<PrintLayoutConfig["setTitle"]>) => {
    updateConfig({ ...config, setTitle: { ...config.setTitle, ...partial } });
  };

  const updateSetSummary = (partial: Partial<PrintLayoutConfig["setSummary"]>) => {
    updateConfig({ ...config, setSummary: { ...config.setSummary, ...partial } });
  };

  const updateGrandTotal = (partial: Partial<PrintLayoutConfig["grandTotal"]>) => {
    updateConfig({ ...config, grandTotal: { ...config.grandTotal, ...partial } });
  };

  const buildBasePresetConfig = (): PrintLayoutConfig => ({
    ...defaultPrintLayoutConfig,
    logo: { ...defaultPrintLayoutConfig.logo },
    companyName: { ...defaultPrintLayoutConfig.companyName },
    phone: { ...defaultPrintLayoutConfig.phone },
    address: { ...defaultPrintLayoutConfig.address },
    tableHeader: { ...defaultPrintLayoutConfig.tableHeader },
    tableLines: { ...defaultPrintLayoutConfig.tableLines },
    infoRow: { ...defaultPrintLayoutConfig.infoRow },
    setTitle: { ...defaultPrintLayoutConfig.setTitle },
    setSummary: { ...defaultPrintLayoutConfig.setSummary },
    grandTotal: { ...defaultPrintLayoutConfig.grandTotal },
  });

  const applyPrintPreset = (presetId: PrintPresetId) => {
    const base = buildBasePresetConfig();

    let next: PrintLayoutConfig = base;

    if (presetId === "classic-professional") {
      next = {
        ...base,
        tableHeader: {
          ...base.tableHeader,
          showBackground: true,
          backgroundColor: "#DCDCDC",
          textColor: "#000000",
        },
        tableLines: {
          ...base.tableLines,
          lineColor: "#000000",
          headerSeparatorEnabled: true,
          headerSeparatorStyle: "solid",
          headerSeparatorWidth: 0.6,
          rowHorizontalLineMode: "solid",
          rowHorizontalLineWidth: 0.35,
          showVerticalLines: true,
          verticalLineStyle: "solid",
          verticalLineWidth: 0.3,
        },
      };
    }

    if (presetId === "technical-dotted") {
      next = {
        ...base,
        tableHeader: {
          ...base.tableHeader,
          showBackground: false,
          textColor: "#111111",
        },
        tableLines: {
          ...base.tableLines,
          lineColor: "#111111",
          headerSeparatorEnabled: true,
          headerSeparatorStyle: "dashed-short",
          headerSeparatorWidth: 0.5,
          rowHorizontalLineMode: "dotted-medium",
          rowHorizontalLineWidth: 0.35,
          showVerticalLines: true,
          verticalLineStyle: "dotted-fine",
          verticalLineWidth: 0.25,
        },
      };
    }

    if (presetId === "minimal-clean") {
      next = {
        ...base,
        tableHeader: {
          ...base.tableHeader,
          showBackground: false,
          textColor: "#000000",
        },
        tableLines: {
          ...base.tableLines,
          lineColor: "#000000",
          headerSeparatorEnabled: true,
          headerSeparatorStyle: "solid",
          headerSeparatorWidth: 0.45,
          rowHorizontalLineMode: "none",
          rowHorizontalLineWidth: 0.3,
          showVerticalLines: false,
          verticalLineStyle: "solid",
          verticalLineWidth: 0.3,
        },
      };
    }

    if (presetId === "industrial-square") {
      next = {
        ...base,
        logo: {
          ...base.logo,
          fontFamily: "square",
          fontStyle: "bold",
        },
        companyName: {
          ...base.companyName,
          fontFamily: "square",
          fontStyle: "bold",
        },
        tableHeader: {
          ...base.tableHeader,
          showBackground: true,
          backgroundColor: "#E2E8F0",
          textColor: "#111827",
        },
        tableLines: {
          ...base.tableLines,
          lineColor: "#111827",
          headerSeparatorEnabled: true,
          headerSeparatorStyle: "dashed-long",
          headerSeparatorWidth: 0.65,
          rowHorizontalLineMode: "dashed-short",
          rowHorizontalLineWidth: 0.35,
          showVerticalLines: true,
          verticalLineStyle: "solid",
          verticalLineWidth: 0.35,
        },
      };
    }

    if (presetId === "layout-josias") {
      next = {
        ...base,
        logo: {
          ...base.logo,
          text: "PS INOX",
          fontFamily: "teko",
          fontStyle: "bold",
          fontSize: base.logo.fontSize * 2,
        },
        address: {
          ...base.address,
          street: "Rua Otorino Ravagnani, 600",
          district: "Aeroporto",
          city: "Batatais/SP",
        },
        tableHeader: {
          ...base.tableHeader,
          showBackground: false,
          textColor: "#000000",
        },
        tableLines: {
          ...base.tableLines,
          lineColor: "#000000",
          headerSeparatorEnabled: true,
          headerSeparatorStyle: "solid",
          headerSeparatorWidth: 0.5,
          rowCellPadding: 0.6,
          rowHorizontalLineMode: "solid",
          rowHorizontalLineWidth: 0.3,
          showVerticalLines: false,
          verticalLineStyle: "solid",
          verticalLineWidth: 0.3,
        },
        setTitle: {
          ...base.setTitle,
          topSpacingFirstSet: 0,
          topSpacingNextSets: 0,
          bottomSpacing: 3,
        },
        setSummary: {
          ...base.setSummary,
          discountTopSpacing: 3,
          totalTopSpacing: 3,
          sectionBottomSpacing: 1,
        },
        grandTotal: {
          ...base.grandTotal,
          topSpacing: 0,
          textTopSpacing: 3,
        },
      };
    }

    updateConfig(next);

    const selected = printPresetOptions.find((item) => item.value === presetId);
    appendPreviewHistory(`Preset aplicado: ${selected?.label || presetId}.`);
    setHistoryActionFeedback({ kind: "success", message: `Preset ${selected?.label || presetId} aplicado` });
  };

  const getPreviewFontFamily = (fontFamily: PrintFontFamily): string => {
    if (fontFamily === "square") {
      return "'Orbitron', 'Rajdhani', 'Eurostile', 'Bank Gothic', 'OCR A Std', 'Courier New', monospace";
    }

    if (fontFamily === "teko") {
      return "'Teko', 'Arial Narrow', sans-serif";
    }

    return fontFamily;
  };

  const getPreviewLetterSpacing = (fontFamily: PrintFontFamily, field: "logo" | "companyName"): string | undefined => {
    if (fontFamily !== "teko") return undefined;
    return field === "logo" ? "0.08em" : "0.05em";
  };

  const previewSetTitleAlign = config.setTitle.align;
  const previewSetTitleTextAlign = previewSetTitleAlign === "left" ? "left" : previewSetTitleAlign === "right" ? "right" : "center";
  const previewBruto = Number.parseFloat(previewSample.bruto) || 0;
  const previewTara = Number.parseFloat(previewSample.tara) || 0;
  const previewDiscount = Number.parseFloat(previewSample.discount) || 0;
  const previewLiquido = Math.max(previewBruto - previewTara - previewDiscount, 0);
  const previewSecondBruto = Number.parseFloat(previewSecondSet.bruto) || 0;
  const previewSecondTara = Number.parseFloat(previewSecondSet.tara) || 0;
  const previewSecondDiscount = Number.parseFloat(previewSecondSet.discount) || 0;
  const previewSecondLiquido = Math.max(previewSecondBruto - previewSecondTara - previewSecondDiscount, 0);
  const previewGrandLiquido = previewLiquido + (showSecondSetPreview ? previewSecondLiquido : 0);

  const previewHeaderSeparatorBorderStyle = lineStyleToBorderStyle(config.tableLines.headerSeparatorStyle);
  const previewHorizontalBorderStyle =
    config.tableLines.rowHorizontalLineMode === "none"
      ? "solid"
      : lineStyleToBorderStyle(config.tableLines.rowHorizontalLineMode);
  const previewVerticalBorderStyle = lineStyleToBorderStyle(config.tableLines.verticalLineStyle);

  const previewHeaderRowStyle = {
    backgroundColor: config.tableHeader.showBackground ? config.tableHeader.backgroundColor : "transparent",
    color: config.tableHeader.textColor,
  };

  const previewHeaderCellStyle = {
    borderTop: `${config.tableLines.showVerticalLines ? config.tableLines.verticalLineWidth : 0}px ${previewVerticalBorderStyle} ${config.tableLines.lineColor}`,
    borderLeft: `${config.tableLines.showVerticalLines ? config.tableLines.verticalLineWidth : 0}px ${previewVerticalBorderStyle} ${config.tableLines.lineColor}`,
    borderRight: `${config.tableLines.showVerticalLines ? config.tableLines.verticalLineWidth : 0}px ${previewVerticalBorderStyle} ${config.tableLines.lineColor}`,
    borderBottom: config.tableLines.headerSeparatorEnabled
      ? `${config.tableLines.headerSeparatorWidth}px ${previewHeaderSeparatorBorderStyle} ${config.tableLines.lineColor}`
      : "0px solid transparent",
  };

  const previewBodyCellStyle = {
    borderLeft: `${config.tableLines.showVerticalLines ? config.tableLines.verticalLineWidth : 0}px ${previewVerticalBorderStyle} ${config.tableLines.lineColor}`,
    borderRight: `${config.tableLines.showVerticalLines ? config.tableLines.verticalLineWidth : 0}px ${previewVerticalBorderStyle} ${config.tableLines.lineColor}`,
    borderBottom:
      config.tableLines.rowHorizontalLineMode === "none"
        ? "0px solid transparent"
        : `${config.tableLines.rowHorizontalLineWidth}px ${previewHorizontalBorderStyle} ${config.tableLines.lineColor}`,
  };

  const overlapRisk = useMemo(() => {
    let score = 0;
    const reasons: string[] = [];

    if (config.logo.fontSize >= 24 || config.companyName.fontSize >= 18) {
      score += 2;
      reasons.push("Fontes grandes no cabecalho.");
    }

    if (config.infoRow.fontSize >= 14) {
      score += 1;
      reasons.push("Linha Cliente/Motorista/Placa com fonte alta.");
    }

    if (config.setTitle.fontSize >= 16) {
      score += 1;
      reasons.push("Titulo da cacamba com fonte alta.");
    }

    if (config.setTitle.bottomSpacing <= 1 || config.setSummary.totalTopSpacing <= 0.5) {
      score += 2;
      reasons.push("Espacamentos curtos entre blocos.");
    }

    if (config.grandTotal.textTopSpacing <= 0.5) {
      score += 1;
      reasons.push("Pouco espaco antes do total final.");
    }

    if (showSecondSetPreview && previewMode === "detailed") {
      score += 2;
      reasons.push("Duas cacambas na previa detalhada.");
    }

    if (showSecondSetPreview && config.setTitle.topSpacingNextSets <= 1) {
      score += 1;
      reasons.push("Pouco espaco entre cacambas.");
    }

    const level = score >= 6 ? "alto" : score >= 3 ? "medio" : "baixo";
    return { level, reasons };
  }, [
    config.companyName.fontSize,
    config.grandTotal.textTopSpacing,
    config.infoRow.fontSize,
    config.logo.fontSize,
    config.setSummary.totalTopSpacing,
    config.setTitle.bottomSpacing,
    config.setTitle.fontSize,
    config.setTitle.topSpacingNextSets,
    previewMode,
    showSecondSetPreview,
  ]);

  const updatePreviewSample = (partial: Partial<PreviewSample>) => {
    setPreviewSample((prev) => ({ ...prev, ...partial }));
  };

  const updatePreviewSecondSet = (partial: Partial<PreviewSetOnly>) => {
    setPreviewSecondSet((prev) => ({ ...prev, ...partial }));
  };

  const appendPreviewHistory = (message: string) => {
    setPreviewHistory((prev) => {
      const entry: PreviewActionEntry = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        time: new Date().toLocaleTimeString("pt-BR"),
        message,
      };

      return [entry, ...prev].slice(0, 8);
    });
  };

  const handlePreviewModeChange = (mode: PreviewMode) => {
    setPreviewMode(mode);
    appendPreviewHistory(`Modo da previa alterado para ${mode === "detailed" ? "detalhada" : "compacta"}.`);
  };

  const handleToggleSecondSetPreview = (checked: boolean) => {
    setShowSecondSetPreview(checked);
    appendPreviewHistory(checked ? "Simulacao da 2a cacamba ativada." : "Simulacao da 2a cacamba desativada.");
  };

  const handleExportPreviewHistory = () => {
    if (previewHistory.length === 0) {
      return;
    }

    const payload = JSON.stringify(previewHistory, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "balanca-print-preview-history.json";
    anchor.click();
    window.URL.revokeObjectURL(url);

    appendPreviewHistory("Historico exportado em JSON.");
    setHistoryActionFeedback({ kind: "success", message: "Exportado com sucesso" });
  };

  const handleCopyPreviewHistory = async () => {
    if (previewHistory.length === 0) {
      return;
    }

    const payload = JSON.stringify(previewHistory, null, 2);

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(payload);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = payload;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error("copy_failed");
        }
      }

      appendPreviewHistory("Historico copiado para area de transferencia.");
      setHistoryActionFeedback({ kind: "success", message: "Copiado para area de transferencia" });
    } catch {
      setHistoryActionFeedback({ kind: "error", message: "Falha ao copiar JSON" });
    }
  };

  const handleImportPreviewHistory = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const parsed: unknown = JSON.parse(raw);
      const normalized = normalizePreviewHistory(parsed);

      if (normalized.length === 0) {
        appendPreviewHistory("Importacao ignorada: arquivo sem entradas validas.");
        setHistoryActionFeedback({ kind: "warning", message: "Arquivo sem entradas validas" });
        event.target.value = "";
        return;
      }

      const importedEntry: PreviewActionEntry = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        time: new Date().toLocaleTimeString("pt-BR"),
        message: "Historico importado de JSON.",
      };

      setPreviewHistory([importedEntry, ...normalized].slice(0, 8));
      setHistoryActionFeedback({ kind: "success", message: "Importado com sucesso" });
    } catch {
      appendPreviewHistory("Importacao falhou: JSON invalido.");
      setHistoryActionFeedback({ kind: "error", message: "Falha na importacao (JSON invalido)" });
    } finally {
      event.target.value = "";
    }
  };

  const applySafeSpacingPreset = () => {
    const next: PrintLayoutConfig = {
      ...config,
      setTitle: {
        ...config.setTitle,
        topSpacingFirstSet: Math.max(config.setTitle.topSpacingFirstSet, 3),
        topSpacingNextSets: Math.max(config.setTitle.topSpacingNextSets, 3),
        bottomSpacing: Math.max(config.setTitle.bottomSpacing, 2),
      },
      setSummary: {
        ...config.setSummary,
        discountTopSpacing: Math.max(config.setSummary.discountTopSpacing, 2),
        totalTopSpacing: Math.max(config.setSummary.totalTopSpacing, 2),
        sectionBottomSpacing: Math.max(config.setSummary.sectionBottomSpacing, 3),
      },
      grandTotal: {
        ...config.grandTotal,
        topSpacing: Math.max(config.grandTotal.topSpacing, 2),
        textTopSpacing: Math.max(config.grandTotal.textTopSpacing, 2),
      },
    };

    updateConfig(next);
    setSafePresetApplied(true);
    appendPreviewHistory("Preset seguro de espacamento aplicado.");
  };

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Impressao</DialogTitle>
        <DialogDescription>
          Edite o cabecalho do comprovante por ordem real de impressao. As alteracoes sao salvas automaticamente.
        </DialogDescription>
      </DialogHeader>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <Label className="font-bold text-base">Presets rapidos (aplicar antes de editar)</Label>
        <p className="text-xs text-muted-foreground">
          Escolha um estilo pronto para iniciar, depois refine os detalhes nos campos abaixo.
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {printPresetOptions.map((preset) => (
            <Button
              key={preset.value}
              type="button"
              variant="outline"
              className="h-auto items-start justify-start whitespace-normal py-3 text-left"
              onClick={() => applyPrintPreset(preset.value)}
            >
              <span className="font-semibold">{preset.label}</span>
              <span className="text-xs text-muted-foreground">{preset.description}</span>
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border p-4">
        <Label className="font-bold text-base">Cabecalho do Ticket</Label>

        <div className="space-y-2">
          <Label>Logo (texto)</Label>
          <Input value={config.logo.text} onChange={(e) => updateFieldText("logo", e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Fonte do logo</Label>
            <Select value={config.logo.fontFamily} onValueChange={(value) => updateFieldFontFamily("logo", value as PrintFontFamily)}>
              <SelectTrigger>
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estilo do logo</Label>
            <Select value={config.logo.fontStyle} onValueChange={(value) => updateFieldFontStyle("logo", value as PrintFontStyle)}>
              <SelectTrigger>
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tamanho do logo</Label>
            <Input type="number" min={8} max={48} value={config.logo.fontSize} onChange={(e) => updateFieldFontSize("logo", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Razao social</Label>
          <Input value={config.companyName.text} onChange={(e) => updateFieldText("companyName", e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Fonte da razao</Label>
            <Select
              value={config.companyName.fontFamily}
              onValueChange={(value) => updateFieldFontFamily("companyName", value as PrintFontFamily)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estilo da razao</Label>
            <Select
              value={config.companyName.fontStyle}
              onValueChange={(value) => updateFieldFontStyle("companyName", value as PrintFontStyle)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tamanho da razao</Label>
            <Input
              type="number"
              min={8}
              max={48}
              value={config.companyName.fontSize}
              onChange={(e) => updateFieldFontSize("companyName", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Fone</Label>
          <Input value={config.phone.text} onChange={(e) => updateFieldText("phone", e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Fonte do fone</Label>
            <Select value={config.phone.fontFamily} onValueChange={(value) => updateFieldFontFamily("phone", value as PrintFontFamily)}>
              <SelectTrigger>
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estilo do fone</Label>
            <Select value={config.phone.fontStyle} onValueChange={(value) => updateFieldFontStyle("phone", value as PrintFontStyle)}>
              <SelectTrigger>
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tamanho do fone</Label>
            <Input type="number" min={8} max={48} value={config.phone.fontSize} onChange={(e) => updateFieldFontSize("phone", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label className="font-semibold">Endereco (linha abaixo da razao)</Label>
          <p className="text-xs text-muted-foreground">
            Rua fica a esquerda, bairro centralizado e cidade alinhada a direita no PDF.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Rua</Label>
            <Input value={config.address.street} onChange={(e) => updateAddress({ street: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input value={config.address.district} onChange={(e) => updateAddress({ district: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={config.address.city} onChange={(e) => updateAddress({ city: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Fonte do endereco</Label>
            <Select
              value={config.address.fontFamily}
              onValueChange={(value) => updateAddress({ fontFamily: value as PrintFontFamily })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estilo do endereco</Label>
            <Select
              value={config.address.fontStyle}
              onValueChange={(value) => updateAddress({ fontStyle: value as PrintFontStyle })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tamanho do endereco</Label>
            <Input
              type="number"
              min={8}
              max={48}
              value={config.address.fontSize}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                updateAddress({ fontSize: Number.isNaN(parsed) ? config.address.fontSize : parsed });
              }}
            />
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label className="font-semibold">Cabecalho da tabela de itens</Label>
          <p className="text-xs text-muted-foreground">
            Edite os titulos da linha Produto/Bruto/Tara/Desc/Liquido e o estilo visual de fundo do cabecalho.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="space-y-2">
            <Label>Produto</Label>
            <Input value={config.tableHeader.productLabel} onChange={(e) => updateTableHeader({ productLabel: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Bruto</Label>
            <Input value={config.tableHeader.brutoLabel} onChange={(e) => updateTableHeader({ brutoLabel: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tara</Label>
            <Input value={config.tableHeader.taraLabel} onChange={(e) => updateTableHeader({ taraLabel: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Desc</Label>
            <Input value={config.tableHeader.descLabel} onChange={(e) => updateTableHeader({ descLabel: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Liquido</Label>
            <Input value={config.tableHeader.liquidoLabel} onChange={(e) => updateTableHeader({ liquidoLabel: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.tableHeader.showBackground}
                onChange={(e) => updateTableHeader({ showBackground: e.target.checked })}
              />
              Exibir fundo no cabecalho
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Cor de fundo</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={config.tableHeader.backgroundColor}
                onChange={(e) => updateTableHeader({ backgroundColor: e.target.value })}
                className="h-10 w-10 p-1"
                disabled={!config.tableHeader.showBackground}
              />
              <span className="text-xs text-muted-foreground">{config.tableHeader.backgroundColor}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor do texto</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={config.tableHeader.textColor}
                onChange={(e) => updateTableHeader({ textColor: e.target.value })}
                className="h-10 w-10 p-1"
              />
              <span className="text-xs text-muted-foreground">{config.tableHeader.textColor}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label className="font-semibold">Linhas da tabela (cabecalho e materiais)</Label>
          <p className="text-xs text-muted-foreground">
            Controle separador entre cabecalho e itens, estilo das linhas horizontais e linhas verticais da tabela.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Cor das linhas</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={config.tableLines.lineColor}
                onChange={(e) => updateTableLines({ lineColor: e.target.value })}
                className="h-10 w-10 p-1"
              />
              <span className="text-xs text-muted-foreground">{config.tableLines.lineColor}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.tableLines.headerSeparatorEnabled}
                onChange={(e) => updateTableLines({ headerSeparatorEnabled: e.target.checked })}
              />
              Exibir separador apos cabecalho
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Estilo do separador</Label>
            <Select
              value={config.tableLines.headerSeparatorStyle}
              onValueChange={(value) => updateTableLines({ headerSeparatorStyle: value as PrintLayoutConfig["tableLines"]["headerSeparatorStyle"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {tableLineStyleOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Espessura do separador</Label>
            <Input
              type="number"
              min={0.1}
              max={3}
              step={0.1}
              value={config.tableLines.headerSeparatorWidth}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateTableLines({
                  headerSeparatorWidth: Number.isNaN(parsed) ? config.tableLines.headerSeparatorWidth : parsed,
                });
              }}
              disabled={!config.tableLines.headerSeparatorEnabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Linha horizontal dos materiais</Label>
            <Select
              value={config.tableLines.rowHorizontalLineMode}
              onValueChange={(value) => updateTableLines({ rowHorizontalLineMode: value as PrintLayoutConfig["tableLines"]["rowHorizontalLineMode"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {tableRowHorizontalModeOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Espessura horizontal</Label>
            <Input
              type="number"
              min={0.1}
              max={3}
              step={0.1}
              value={config.tableLines.rowHorizontalLineWidth}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateTableLines({
                  rowHorizontalLineWidth: Number.isNaN(parsed) ? config.tableLines.rowHorizontalLineWidth : parsed,
                });
              }}
              disabled={config.tableLines.rowHorizontalLineMode === "none"}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.tableLines.showVerticalLines}
                onChange={(e) => updateTableLines({ showVerticalLines: e.target.checked })}
              />
              Exibir linhas verticais
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Estilo das linhas verticais</Label>
            <Select
              value={config.tableLines.verticalLineStyle}
              onValueChange={(value) => updateTableLines({ verticalLineStyle: value as PrintLayoutConfig["tableLines"]["verticalLineStyle"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {tableLineStyleOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Espessura vertical</Label>
            <Input
              type="number"
              min={0.1}
              max={3}
              step={0.1}
              value={config.tableLines.verticalLineWidth}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateTableLines({
                  verticalLineWidth: Number.isNaN(parsed) ? config.tableLines.verticalLineWidth : parsed,
                });
              }}
              disabled={!config.tableLines.showVerticalLines}
            />
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label className="font-semibold">Linha Cliente / Motorista / Placa</Label>
          <p className="text-xs text-muted-foreground">
            Configure os rotulos, fonte e espacamento horizontal desta linha no comprovante.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Rotulo Cliente</Label>
            <Input value={config.infoRow.clientLabel} onChange={(e) => updateInfoRow({ clientLabel: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Rotulo Motorista</Label>
            <Input value={config.infoRow.driverLabel} onChange={(e) => updateInfoRow({ driverLabel: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Rotulo Placa</Label>
            <Input value={config.infoRow.plateLabel} onChange={(e) => updateInfoRow({ plateLabel: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Fonte da linha</Label>
            <Select
              value={config.infoRow.fontFamily}
              onValueChange={(value) => updateInfoRow({ fontFamily: value as PrintFontFamily })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estilo da linha</Label>
            <Select
              value={config.infoRow.fontStyle}
              onValueChange={(value) => updateInfoRow({ fontStyle: value as PrintFontStyle })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tamanho da linha</Label>
            <Input
              type="number"
              min={8}
              max={48}
              value={config.infoRow.fontSize}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                updateInfoRow({ fontSize: Number.isNaN(parsed) ? config.infoRow.fontSize : parsed });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Espacamento horizontal</Label>
            <Input
              type="number"
              min={0}
              max={12}
              step={0.5}
              value={config.infoRow.horizontalGap}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateInfoRow({ horizontalGap: Number.isNaN(parsed) ? config.infoRow.horizontalGap : parsed });
              }}
            />
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label className="font-semibold">Titulo da Cacamba no PDF</Label>
          <p className="text-xs text-muted-foreground">
            Ajuste fonte, alinhamento e espacamentos do titulo de cada cacamba sem sobrepor a tabela.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Fonte do titulo</Label>
            <Select
              value={config.setTitle.fontFamily}
              onValueChange={(value) => updateSetTitle({ fontFamily: value as PrintFontFamily })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estilo do titulo</Label>
            <Select
              value={config.setTitle.fontStyle}
              onValueChange={(value) => updateSetTitle({ fontStyle: value as PrintFontStyle })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tamanho do titulo</Label>
            <Input
              type="number"
              min={8}
              max={48}
              value={config.setTitle.fontSize}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                updateSetTitle({ fontSize: Number.isNaN(parsed) ? config.setTitle.fontSize : parsed });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Alinhamento</Label>
            <Select
              value={config.setTitle.align}
              onValueChange={(value) => updateSetTitle({ align: value as PrintLayoutConfig["setTitle"]["align"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alinhamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Direita</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Espaco antes da 1a cacamba</Label>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={config.setTitle.topSpacingFirstSet}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateSetTitle({ topSpacingFirstSet: Number.isNaN(parsed) ? config.setTitle.topSpacingFirstSet : parsed });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Espaco entre cacambas</Label>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={config.setTitle.topSpacingNextSets}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateSetTitle({ topSpacingNextSets: Number.isNaN(parsed) ? config.setTitle.topSpacingNextSets : parsed });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Espaco abaixo do titulo</Label>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={config.setTitle.bottomSpacing}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateSetTitle({ bottomSpacing: Number.isNaN(parsed) ? config.setTitle.bottomSpacing : parsed });
              }}
            />
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label className="font-semibold">Rodape por Cacamba (Desconto e Total)</Label>
          <p className="text-xs text-muted-foreground">
            Ajuste os textos e espacamentos das linhas finais de cada cacamba no comprovante.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Rotulo de desconto</Label>
            <Input
              value={config.setSummary.discountLabel}
              onChange={(e) => updateSetSummary({ discountLabel: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Rotulo de total</Label>
            <Input
              value={config.setSummary.totalLabel}
              onChange={(e) => updateSetSummary({ totalLabel: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Fonte do rodape</Label>
            <Select
              value={config.setSummary.fontFamily}
              onValueChange={(value) => updateSetSummary({ fontFamily: value as PrintFontFamily })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estilo do rodape</Label>
            <Select
              value={config.setSummary.fontStyle}
              onValueChange={(value) => updateSetSummary({ fontStyle: value as PrintFontStyle })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tamanho do rodape</Label>
            <Input
              type="number"
              min={8}
              max={48}
              value={config.setSummary.fontSize}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                updateSetSummary({ fontSize: Number.isNaN(parsed) ? config.setSummary.fontSize : parsed });
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Espaco antes do desconto</Label>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={config.setSummary.discountTopSpacing}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateSetSummary({ discountTopSpacing: Number.isNaN(parsed) ? config.setSummary.discountTopSpacing : parsed });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Espaco antes do total</Label>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={config.setSummary.totalTopSpacing}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateSetSummary({ totalTopSpacing: Number.isNaN(parsed) ? config.setSummary.totalTopSpacing : parsed });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Espaco apos o rodape</Label>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={config.setSummary.sectionBottomSpacing}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateSetSummary({ sectionBottomSpacing: Number.isNaN(parsed) ? config.setSummary.sectionBottomSpacing : parsed });
              }}
            />
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label className="font-semibold">Bloco final de Peso Liquido Total</Label>
          <p className="text-xs text-muted-foreground">
            Ajuste o rotulo final, tipografia e separador que aparece no fim do comprovante.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Rotulo do total final</Label>
          <Input
            value={config.grandTotal.labelText}
            onChange={(e) => updateGrandTotal({ labelText: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Fonte do rotulo</Label>
            <Select
              value={config.grandTotal.labelFontFamily}
              onValueChange={(value) => updateGrandTotal({ labelFontFamily: value as PrintFontFamily })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estilo do rotulo</Label>
            <Select
              value={config.grandTotal.labelFontStyle}
              onValueChange={(value) => updateGrandTotal({ labelFontStyle: value as PrintFontStyle })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tamanho do rotulo</Label>
            <Input
              type="number"
              min={8}
              max={48}
              value={config.grandTotal.labelFontSize}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                updateGrandTotal({ labelFontSize: Number.isNaN(parsed) ? config.grandTotal.labelFontSize : parsed });
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Fonte do valor</Label>
            <Select
              value={config.grandTotal.valueFontFamily}
              onValueChange={(value) => updateGrandTotal({ valueFontFamily: value as PrintFontFamily })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estilo do valor</Label>
            <Select
              value={config.grandTotal.valueFontStyle}
              onValueChange={(value) => updateGrandTotal({ valueFontStyle: value as PrintFontStyle })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estilo" />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tamanho do valor</Label>
            <Input
              type="number"
              min={8}
              max={48}
              value={config.grandTotal.valueFontSize}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10);
                updateGrandTotal({ valueFontSize: Number.isNaN(parsed) ? config.grandTotal.valueFontSize : parsed });
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.grandTotal.showSeparator}
                onChange={(e) => updateGrandTotal({ showSeparator: e.target.checked })}
              />
              Exibir linha separadora
            </Label>
          </div>
          <div className="space-y-2">
            <Label>Espessura da linha</Label>
            <Input
              type="number"
              min={0}
              max={3}
              step={0.1}
              value={config.grandTotal.separatorLineWidth}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateGrandTotal({ separatorLineWidth: Number.isNaN(parsed) ? config.grandTotal.separatorLineWidth : parsed });
              }}
              disabled={!config.grandTotal.showSeparator}
            />
          </div>
          <div className="space-y-2">
            <Label>Espaco antes da linha</Label>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={config.grandTotal.topSpacing}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateGrandTotal({ topSpacing: Number.isNaN(parsed) ? config.grandTotal.topSpacing : parsed });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Espaco da linha para textos</Label>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={config.grandTotal.textTopSpacing}
              onChange={(e) => {
                const parsed = Number.parseFloat(e.target.value);
                updateGrandTotal({ textTopSpacing: Number.isNaN(parsed) ? config.grandTotal.textTopSpacing : parsed });
              }}
            />
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label className="font-semibold">Pre-visualizacao do ticket</Label>
          <p className="text-xs text-muted-foreground">
            Esta previa e estimada para facilitar ajuste rapido. A geracao final ocorre no PDF.
          </p>
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={previewMode === "detailed" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePreviewModeChange("detailed")}
            >
              Previa detalhada
            </Button>
            <Button
              type="button"
              variant={previewMode === "compact" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePreviewModeChange("compact")}
            >
              Previa compacta
            </Button>
            <Label className="ml-2 flex items-center gap-2 text-sm font-normal">
              <input
                type="checkbox"
                checked={showSecondSetPreview}
                onChange={(e) => handleToggleSecondSetPreview(e.target.checked)}
              />
              Simular 2a cacamba
            </Label>
            <span
              className={
                overlapRisk.level === "alto"
                  ? "rounded-full border border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                  : overlapRisk.level === "medio"
                    ? "rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                    : "rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
              }
            >
              Risco de sobreposicao: {overlapRisk.level}
            </span>
            <Button
              type="button"
              size="sm"
              variant={overlapRisk.level === "alto" ? "destructive" : "outline"}
              onClick={applySafeSpacingPreset}
            >
              Correcao rapida de espacamento
            </Button>
            {safePresetApplied && (
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                Preset aplicado
              </span>
            )}
          </div>

          {overlapRisk.reasons.length > 0 && (
            <div
              className={
                overlapRisk.level === "alto"
                  ? "rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700"
                  : overlapRisk.level === "medio"
                    ? "rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-700"
                    : "rounded-md border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-700"
              }
            >
              <p className="font-semibold">Motivos detectados na previa:</p>
              <ul className="list-disc pl-4">
                {overlapRisk.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-md border border-dashed p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">Historico rapido de acoes</p>
              <div className="flex flex-wrap items-center gap-1 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => historyImportInputRef.current?.click()}
                >
                  Importar JSON
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleCopyPreviewHistory}
                  disabled={previewHistory.length === 0}
                >
                  Copiar JSON
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleExportPreviewHistory}
                  disabled={previewHistory.length === 0}
                >
                  Exportar JSON
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setPreviewHistory([])}
                  disabled={previewHistory.length === 0}
                >
                  Limpar historico
                </Button>
                <input
                  ref={historyImportInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImportPreviewHistory}
                />
              </div>
            </div>
            {historyActionFeedback && (
              <p
                className={
                  historyActionFeedback.kind === "success"
                    ? "mt-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700"
                    : historyActionFeedback.kind === "warning"
                      ? "mt-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700"
                      : "mt-1 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-red-700"
                }
              >
                {historyActionFeedback.message}
              </p>
            )}
            {previewHistory.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma acao registrada nesta sessao.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {previewHistory.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-2">
                    <span>{entry.message}</span>
                    <span className="text-muted-foreground">{entry.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Cacamba</Label>
              <Input value={previewSample.setName} onChange={(e) => updatePreviewSample({ setName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={previewSample.client} onChange={(e) => updatePreviewSample({ client: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Input value={previewSample.driver} onChange={(e) => updatePreviewSample({ driver: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input value={previewSample.plate} onChange={(e) => updatePreviewSample({ plate: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Input value={previewSample.product} onChange={(e) => updatePreviewSample({ product: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Bruto</Label>
              <Input type="number" step="0.01" value={previewSample.bruto} onChange={(e) => updatePreviewSample({ bruto: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tara</Label>
              <Input type="number" step="0.01" value={previewSample.tara} onChange={(e) => updatePreviewSample({ tara: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Desconto</Label>
              <Input
                type="number"
                step="0.01"
                value={previewSample.discount}
                onChange={(e) => updatePreviewSample({ discount: e.target.value })}
              />
            </div>
          </div>

          {showSecondSetPreview && (
            <div className="space-y-3 rounded-md border border-dashed p-3">
              <Label className="font-semibold">Dados da 2a cacamba</Label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <div className="space-y-2">
                  <Label>Cacamba</Label>
                  <Input value={previewSecondSet.setName} onChange={(e) => updatePreviewSecondSet({ setName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <Input value={previewSecondSet.product} onChange={(e) => updatePreviewSecondSet({ product: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Bruto</Label>
                  <Input type="number" step="0.01" value={previewSecondSet.bruto} onChange={(e) => updatePreviewSecondSet({ bruto: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tara</Label>
                  <Input type="number" step="0.01" value={previewSecondSet.tara} onChange={(e) => updatePreviewSecondSet({ tara: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Desconto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={previewSecondSet.discount}
                    onChange={(e) => updatePreviewSecondSet({ discount: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-md border bg-white p-3 text-black">
          <div className="space-y-1 text-center">
            <div
              style={{
                fontFamily: getPreviewFontFamily(config.logo.fontFamily),
                fontSize: `${config.logo.fontSize}px`,
                fontWeight: config.logo.fontStyle === "bold" ? 700 : 400,
                letterSpacing: getPreviewLetterSpacing(config.logo.fontFamily, "logo"),
              }}
            >
              {config.logo.text || "PS INOX"}
            </div>
            <div
              style={{
                fontFamily: getPreviewFontFamily(config.companyName.fontFamily),
                fontSize: `${config.companyName.fontSize}px`,
                fontWeight: config.companyName.fontStyle === "bold" ? 700 : 400,
                letterSpacing: getPreviewLetterSpacing(config.companyName.fontFamily, "companyName"),
              }}
            >
              {config.companyName.text || "PSINOX COMERCIO DE ACO LTDA"}
            </div>
            <div
              style={{
                fontFamily: getPreviewFontFamily(config.phone.fontFamily),
                fontSize: `${config.phone.fontSize}px`,
                fontWeight: config.phone.fontStyle === "bold" ? 700 : 400,
              }}
            >
              {config.phone.text || "Fone: (16) 3761-9564 - Cel: (16) 99788-7055"}
            </div>

            <div
              className="grid grid-cols-3 gap-2 pt-1"
              style={{
                fontFamily: getPreviewFontFamily(config.address.fontFamily),
                fontSize: `${config.address.fontSize}px`,
                fontWeight: config.address.fontStyle === "bold" ? 700 : 400,
              }}
            >
              <div className="text-left">{config.address.street || defaultPrintLayoutConfig.address.street}</div>
              <div className="text-center">{config.address.district || defaultPrintLayoutConfig.address.district}</div>
              <div className="text-right">{config.address.city || defaultPrintLayoutConfig.address.city}</div>
            </div>
          </div>

          <div
            className="grid grid-cols-3 gap-2 pt-2"
            style={{
              fontFamily: getPreviewFontFamily(config.infoRow.fontFamily),
              fontSize: `${config.infoRow.fontSize}px`,
              fontWeight: config.infoRow.fontStyle === "bold" ? 700 : 400,
              columnGap: `${config.infoRow.horizontalGap * 2}px`,
            }}
          >
            <div>{config.infoRow.clientLabel || "Cliente"}: {previewSample.client}</div>
            <div className="text-center">{config.infoRow.driverLabel || "Motorista"}: {previewSample.driver}</div>
            <div className="text-right">{config.infoRow.plateLabel || "Placa"}: {previewSample.plate}</div>
          </div>

          {previewMode === "detailed" ? (
            <>
              <div
                className="pt-2"
                style={{
                  fontFamily: getPreviewFontFamily(config.setTitle.fontFamily),
                  fontSize: `${config.setTitle.fontSize}px`,
                  fontWeight: config.setTitle.fontStyle === "bold" ? 700 : 400,
                  textAlign: previewSetTitleTextAlign,
                  paddingTop: `${config.setTitle.topSpacingFirstSet}px`,
                  paddingBottom: `${config.setTitle.bottomSpacing}px`,
                }}
              >
                {previewSample.setName}
              </div>

              <table
                className="w-full border-collapse text-xs"
                style={{ borderColor: config.tableLines.lineColor }}
              >
                <thead>
                  <tr style={previewHeaderRowStyle}>
                    <th className="px-2 py-1 text-left" style={previewHeaderCellStyle}>{config.tableHeader.productLabel || "Produto"}</th>
                    <th className="px-2 py-1 text-right" style={previewHeaderCellStyle}>{config.tableHeader.brutoLabel || "Bruto"}</th>
                    <th className="px-2 py-1 text-right" style={previewHeaderCellStyle}>{config.tableHeader.taraLabel || "Tara"}</th>
                    <th className="px-2 py-1 text-right" style={previewHeaderCellStyle}>{config.tableHeader.descLabel || "Desc"}</th>
                    <th className="px-2 py-1 text-right" style={previewHeaderCellStyle}>{config.tableHeader.liquidoLabel || "Liquido"}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-1 text-left" style={previewBodyCellStyle}>{previewSample.product}</td>
                    <td className="px-2 py-1 text-right" style={previewBodyCellStyle}>{previewBruto.toFixed(2)}</td>
                    <td className="px-2 py-1 text-right" style={previewBodyCellStyle}>{previewTara.toFixed(2)}</td>
                    <td className="px-2 py-1 text-right" style={previewBodyCellStyle}>{previewDiscount.toFixed(2)}</td>
                    <td className="px-2 py-1 text-right" style={previewBodyCellStyle}>{previewLiquido.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div
                className="text-right"
                style={{
                  fontFamily: getPreviewFontFamily(config.setSummary.fontFamily),
                  fontSize: `${config.setSummary.fontSize}px`,
                  fontWeight: config.setSummary.fontStyle === "bold" ? 700 : 400,
                  paddingTop: `${config.setSummary.discountTopSpacing}px`,
                }}
              >
                {config.setSummary.discountLabel || "Desconto Cacamba"}: -{previewDiscount.toFixed(2)} kg
              </div>
              <div
                className="text-right"
                style={{
                  fontFamily: getPreviewFontFamily(config.setSummary.fontFamily),
                  fontSize: `${config.setSummary.fontSize}px`,
                  fontWeight: config.setSummary.fontStyle === "bold" ? 700 : 400,
                  paddingTop: `${config.setSummary.totalTopSpacing}px`,
                  paddingBottom: `${config.setSummary.sectionBottomSpacing}px`,
                }}
              >
                {config.setSummary.totalLabel || "Total Cacamba"}: {previewLiquido.toFixed(2)} kg
              </div>

              {showSecondSetPreview && (
                <>
                  <div
                    className="pt-2"
                    style={{
                      fontFamily: getPreviewFontFamily(config.setTitle.fontFamily),
                      fontSize: `${config.setTitle.fontSize}px`,
                      fontWeight: config.setTitle.fontStyle === "bold" ? 700 : 400,
                      textAlign: previewSetTitleTextAlign,
                      paddingTop: `${config.setTitle.topSpacingNextSets}px`,
                      paddingBottom: `${config.setTitle.bottomSpacing}px`,
                    }}
                  >
                    {previewSecondSet.setName}
                  </div>

                  <table
                    className="w-full border-collapse text-xs"
                    style={{ borderColor: config.tableLines.lineColor }}
                  >
                    <thead>
                      <tr style={previewHeaderRowStyle}>
                        <th className="px-2 py-1 text-left" style={previewHeaderCellStyle}>{config.tableHeader.productLabel || "Produto"}</th>
                        <th className="px-2 py-1 text-right" style={previewHeaderCellStyle}>{config.tableHeader.brutoLabel || "Bruto"}</th>
                        <th className="px-2 py-1 text-right" style={previewHeaderCellStyle}>{config.tableHeader.taraLabel || "Tara"}</th>
                        <th className="px-2 py-1 text-right" style={previewHeaderCellStyle}>{config.tableHeader.descLabel || "Desc"}</th>
                        <th className="px-2 py-1 text-right" style={previewHeaderCellStyle}>{config.tableHeader.liquidoLabel || "Liquido"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-2 py-1 text-left" style={previewBodyCellStyle}>{previewSecondSet.product}</td>
                        <td className="px-2 py-1 text-right" style={previewBodyCellStyle}>{previewSecondBruto.toFixed(2)}</td>
                        <td className="px-2 py-1 text-right" style={previewBodyCellStyle}>{previewSecondTara.toFixed(2)}</td>
                        <td className="px-2 py-1 text-right" style={previewBodyCellStyle}>{previewSecondDiscount.toFixed(2)}</td>
                        <td className="px-2 py-1 text-right" style={previewBodyCellStyle}>{previewSecondLiquido.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div
                    className="text-right"
                    style={{
                      fontFamily: getPreviewFontFamily(config.setSummary.fontFamily),
                      fontSize: `${config.setSummary.fontSize}px`,
                      fontWeight: config.setSummary.fontStyle === "bold" ? 700 : 400,
                      paddingTop: `${config.setSummary.discountTopSpacing}px`,
                    }}
                  >
                    {config.setSummary.discountLabel || "Desconto Cacamba"}: -{previewSecondDiscount.toFixed(2)} kg
                  </div>
                  <div
                    className="text-right"
                    style={{
                      fontFamily: getPreviewFontFamily(config.setSummary.fontFamily),
                      fontSize: `${config.setSummary.fontSize}px`,
                      fontWeight: config.setSummary.fontStyle === "bold" ? 700 : 400,
                      paddingTop: `${config.setSummary.totalTopSpacing}px`,
                      paddingBottom: `${config.setSummary.sectionBottomSpacing}px`,
                    }}
                  >
                    {config.setSummary.totalLabel || "Total Cacamba"}: {previewSecondLiquido.toFixed(2)} kg
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="space-y-2 pt-2 text-sm">
              <div className="font-semibold" style={{ textAlign: previewSetTitleTextAlign }}>
                {previewSample.setName}
              </div>
              <div className="flex items-center justify-between border-y border-black py-1">
                <span>{config.tableHeader.productLabel || "Produto"}</span>
                <span>{previewSample.product}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-right">
                <div>{config.tableHeader.brutoLabel || "Bruto"}: {previewBruto.toFixed(2)}</div>
                <div>{config.tableHeader.taraLabel || "Tara"}: {previewTara.toFixed(2)}</div>
                <div>{config.tableHeader.descLabel || "Desc"}: {previewDiscount.toFixed(2)}</div>
                <div>{config.tableHeader.liquidoLabel || "Liquido"}: {previewLiquido.toFixed(2)}</div>
              </div>

              {showSecondSetPreview && (
                <>
                  <div className="mt-2 border-t border-black pt-2 font-semibold" style={{ textAlign: previewSetTitleTextAlign }}>
                    {previewSecondSet.setName}
                  </div>
                  <div className="flex items-center justify-between border-y border-black py-1">
                    <span>{config.tableHeader.productLabel || "Produto"}</span>
                    <span>{previewSecondSet.product}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-right">
                    <div>{config.tableHeader.brutoLabel || "Bruto"}: {previewSecondBruto.toFixed(2)}</div>
                    <div>{config.tableHeader.taraLabel || "Tara"}: {previewSecondTara.toFixed(2)}</div>
                    <div>{config.tableHeader.descLabel || "Desc"}: {previewSecondDiscount.toFixed(2)}</div>
                    <div>{config.tableHeader.liquidoLabel || "Liquido"}: {previewSecondLiquido.toFixed(2)}</div>
                  </div>
                </>
              )}
            </div>
          )}

          {config.grandTotal.showSeparator && (
            <div
              className="border-black"
              style={{
                marginTop: `${config.grandTotal.topSpacing}px`,
                borderTopWidth: `${config.grandTotal.separatorLineWidth}px`,
              }}
            />
          )}

          <div className="flex items-center justify-between" style={{ paddingTop: `${config.grandTotal.textTopSpacing}px` }}>
            <div
              style={{
                fontFamily: getPreviewFontFamily(config.grandTotal.labelFontFamily),
                fontSize: `${config.grandTotal.labelFontSize}px`,
                fontWeight: config.grandTotal.labelFontStyle === "bold" ? 700 : 400,
              }}
            >
              {config.grandTotal.labelText || "Peso Liquido Total:"}
            </div>
            <div
              style={{
                fontFamily: getPreviewFontFamily(config.grandTotal.valueFontFamily),
                fontSize: `${config.grandTotal.valueFontSize}px`,
                fontWeight: config.grandTotal.valueFontStyle === "bold" ? 700 : 400,
              }}
            >
              {previewGrandLiquido.toFixed(2)} KG
            </div>
          </div>

          <p className="pt-2 text-center text-[10px] text-neutral-600">Previa de referencia - {previewNow}</p>
        </div>
      </section>

      <div className="border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setConfig(defaultPrintLayoutConfig);
            savePrintLayoutConfig(defaultPrintLayoutConfig);
            appendPreviewHistory("Configuracao de impressao restaurada para padrao.");
          }}
        >
          Restaurar padrao da impressao
        </Button>
      </div>
    </div>
  );
}
