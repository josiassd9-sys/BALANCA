export const formatNumber = (num: number, fixed: boolean = false): string => {
  if (num === null || num === undefined || isNaN(num)) return "-";

  return fixed
    ? Number(num).toFixed(2)
    : new Intl.NumberFormat("pt-BR", { useGrouping: false }).format(num);
};
