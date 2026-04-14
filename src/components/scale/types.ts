export type WeighingItem = {
  id: string;
  material: string;
  bruto: number;
  tara: number;
  descontos: number;
  liquido: number;
  locked?: boolean;
  reclassFromItemId?: string;
  reclassWeight?: number;
};

export type WeighingSet = {
  id: string;
  name: string;
  items: WeighingItem[];
  descontoCacamba: number;
  showAll?: boolean;
  isCollapsed?: boolean;
};

export type OperationType = 'loading' | 'unloading';