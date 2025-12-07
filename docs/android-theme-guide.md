# Guia de Implementação de Tema para Android Nativo

Este documento serve como um guia para um desenvolvedor ou agente de IA do Android Studio recriar o sistema de temas dinâmicos e personalizáveis desenvolvido na versão web deste aplicativo.

## 1. Conceito Central

O sistema é baseado em **tokens de design** (referências de cores abstratas) em vez de cores fixas. Isso permite que a aparência de todo o aplicativo seja alterada simplesmente trocando os valores desses tokens.

**Lógica da Web:**
- **CSS Custom Properties (Variáveis):** Ex: `--primary`, `--background`.
- **Valores HSL:** As cores são armazenadas como Hex, mas aplicadas como HSL (`--primary-hsl`) para serem usadas em CSS.
- **`localStorage`:** Para salvar as personalizações do usuário.
- **React Context:** Para gerenciar o estado do tema em tempo real.

**Tradução para Android Nativo:**
- **Atributos de Tema (Theme Attributes):** Ex: `?attr/colorPrimary`, `?attr/colorSurface`.
- **Arquivos de Tema XML:** Definição de múltiplos temas em `res/values/themes.xml`.
- **`SharedPreferences`:** Para salvar as personalizações do usuário.
- **Recreação da Atividade/Aplicação do Tema:** Para aplicar o tema dinamicamente.

---

## 2. Mapeamento de Tokens de Cor (Web -> Android)

A tabela abaixo mapeia os nomes das variáveis de cor da web para os atributos de tema padrão do Material Components para Android.

| Token Web (`--key-hsl`)    | Atributo Android (`?attr/...`)      | Uso Típico                                        |
| -------------------------- | ----------------------------------- | ------------------------------------------------- |
| `background`               | `colorSurface`                      | Fundo principal das telas.                        |
| `foreground`               | `colorOnSurface`                    | Cor do texto principal sobre o fundo.             |
| `card`                     | `colorSurfaceContainer`             | Fundo de componentes como Cards.                  |
| `cardForeground`           | `colorOnSurface`                    | Texto dentro dos Cards.                           |
| `popover`                  | `colorSurfaceContainerHigh`         | Fundo de Diálogos, Menus e Popovers.              |
| `popoverForeground`        | `colorOnSurface`                    | Texto em Diálogos, Menus e Popovers.              |
| `primary`                  | `colorPrimary`                      | Cor de destaque principal (botões, links, ícones).|
| `primaryForeground`        | `colorOnPrimary`                    | Cor de texto/ícones sobre a cor primária.         |
| `secondary`                | `colorSecondary`                    | Cor de destaque secundária.                       |
| `secondaryForeground`      | `colorOnSecondary`                  | Cor de texto/ícones sobre a cor secundária.       |
| `muted`                    | `colorSurfaceVariant`               | Fundos sutis, como campos de input desabilitados. |
| `mutedForeground`          | `colorOnSurfaceVariant`             | Texto sutil, placeholders, descrições.            |
| `accent`                   | `colorPrimaryInverse` (ou custom)   | Destaques de hover, foco. Pode ser um `?attr/colorAccent`. |
| `accentForeground`         | `colorOnPrimaryInverse` (ou custom) | Texto sobre a cor de `accent`.                    |
| `destructive`              | `colorError`                        | Cor para erros, ações destrutivas (excluir).      |
| `destructiveForeground`    | `colorOnError`                      | Texto/ícones sobre a cor de erro.                 |
| `border`                   | `outline`                           | Cor das bordas de componentes.                    |
| `input`                    | `colorSurfaceVariant`               | Fundo de campos de texto (Inputs).                |
| `ring`                     | `colorPrimary`                      | Cor do anel de foco (geralmente a cor primária).  |
| `cacambaForeground`        | `colorPrimary` (ou custom)          | Cor específica para o título "CAÇAMBA". Pode ser um `?attr/colorCustomCacamba`. |
| `accentPrice`              | `colorTertiary` (ou custom)         | Cor de destaque para o preço final. Pode ser um `?attr/colorCustomPrice`. |
| `settingsButtonBg`         | `colorSurfaceContainerHighest` (ou custom) | Fundo específico do botão de engrenagem. Pode ser `?attr/colorCustomSettingsButton`. |

