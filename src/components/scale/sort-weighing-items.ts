import type { WeighingItem } from "@/components/scale/types";

export function sortWeighingItemsForDisplay(items: WeighingItem[]): WeighingItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftStart = Math.min(left.item.bruto, left.item.tara);
      const rightStart = Math.min(right.item.bruto, right.item.tara);

      if (leftStart !== rightStart) {
        return leftStart - rightStart;
      }

      const leftEnd = Math.max(left.item.bruto, left.item.tara);
      const rightEnd = Math.max(right.item.bruto, right.item.tara);

      if (leftEnd !== rightEnd) {
        return leftEnd - rightEnd;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}