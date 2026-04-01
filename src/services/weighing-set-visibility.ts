import type { WeighingSet } from '@/components/scale/types';

const WEIGHING_SET_VISIBILITY_KEY = 'weighing-set-visibility-by-session';

type SetUiState = {
  showAll: boolean;
  isCollapsed: boolean;
};

type SessionVisibilityValue = boolean | SetUiState;
type SessionVisibilityMap = Record<string, SessionVisibilityValue>;
type VisibilityBySession = Record<string, SessionVisibilityMap>;

export const readSetVisibilityBySession = (): VisibilityBySession => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(WEIGHING_SET_VISIBILITY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const applySetVisibility = (sessionId: string | null, sets: WeighingSet[]): WeighingSet[] => {
  if (!sessionId) {
    return sets.map((set) => ({
      ...set,
      showAll: set.showAll ?? false,
      isCollapsed: set.isCollapsed ?? false,
    }));
  }

  const allVisibility = readSetVisibilityBySession();
  const sessionVisibility = allVisibility[sessionId] || {};

  return sets.map((set) => ({
    ...set,
    ...(typeof sessionVisibility[set.id] === 'object' && sessionVisibility[set.id] !== null
      ? {
          showAll: (sessionVisibility[set.id] as SetUiState).showAll ?? false,
          isCollapsed: (sessionVisibility[set.id] as SetUiState).isCollapsed ?? false,
        }
      : {
          // Compatibilidade com versão antiga (apenas boolean = showAll)
          showAll: Boolean(sessionVisibility[set.id]),
          isCollapsed: false,
        }),
  }));
};

export const persistSetVisibilityBySession = (sessionId: string | null, sets: WeighingSet[]) => {
  if (!sessionId || typeof window === 'undefined') return;

  try {
    const allVisibility = readSetVisibilityBySession();
    const sessionVisibility: Record<string, SetUiState> = {};

    sets.forEach((set) => {
      sessionVisibility[set.id] = {
        showAll: Boolean(set.showAll),
        isCollapsed: Boolean(set.isCollapsed),
      };
    });

    allVisibility[sessionId] = sessionVisibility;
    window.localStorage.setItem(WEIGHING_SET_VISIBILITY_KEY, JSON.stringify(allVisibility));
  } catch {
    // Não bloqueia fluxo principal caso localStorage falhe
  }
};