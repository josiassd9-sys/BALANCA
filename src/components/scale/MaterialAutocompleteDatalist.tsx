'use client';

import { useMemo } from 'react';
import { useMaterialCatalog } from '@/hooks/use-material-catalog';

type MaterialAutocompleteDatalistProps = {
  listId: string;
  query: string;
  minChars?: number;
  maxSuggestions?: number;
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function MaterialAutocompleteDatalist({
  listId,
  query,
  minChars = 2,
  maxSuggestions = 20,
}: MaterialAutocompleteDatalistProps) {
  const { materials } = useMaterialCatalog();
  const normalizedQuery = normalize(query);

  const suggestions = useMemo(() => {
    if (normalizedQuery.length < minChars) return [];

    const startsWith = materials.filter((material) => normalize(material).startsWith(normalizedQuery));
    const contains = materials.filter(
      (material) => !normalize(material).startsWith(normalizedQuery) && normalize(material).includes(normalizedQuery)
    );

    return [...startsWith, ...contains].slice(0, maxSuggestions);
  }, [materials, normalizedQuery, minChars, maxSuggestions]);

  return (
    <datalist id={listId}>
      {suggestions.map((material) => (
        <option key={material} value={material} />
      ))}
    </datalist>
  );
}
