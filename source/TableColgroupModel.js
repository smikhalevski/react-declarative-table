import {freeze} from '../../Runtime';
import isString from 'lodash/isString';
import uniqueId from 'lodash/uniqueId';
import compact from 'lodash/compact';
import invariant from 'invariant';
import {Sizing} from './SizingEnum';

/**
 * Identifier of default colgroup.
 * @type {String}
 */
export const DEFAULT_COLGROUP_ID = 'default';

/**
 * @typedef {Object}
 * @name TableColgroupModel
 * Colgroup is the logical abstraction of set of columns that have some similarity.
 *
 * If there are no columns that reference particular colgroup, then that colgroup is not rendered.
 *
 * @property {String} [id = COLGROUP_ID] Unique identifier of colgroup. Columns reference
 *           colgroup they belong to with {@link TableColumnModel|`colgroupId`}.
 * @property {TableSizing} [sizing = FLUID] Colgroup *shrinking* mode.
 *           <ul>
 *             <li>
 *               **`FLUID`** colgroup shrinks proportionally till zero width is reached when
 *               there is not enough space available to fit whole table;
 *             </li>
 *             <li>
 *               **`FIXED`** colgroup has fixed width (equal to sum of widths of its contents)
 *               and does not shrink. This option forces table to have non-zero min width;
 *             </li>
 *           </ul>
 */
export function reduceTableColgroup(state, action) {
  if (state) {
    state = {
      id: DEFAULT_COLGROUP_ID,
      sizing: Sizing.FLUID,
      ...state
    };
    if (DEBUG) {
      invariant(isString(state.id), 'Expected `TableColgroup.id` to be a string');
      invariant(Sizing.isSizing(state.sizing), 'Expected `TableColgroup.sizing` to be sizing');
    }
    return freeze(state);
  }
}

export function reduceSetOfTableColgroups(state = [], action) {
  state = compact(state.map(colgroup => reduceTableColgroup(colgroup, action)));
  return freeze(state);
}
