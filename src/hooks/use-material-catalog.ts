'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  addMaterialToCatalog,
  getMaterialCatalog,
  MATERIAL_CATALOG_STORAGE_KEY,
  MATERIAL_CATALOG_UPDATED_EVENT,
  removeMaterialFromCatalog,
  updateMaterialInCatalog,
} from '@/services/material-catalog';

export function useMaterialCatalog() {
  const [materials, setMaterials] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setMaterials(getMaterialCatalog());
  }, []);

  useEffect(() => {
    refresh();

    const onStorage = (event: StorageEvent) => {
      if (event.key === MATERIAL_CATALOG_STORAGE_KEY) {
        refresh();
      }
    };

    const onCatalogUpdated = () => {
      refresh();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(MATERIAL_CATALOG_UPDATED_EVENT, onCatalogUpdated);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(MATERIAL_CATALOG_UPDATED_EVENT, onCatalogUpdated);
    };
  }, [refresh]);

  const addMaterial = useCallback((materialName: string) => {
    const updated = addMaterialToCatalog(materialName);
    setMaterials(updated);
  }, []);

  const updateMaterial = useCallback((oldName: string, newName: string) => {
    const updated = updateMaterialInCatalog(oldName, newName);
    setMaterials(updated);
  }, []);

  const removeMaterial = useCallback((materialName: string) => {
    const updated = removeMaterialFromCatalog(materialName);
    setMaterials(updated);
  }, []);

  return {
    materials,
    refresh,
    addMaterial,
    updateMaterial,
    removeMaterial,
  };
}
