"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { themes } from "@/lib/themes";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeHex, AppTheme, CollapseAnimationVariant, InputDepthPreset, ShadowIntensity } from "@/hooks/use-theme";

const CUSTOM_THEME_VALUE = "__custom__";

export function AppearanceSettings() {
  const { theme, setTheme, resetTheme } = useTheme();
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  const handleColorChange = (key: keyof ThemeHex, value: string) => {
    setTheme({ colors: { ...theme.colors, [key]: value } });
  };

  const handleRadiusChange = (value: number[]) => {
    setTheme({ radius: value[0] });
  };

  const handleFontChange = (value: string) => {
    setTheme({ fontFamily: value });
  };

  const handleTitleFontChange = (value: string) => {
    setTheme({ titleFontFamily: value });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTheme({ appTitle: e.target.value });
  };

  const handleFontSizeChange = (value: number[]) => {
    setTheme({ fontSize: value[0] });
  };

  const handleTitleFontSizeChange = (value: number[]) => {
    setTheme({ titleFontSize: value[0] });
  };

  const handleThemePresetChange = (themeName: string) => {
    if (themeName === CUSTOM_THEME_VALUE) return;

    const selectedTheme = themes.find((preset) => preset.name === themeName);
    if (selectedTheme) {
      setTheme({
        colors: {
          ...selectedTheme.colors,
          liquidTotal: selectedTheme.colors.liquidTotal || selectedTheme.colors.accentPrice,
        },
      });
    }
  };

  const handleShadowIntensityChange = (value: ShadowIntensity) => {
    setTheme({ shadowIntensity: value });
  };

  const handleShadowStrengthChange = (value: number[]) => {
    setTheme({ shadowStrength: value[0] });
  };

  const handleCollapseAnimationVariantChange = (value: CollapseAnimationVariant) => {
    setTheme({ collapseAnimationVariant: value });
  };

  const handleMotionStrengthChange = (value: number[]) => {
    setTheme({ motionStrength: value[0] });
  };

  const handleInputDepthPresetChange = (value: InputDepthPreset) => {
    setTheme({ inputDepthPreset: value });
  };

  const handleInputDepthStrengthChange = (value: number[]) => {
    setTheme({ inputDepthStrength: value[0] });
  };

  const themePresetValue = useMemo(() => {
    const current = theme.colors;
    const found = themes.find((preset) => {
      const presetColors = preset.colors as Record<string, string | undefined>;
      const currentColors = current as Record<string, string | undefined>;
      return Object.entries(presetColors).every(([key, presetColor]) => {
        const currentColor = currentColors[key];
        return (currentColor || "").toLowerCase() === (presetColor || "").toLowerCase();
      });
    });
    return found?.name || CUSTOM_THEME_VALUE;
  }, [theme.colors]);

  const colorSettings: { key: keyof ThemeHex; label: string }[] = [
    { key: "background", label: "Fundo principal" },
    { key: "foreground", label: "Texto principal" },
    { key: "card", label: "Fundo dos cards" },
    { key: "cardForeground", label: "Texto dos cards" },
    { key: "popover", label: "Fundo popover" },
    { key: "popoverForeground", label: "Texto popover" },
    { key: "primary", label: "Cor primaria (destaques)" },
    { key: "primaryForeground", label: "Texto cor primaria" },
    { key: "secondary", label: "Cor secundaria" },
    { key: "secondaryForeground", label: "Texto cor secundaria" },
    { key: "muted", label: "Fundo muted" },
    { key: "mutedForeground", label: "Texto muted" },
    { key: "accent", label: "Cor de enfase (hover)" },
    { key: "accentForeground", label: "Texto cor de enfase" },
    { key: "destructive", label: "Cor destrutiva (erros)" },
    { key: "destructiveForeground", label: "Texto cor destrutiva" },
    { key: "border", label: "Cor das bordas gerais" },
    { key: "input", label: "Fundo dos inputs" },
    { key: "inputBorder", label: "Borda dos inputs (normal)" },
    { key: "inputFocusBorder", label: "Borda dos inputs (foco)" },
    { key: "ring", label: "Cor do anel de foco" },
    { key: "displayDigits", label: "Cor dos digitos do visor" },
    { key: "cacambaForeground", label: "Texto titulo cacamba" },
    { key: "accentPrice", label: "Cor de destaque (preco)" },
    { key: "liquidTotal", label: "Cor do peso liquido total" },
    { key: "settingsButtonBg", label: "Fundo botao configuracoes" },
  ];

  const fontOptions = [
    { value: "Inter", label: "Inter" },
    { value: "Roboto", label: "Roboto" },
    { value: "Lato", label: "Lato" },
    { value: "Poppins", label: "Poppins" },
    { value: "Open Sans", label: "Open Sans" },
    { value: "Nunito", label: "Nunito" },
    { value: "Montserrat", label: "Montserrat" },
    { value: "Raleway", label: "Raleway" },
    { value: "Oswald", label: "Oswald" },
    { value: "Source Sans Pro", label: "Source Sans Pro" },
    { value: "Exo 2", label: "Exo 2" },
    { value: "Ubuntu", label: "Ubuntu" },
    { value: "PT Sans", label: "PT Sans" },
    { value: "Titillium Web", label: "Titillium Web" },
    { value: "Fira Sans", label: "Fira Sans" },
    { value: "Quicksand", label: "Quicksand" },
    { value: "Playfair Display", label: "Playfair Display" },
    { value: "Merriweather", label: "Merriweather" },
    { value: "PT Serif", label: "PT Serif" },
    { value: "Lora", label: "Lora" },
    { value: "EB Garamond", label: "EB Garamond" },
    { value: "Cormorant Garamond", label: "Cormorant Garamond" },
    { value: "Arvo", label: "Arvo" },
    { value: "Crimson Text", label: "Crimson Text" },
    { value: "Bitter", label: "Bitter" },
    { value: "Roboto Slab", label: "Roboto Slab" },
    { value: "Bebas Neue", label: "Bebas Neue" },
    { value: "Anton", label: "Anton" },
    { value: "Archivo Black", label: "Archivo Black" },
    { value: "Righteous", label: "Righteous" },
    { value: "Passion One", label: "Passion One" },
    { value: "Russo One", label: "Russo One" },
    { value: "Ultra", label: "Ultra" },
    { value: "Staatliches", label: "Staatliches" },
    { value: "Changa One", label: "Changa One" },
    { value: "Teko", label: "Teko" },
    { value: "Yanone Kaffeesatz", label: "Yanone Kaffeesatz" },
    { value: "Lobster", label: "Lobster" },
    { value: "Pacifico", label: "Pacifico" },
    { value: "Dancing Script", label: "Dancing Script" },
    { value: "Satisfy", label: "Satisfy" },
    { value: "Caveat", label: "Caveat" },
    { value: "Shadows Into Light", label: "Shadows Into Light" },
    { value: "Kaushan Script", label: "Kaushan Script" },
    { value: "Great Vibes", label: "Great Vibes" },
    { value: "Source Code Pro", label: "Source Code Pro" },
    { value: "Special Elite", label: "Special Elite" },
    { value: "Press Start 2P", label: "Press Start 2P" },
    { value: "Rock Salt", label: "Rock Salt" },
  ];

  const animationClassesByVariant = {
    none: "transition-none",
    snappy: "transition-all duration-150 ease-out",
    smooth: "transition-all duration-200 ease-out",
    gentle: "transition-all duration-300 ease-in-out",
  } as const;

  const previewAnimationClass =
    animationClassesByVariant[theme.collapseAnimationVariant] || animationClassesByVariant.smooth;

  const effectiveMotionDurationMs = useMemo(() => {
    const baseDurationByVariant: Record<CollapseAnimationVariant, number> = {
      none: 0,
      snappy: 150,
      smooth: 200,
      gentle: 300,
    };

    const baseDuration = baseDurationByVariant[theme.collapseAnimationVariant] ?? 200;
    const strengthScale = theme.motionStrength / 500;
    return Math.round(baseDuration * strengthScale);
  }, [theme.collapseAnimationVariant, theme.motionStrength]);

  const motionSpeedLabel = useMemo(() => {
    if (effectiveMotionDurationMs <= 0) return "Instantanea";
    if (effectiveMotionDurationMs <= 120) return "Muito rapida";
    if (effectiveMotionDurationMs <= 220) return "Rapida";
    if (effectiveMotionDurationMs <= 360) return "Suave";
    return "Lenta";
  }, [effectiveMotionDurationMs]);

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Aparencia</DialogTitle>
        <DialogDescription>
          Personalize a aparencia do aplicativo. As alteracoes sao salvas automaticamente no navegador.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 pt-4">
        <section className="space-y-4 rounded-lg border border-border p-4">
          <Label className="font-bold text-base">Aparencia Geral</Label>

          <div className="space-y-2">
            <Label>Temas predefinidos</Label>
            <Select value={themePresetValue} onValueChange={handleThemePresetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tema..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CUSTOM_THEME_VALUE}>Personalizado (automatico)</SelectItem>
                {themes.map((themePreset) => (
                  <SelectItem key={themePreset.name} value={themePreset.name}>
                    {themePreset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Texto do titulo</Label>
            <Input value={theme.appTitle} onChange={handleTitleChange} />
          </div>

          <div className="space-y-2">
            <Label>Fonte do titulo</Label>
            <Select value={theme.titleFontFamily} onValueChange={handleTitleFontChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma fonte" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tamanho da fonte do titulo ({theme.titleFontSize}px)</Label>
            <Slider min={16} max={48} step={1} value={[theme.titleFontSize]} onValueChange={handleTitleFontSizeChange} />
          </div>

          <div className="space-y-2">
            <Label>Tipografia</Label>
            <Select value={theme.fontFamily} onValueChange={handleFontChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma fonte" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tamanho da fonte base ({theme.fontSize}px)</Label>
            <Slider min={12} max={20} step={0.5} value={[theme.fontSize]} onValueChange={handleFontSizeChange} />
          </div>

          <div className="space-y-2">
            <Label>Raio da borda ({theme.radius.toFixed(1)}rem)</Label>
            <Slider min={0} max={2} step={0.1} value={[theme.radius]} onValueChange={handleRadiusChange} />
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border p-4">
          <Label className="font-bold text-base">Intensidade e Profundidade</Label>

          <div className="space-y-2">
            <Label>Intensidade base de sombras</Label>
            <Select value={theme.shadowIntensity} onValueChange={(value) => handleShadowIntensityChange(value as AppTheme["shadowIntensity"])}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a intensidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem sombra</SelectItem>
                <SelectItem value="soft">Suave</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="strong">Forte</SelectItem>
                <SelectItem value="extreme">Extrema</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Forca da sombra (0 a 1000): {theme.shadowStrength}</Label>
            <Slider min={0} max={1000} step={1} value={[theme.shadowStrength]} onValueChange={handleShadowStrengthChange} />
          </div>

          <div className="space-y-2">
            <Label>Animacao de recolher cacamba</Label>
            <Select
              value={theme.collapseAnimationVariant}
              onValueChange={(value) => handleCollapseAnimationVariantChange(value as CollapseAnimationVariant)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a animacao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem animacao</SelectItem>
                <SelectItem value="snappy">Rapida</SelectItem>
                <SelectItem value="smooth">Suave</SelectItem>
                <SelectItem value="gentle">Lenta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Forca da animacao (0 a 1000): {theme.motionStrength}</Label>
            <Slider min={0} max={1000} step={1} value={[theme.motionStrength]} onValueChange={handleMotionStrengthChange} />
          </div>

          <div className="space-y-2">
            <Label>Profundidade dos inputs (5 niveis)</Label>
            <Select value={theme.inputDepthPreset} onValueChange={(value) => handleInputDepthPresetChange(value as InputDepthPreset)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a profundidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Nivel 1 - Plano</SelectItem>
                <SelectItem value="soft">Nivel 2 - Leve</SelectItem>
                <SelectItem value="medium">Nivel 3 - Medio</SelectItem>
                <SelectItem value="strong">Nivel 4 - Forte</SelectItem>
                <SelectItem value="deep">Nivel 5 - Profundo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Profundidade fina dos inputs (0 a 1000): {theme.inputDepthStrength}</Label>
            <Slider min={0} max={1000} step={1} value={[theme.inputDepthStrength]} onValueChange={handleInputDepthStrengthChange} />
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="font-semibold">Pre-visualizacao ao vivo</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="button-3d"
                onClick={() => setPreviewCollapsed((prev) => !prev)}
              >
                {previewCollapsed ? "Expandir exemplo" : "Recolher exemplo"}
              </Button>
            </div>

            <div className="surface-3d rounded-md border border-border p-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Este bloco usa suas configuracoes atuais de sombra, animacao e profundidade.
              </p>
              <p className="mb-2 text-xs text-muted-foreground">
                Tempo efetivo da animacao: {effectiveMotionDurationMs}ms
              </p>
              <p className="mb-2 text-xs text-muted-foreground">
                Percepcao de velocidade: {motionSpeedLabel}
              </p>

              <div
                className={`overflow-hidden motion-reduce:transition-none ${previewAnimationClass} ${
                  previewCollapsed ? "max-h-0 opacity-0" : "max-h-40 opacity-100"
                }`}
              >
                <div className="space-y-2 pb-1">
                  <div className="flex gap-2">
                    <Button type="button" size="sm" className="button-3d">Acao primaria</Button>
                    <Button type="button" size="sm" variant="outline" className="icon-chip">Acao secundaria</Button>
                  </div>
                  <Input
                    readOnly
                    value="Campo de exemplo para profundidade e foco"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border p-4">
          <Label className="font-bold text-base">Cores</Label>

          {colorSettings.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <Label htmlFor={`color-${key}`}>{label}</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">{theme.colors[key]?.toUpperCase() || ""}</span>
                <Input
                  id={`color-${key}`}
                  type="color"
                  value={theme.colors[key] || "#000000"}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="h-10 w-10 p-1"
                />
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="border-t pt-4">
        <Button variant="ghost" onClick={resetTheme}>
          Restaurar padrao original
        </Button>
      </div>
    </div>
  );
}
