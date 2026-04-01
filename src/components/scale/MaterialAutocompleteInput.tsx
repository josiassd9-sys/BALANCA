'use client';

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { useMaterialCatalog } from '@/hooks/use-material-catalog';

type MaterialAutocompleteInputProps = {
  inputId?: string;
  value: string;
  onChange: (value: string) => void;
  nextTargetId?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
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

function matchesAnyPart(candidate: string, query: string): boolean {
  const normalizedCandidate = normalize(candidate);
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return false;
  return terms.every((term) => normalizedCandidate.includes(term));
}

export function MaterialAutocompleteInput({
  inputId,
  value,
  onChange,
  nextTargetId,
  placeholder,
  disabled,
  className,
  minChars = 2,
  maxSuggestions = 10,
}: MaterialAutocompleteInputProps) {
  const { materials } = useMaterialCatalog();
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const normalizedQuery = normalize(value);

  const suggestions = useMemo(() => {
    if (normalizedQuery.length < minChars) return [];

    const startsWith = materials.filter((material) => normalize(material).startsWith(normalizedQuery));
    const containsExact = materials.filter(
      (material) =>
        !normalize(material).startsWith(normalizedQuery) &&
        normalize(material).includes(normalizedQuery)
    );
    const containsByTerms = materials.filter(
      (material) =>
        !normalize(material).startsWith(normalizedQuery) &&
        !normalize(material).includes(normalizedQuery) &&
        matchesAnyPart(material, normalizedQuery)
    );

    return [...startsWith, ...containsExact, ...containsByTerms].slice(0, maxSuggestions);
  }, [materials, normalizedQuery, minChars, maxSuggestions]);

  const shouldShowSuggestions = isFocused && suggestions.length > 0;

  const focusNextTarget = () => {
    if (!nextTargetId) return;
    const nextInput = document.getElementById(nextTargetId) as HTMLInputElement | null;
    if (!nextInput) return;
    nextInput.focus();
    nextInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const handleAdvanceByKeyboard = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!nextTargetId) return;
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    event.preventDefault();
    focusNextTarget();
  };

  const updateDropdownPosition = () => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const viewportTop = window.visualViewport?.offsetTop ?? 0;
    const keyboardTop = viewportTop + viewportHeight;
    const top = rect.bottom + 4;
    const maxHeight = Math.max(140, keyboardTop - top - 8);

    setDropdownStyle({
      left: rect.left,
      top,
      width: rect.width,
      maxHeight,
    });
  };

  useEffect(() => {
    if (!shouldShowSuggestions) return;

    const onViewportChange = () => updateDropdownPosition();
    updateDropdownPosition();

    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('scroll', onViewportChange);

    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('scroll', onViewportChange);
    };
  }, [shouldShowSuggestions]);

  const scrollInputNearTop = (inputEl: HTMLInputElement) => {
    const scrollContainer = inputEl.closest('.js-scale-scroll-area') as HTMLElement | null;
    if (!scrollContainer) {
      inputEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const inputRect = inputEl.getBoundingClientRect();
    const desiredTop = containerRect.top + 72;
    const delta = inputRect.top - desiredTop;

    if (Math.abs(delta) > 8) {
      scrollContainer.scrollBy({ top: delta, behavior: 'smooth' });
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        id={inputId}
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onFocus={(event) => {
          setIsFocused(true);
          scrollInputNearTop(event.currentTarget);
          window.setTimeout(() => updateDropdownPosition(), 180);
        }}
        onBlur={() => {
          window.setTimeout(() => setIsFocused(false), 120);
        }}
        onKeyDown={handleAdvanceByKeyboard}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        enterKeyHint="next"
        autoCapitalize="characters"
        className={className || ''}
      />

      {shouldShowSuggestions && dropdownStyle && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[1000] overflow-y-auto rounded-md border border-border bg-background shadow-lg"
          style={{
            left: dropdownStyle.left,
            top: dropdownStyle.top,
            width: dropdownStyle.width,
            maxHeight: dropdownStyle.maxHeight,
          }}
        >
          {suggestions.map((material) => (
            <button
              key={material}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onPointerDown={(event) => {
                event.preventDefault();
                onChange(material);
                setIsFocused(false);
              }}
            >
              {material}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
