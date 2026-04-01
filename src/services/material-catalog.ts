export const MATERIAL_CATALOG_STORAGE_KEY = 'materialCatalog';
export const MATERIAL_CATALOG_UPDATED_EVENT = 'material-catalog-updated';

const DEFAULT_MATERIALS = [
  'RETALHO INOX 304 SCT',
  'SUCATA 304',
  'SUCATA 310',
  'SUCATA 316',
  'SUCATA 321',
  'SUCATA 201',
  'SUCATA 430',
  'SUCATA DE LATAO',
  'SUCATA TAMBOR',
  'SUCATA SAF DUPLEX 2507',
  'SUCATA NITRONIC-32',
  'SUCATA PANELA',
  'SUCATA INOX 35/20',
  'SUCATA INOX 301 / NI-RESIST 1',
  'SUCATA GALVALUME',
  'SUCATA FIO DE COBRE',
  'SUCATA FERRO',
  'SUCATA COBRE',
  'SUCATA BORRA INOX',
  'SUCATA ALUMINIO',
  'SUCATA ALLOY 904',
  'SUCATA INOX 410/420',
  'CLASSIFICA SUCATA COMP VALOR',
  'BATERIA AUTOMOTIVA',
  'BATERIA CHUMBO',
  'BATERIA DE NOBREAK',
  'BATERIA DE LITIO',
  'CAVACO 304',
  'CAVACO 430',
  'CAVACO 316',
  'CAVACO FERRO',
  'CAVACO DE BRONZE',
  'CAVACO INOX 430',
  'CAVACO INOX 35/20',
  'CAVACO INOX 316',
  'CAVACO INOX 304',
  'CAVACO INOX 201',
  'CAVACO ALLOY 904',
  'SUCATA MISTO',
  'SUCATA CARBONO',
  'SUCATA FERRO MISTO',
  'SUCATA FERRO FUNDIDO',
  'BORRA DE INOX',
  'BORRA METALICA',
  'TERRA',
  'ALUMINIO DURO',
  'ALUMINIO MOLE',
  'ALUMINIO PERFIL',
  'ALUMINIO LATA',
  'PANELA DE ALUMINIO',
  'RADIADOR DE ALUMINIO',
  'RADIADOR DE COBRE',
  'COBRE MEL',
  'COBRE QUEIMADO',
  'COBRE MISTO',
  'CABO ELETRICO',
  'CHICOTE',
  'FIACAO',
  'PO DE COBRE',
  'FIO DE COBRE',
  'FIO DE ALUMINIO',
  'LATAO',
  'BRONZE',
  'CHUMBO',
  'ZINCO',
  'NIQUEL',
  'ESTANHO',
  'MAGNESIO',
  'ZAMAK',
  'PO DE FERRO',
  'PO DE INOX',
  'MOTOR ELETRICO',
  'MOTOR DE GELADEIRA',
  'ALTERNADOR',
  'MOTOR DE PARTIDA',
  'COMPRESSOR',
  'CATALISADOR',
  'PLACA ELETRONICA',
  'SUCATA ELETRONICA',
  'COMPUTADOR',
  'CELULAR',
  'GELADEIRA',
  'MAQUINA DE LAVAR',
  'AR CONDICIONADO',
  'ELETRODOMESTICO',
  'LINHA BRANCA',
  'PLASTICO RIGIDO',
  'PLASTICO FILME',
  'VIDRO MISTO',
  'PAPELAO',
  'PAPEL BRANCO',
  'JORNAL',
  'PET',
  'GARRAFA PET',
  'LATINHA',
  'CAVACO INOX',
  'CAVACO CARBONO',
  'CAVACO ALUMINIO',
  'CAVACO COBRE',
  'LATA ACO',
  'VERGALHAO',
  'MALHA DE ACO',
  'TRILHO',
  'LAMPADA FLUORESCENTE',
  'METAL MISTO',
  'RESIDUO INDUSTRIAL',
  'CARCACA DE PNEU',
] as const;

function normalizeMaterial(value: string): string {
  return value.trim().toUpperCase();
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeMaterial).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
}

function dispatchCatalogUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MATERIAL_CATALOG_UPDATED_EVENT));
}

export function getMaterialCatalog(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_MATERIALS];

  try {
    const raw = window.localStorage.getItem(MATERIAL_CATALOG_STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as string[]) : [];
    const merged = uniqueSorted([...DEFAULT_MATERIALS, ...stored]);
    return merged;
  } catch {
    return [...DEFAULT_MATERIALS];
  }
}

export function saveMaterialCatalog(materials: string[]): string[] {
  const normalized = uniqueSorted(materials);
  if (typeof window === 'undefined') return normalized;

  window.localStorage.setItem(MATERIAL_CATALOG_STORAGE_KEY, JSON.stringify(normalized));
  dispatchCatalogUpdated();
  return normalized;
}

export function addMaterialToCatalog(materialName: string): string[] {
  const current = getMaterialCatalog();
  return saveMaterialCatalog([...current, materialName]);
}

export function updateMaterialInCatalog(oldName: string, newName: string): string[] {
  const oldNormalized = normalizeMaterial(oldName);
  const current = getMaterialCatalog().filter((item) => item !== oldNormalized);
  return saveMaterialCatalog([...current, newName]);
}

export function removeMaterialFromCatalog(materialName: string): string[] {
  const target = normalizeMaterial(materialName);
  const current = getMaterialCatalog().filter((item) => item !== target);
  return saveMaterialCatalog(current);
}