---

## 3. Dados dos Temas Predefinidos

A seguir estão todas as combinações de cores em formato **HEX**. Cada um desses "temas" deve ser definido como um estilo em `res/values/themes.xml`, que herda de um tema base do Material Components.

```xml
<!-- Exemplo de como um tema seria definido em themes.xml -->
<style name="AppTheme.CyberpunkNeon" parent="Theme.Material3.Dark.NoActionBar">
    <item name="colorPrimary">#00f6ff</item>
    <item name="colorOnPrimary">#0d0221</item>
    <item name="colorSurface">#0d0221</item>
    <item name="colorOnSurface">#f0f0f0</item>
    <item name="colorError">#ff003c</item>
    <item name="colorOnError">#0d0221</item>
    <item name="outline">#3c2b5c</item>
    <!-- Mapear todas as outras cores aqui -->
</style>
```

### Lista Completa de Temas (Valores em HEX)

**Padrão (Escuro)**
- `background`: `#191A1B`
- `foreground`: `#FAFAFA`
- `card`: `#131415`
- `primary`: `#4EE1A0`
- `primaryForeground`: `#F6FEFB`
- `secondary`: `#242627`
- `destructive`: `#7F1D1D`
- `border`: `#3F4144`
- `input`: `#242627`
- `accentPrice`: `#FBBF24`
- `settingsButtonBg`: `#131415`

**Neve (Claro)**
- `background`: `#F9FAFB`
- `foreground`: `#111827`
- `card`: `#FFFFFF`
- `primary`: `#2563EB`
- `primaryForeground`: `#FFFFFF`
- `secondary`: `#F3F4F6`
- `destructive`: `#DC2626`
- `border`: `#E5E7EB`
- `input`: `#FFFFFF`
- `accentPrice`: `#F59E0B`
- `settingsButtonBg`: `#FFFFFF`

**Cyberpunk Neon**
- `background`: `#0d0221`
- `foreground`: `#f0f0f0`
- `card`: `#1a0c36`
- `primary`: `#00f6ff`
- `primaryForeground`: `#0d0221`
- `secondary`: `#241440`
- `accent`: `#ff00ff`
- `destructive`: `#ff003c`
- `border`: `#3c2b5c`
- `input`: `#241440`
- `cacambaForeground`: `#00f6ff`
- `accentPrice`: `#ff00ff`
- `settingsButtonBg`: `#1a0c36`

**Menta Fresca**
- `background`: `#f0fdf4`
- `foreground`: `#1e293b`
- `card`: `#ffffff`
- `primary`: `#10b981`
- `primaryForeground`: `#ffffff`
- `secondary`: `#ecfdf5`
- `destructive`: `#ef4444`
- `border`: `#e2e8f0`
- `input`: `#ffffff`
- `cacambaForeground`: `#065f46`
- `accentPrice`: `#f59e0b`
- `settingsButtonBg`: `#ffffff`

**Oceano Profundo**
- `background`: `#0f172a`
- `foreground`: `#f1f5f9`
- `card`: `#1e293b`
- `primary`: `#38bdf8`
- `primaryForeground`: `#0f172a`
- `secondary`: `#334155`
- `destructive`: `#f43f5e`
- `border`: `#334155`
- `input`: `#334155`
- `cacambaForeground`: `#38bdf8`
- `accentPrice`: `#fbbf24`
- `settingsButtonBg`: `#1e293b`

... (continue para todos os temas, como no arquivo `src/lib/themes.ts`)

---

## 4. Implementação da Personalização Dinâmica

