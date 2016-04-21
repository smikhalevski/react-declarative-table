import isNumber from 'lodash/isNumber';
import {isState, freeze} from './Runtime';

/**
 * @typedef {SORT_UNSORTED|SORT_ASCENDING|SORT_DESCENDING}
 * @name SortingEnum
 * Sorting direction.
 */
export const
  SORT_UNSORTED = null,
  SORT_ASCENDING = 'asc',
  SORT_DESCENDING = 'desc';

export const SORT_VALUES = [SORT_UNSORTED, SORT_ASCENDING, SORT_DESCENDING];

/**
 * Checks value to be {@link SortingEnum} value.
 *
 * @param {*} sorting Value to test.
 * @return {Boolean}
 */
export function isSorting(sorting) {
  return SORT_VALUES.includes(sorting);
}

export function reduceSorting(state = [], action) {
  if (Array.isArray(state)) {
    state = state.map(sort => {
      if (isState(sort)) {
        let [key] = Object.keys(sort);
        if (isSorting(sort[key])) {
          return freeze({[key]: sort[key]});
        }
      }
      throw new Error('Expected each sorting item to be a mapping of a single field name to a sorting direction');
    });
    return freeze(state);
  }
}

export function toComparator(sorting) {
  return (left, right) => {
    for (let sort of sorting) {
      let [key] = Object.keys(sort),
          answer = 0;
      if (sort[key] == SORT_ASCENDING) {
        answer = 1;
      }
      if (sort[key] == SORT_DESCENDING) {
        answer = -1;
      }
      if (a < b) {
        return -answer;
      }
      if (a > b) {
        return answer;
      }
    }
    return 0;
  };
}
