/**
 * @typedef {"fluid"|"fixed"}
 * Type of sizing of table colgroup or column.
 */
export const Sizing = {
  FLUID: 'fluid',
  FIXED: 'fixed'
};

Sizing.values = [Sizing.FIXED, Sizing.FLUID];

export function isSizing(sizing) {
  return Sizing.values.indexOf(sizing) > -1;
}