A tela de configurações permite ao usuário sobrescrever qualquer cor do tema, além de ajustar fontes e raio da borda.

**Passos para Implementação em Android:**

1.  **Tela de Configurações:**
    *   Crie uma tela de configurações (`Activity` ou `Fragment`).
    *   Use seletores de cor (Color Pickers), `Spinner` para fontes e `Slider` para raio/tamanho da fonte.

2.  **Salvando as Preferências:**
    *   Utilize `SharedPreferences` para salvar cada valor customizado pelo usuário.
    *   Exemplo de chaves: `theme_color_primary`, `theme_radius`, `theme_font_family`.
    *   Salve também o nome do tema base selecionado (ex: `theme_base_name` = "CyberpunkNeon").

3.  **Aplicando o Tema Dinamicamente:**
    *   Na inicialização do app (na classe `Application` ou na `MainActivity`), leia as `SharedPreferences`.
    *   Primeiro, aplique o tema base XML correspondente ao nome salvo (ex: `R.style.AppTheme_CyberpunkNeon`).
    *   Depois, crie um "overlay de tema" dinâmico. Você pode fazer isso programaticamente, aplicando os valores de cor, fonte e borda salvos nas `SharedPreferences` sobre o tema base.
        *   **Cores:** `window.statusBarColor`, `window.navigationBarColor`, etc. Para as cores dos componentes, a melhor abordagem é usar o `MaterialShapeDrawable` para aplicar cores dinâmicas a fundos de `View`.
        *   **Fontes:** Use `Typeface.create(...)` e aplique às `TextViews` necessárias. Para aplicar em todo o app, considere uma biblioteca como Calligraphy ou defina atributos de `fontFamily` no tema.
        *   **Raio da Borda:** Esta é a parte mais complexa em Android nativo. A melhor maneira é definir um atributo de tema customizado (ex: `?attr/shapeCornerRadius`) e usá-lo nas definições de `ShapeAppearance.MaterialComponents` do seu tema. Para aplicar dinamicamente um valor do `Slider`, você precisará recriar os `MaterialShapeDrawable` dos seus componentes (Cards, Botões) com o novo `CornerSize`.

**Fluxo de Aplicação:**

`App Inicia` -> `Lê SharedPreferences` -> `Aplica Tema Base (XML)` -> `Aplica Sobreposições Dinâmicas (cores, fontes, bordas)` -> `Renderiza UI`.

Quando o usuário muda uma configuração -> `Salva em SharedPreferences` -> `Chama `recreate()` na Activity` para que o novo tema seja aplicado.

---

## 5. Fontes

As fontes são carregadas do Google Fonts. No Android, adicione-as ao seu projeto como "font resources" (`res/font`).

**Lista de Famílias de Fonte:**
Inter, Roboto, Lato, Poppins, Open Sans, Nunito, Montserrat, Playfair Display, Raleway, Bebas Neue, Lobster, Oswald, Source Sans Pro, Exo 2, Ubuntu, PT Sans, Titillium Web, Fira Sans, Quicksand, Merriweather, PT Serif, Lora, EB Garamond, Cormorant Garamond, Arvo, Crimson Text, Bitter, Roboto Slab, Anton, Archivo Black, Righteous, Passion One, Russo One, Ultra, Staatliches, Changa One, Teko, Yanone Kaffeesatz, Pacifico, Dancing Script, Satisfy, Caveat, Shadows Into Light, Kaushan Script, Great Vibes, Source Code Pro, Special Elite, Press Start 2P, Rock Salt.

Crie um `Spinner` no Android para permitir que o usuário escolha entre essas fontes.

---

Este guia fornece a ponte conceitual necessária. A implementação exata dependerá da arquitetura do aplicativo Android (View-based, Jetpack Compose) e das bibliotecas utilizadas. Para Jetpack Compose, a lógica é ainda mais similar à do React, usando `State` e `CompositionLocalProvider` para propagar os valores do tema.
