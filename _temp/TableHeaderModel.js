import isUndefined from 'lodash/isUndefined';
import {isState, freeze} from '../../Runtime';
import uniqueId from 'lodash/uniqueId';
import flatten from 'lodash/flatten';
import isEqual from 'lodash/isEqual';
import compact from 'lodash/compact';
import invariant from 'invariant';
import {reduceSetOfRenderers} from '../renderer/RendererModel';
import {reduceTableColumn} from './TableColumnModel';

export const TABLE_HEADER_ID_KEY = 'id';

/**
 * @typedef {Array.<TableHeaderModel>}
 * @name TableHeaderStackModel
 * Stack represents ordered list of headers.
 *
 * Header at `i` is a parent of `i + 1` header. Having stack `[A, B]`,
 * means that `B` is contained among sub-headers of `A`.
 */
/**
 * @typedef {Object}
 * @name TableHeaderModel
 * Hierarchical table header state.
 *
 * Consider having header `A` represented by following object where same letter in table
 * represent reference to the same object:
 * <table>
 *   <tr>
 *     <td>`headerA = `</td>
 *     <td>
 *       <table border>
 *         <tr>
 *           <td align="center" colspan="3">A</td>
 *         </tr>
 *         <tr>
 *           <td align="center" rowspan="2" width="25">B</td>
 *           <td align="center" colspan="2">C</td>
 *         </tr>
 *         <tr>
 *           <td align="center" width="25">D</td>
 *           <td align="center" width="25">Q</td>
 *         </tr>
 *       </table>
 *     </td>
 *     <td>`;`</td>
 *   </tr>
 * </table>
 *
 * Explode `headerA` into a set of {@link TableHeaderStackModel|stacks}.
 *
 * `stacks = toStacks(headerA);`
 * <table>
 *   <tr>
 *     <td align="right">`// Index`</td>
 *     <td align="center">`0`</td>
 *     <td></td>
 *     <td align="center">`1`</td>
 *     <td></td>
 *     <td align="center">`2`</td>
 *   </tr>
 *   <tr>
 *     <td>`stacks` → `[`</td>
 *     <td valign="top">
 *       <table border>
 *         <tr><td align="center" width="25">A</td></tr>
 *         <tr><td align="center">B</td></tr>
 *       </table>
 *     </td>
 *     <td>`,`</td>
 *     <td>
 *       <table border>
 *         <tr><td align="center" width="25">A</td></tr>
 *         <tr><td align="center">C</td></tr>
 *         <tr><td align="center">D</td></tr>
 *       </table>
 *     </td>
 *     <td>`,`</td>
 *     <td>
 *       <table border>
 *         <tr><td align="center" width="25">A</td></tr>
 *         <tr><td align="center">C</td></tr>
 *         <tr><td align="center">Q</td></tr>
 *       </table>
 *     </td>
 *     <td>`];`</td>
 *   </tr>
 * </table>
 *
 * Calling {@link TableHeaderModel.fromStacks|`fromStacks`} with `depth = 0`
 * would cause processing of all headers in all provided stacks:
 * <table>
 *   <tr>
 *     <td>`fromStacks(stacks, 0)` → `[`</td>
 *     <td>
 *       <table border>
 *         <tr>
 *           <td align="center" colspan="3">A</td>
 *         </tr>
 *         <tr>
 *           <td align="center" rowspan="2" width="25">B</td>
 *           <td align="center" colspan="2">C</td>
 *         </tr>
 *         <tr>
 *           <td align="center" width="25">D</td>
 *           <td align="center" width="25">Q</td>
 *         </tr>
 *       </table>
 *     </td>
 *     <td>`];`</td>
 *   </tr>
 * </table>
 *
 * <table>
 *   <tr>
 *     <td>`fromStacks(stacks, 1)` → `[`</td>
 *     <td valign="top">
 *       <table border>
 *         <tr><td align="center" width="25">B</td></tr>
 *       </table>
 *     </td>
 *     <td>`,`</td>
 *     <td>
 *       <table border>
 *         <tr>
 *           <td align="center" colspan="2">C</td>
 *         </tr>
 *         <tr>
 *           <td align="center" width="25">D</td>
 *           <td align="center" width="25">Q</td>
 *         </tr>
 *       </table>
 *     </td>
 *     <td>`];`</td>
 *   </tr>
 * </table>
 *
 * Swapping items at `0` and `1` in `stacks` prior to calling
 * {@link TableHeaderModel.fromStacks|`fromStacks`}, three new headers would be
 * introduced: **A′**, **C′** and **C″**.
 *
 * Their attributes are exact copies of A and C, except their sub-headers.
 *
 * `[stacks[0], stacks[1]] = [stacks[1], stacks[0]];`
 * <table>
 *   <tr>
 *     <td>`fromStacks(stacks)` → `[`</td>
 *     <td>
 *       <table border>
 *         <tr>
 *           <th align="center" colspan="3">A′</th>
 *         </tr>
 *         <tr>
 *           <th align="center" width="25">C′</th>
 *           <td align="center" width="25" rowspan="2">B</td>
 *           <th align="center" width="25">C″</th>
 *         </tr>
 *         <tr>
 *           <td align="center">D</td>
 *           <td align="center">Q</td>
 *         </tr>
 *       </table>
 *     </td>
 *     <td>`];`</td>
 *   </tr>
 * </table>
 *
 * Rendering features:
 * - If header has both non-empty `headers` and `column` specified then nested headers are rendered.
 * - If header has no `headers` or `column` specified then exception occurs.
 * - If header has `headers` and non of these nested headers meet conditions to be rendered then
 *   owning header is not rendered.
 *
 * @property {String} [caption = ""] Header caption.
 * @property {Array.<RendererModel>} [renderers = []] Rendering decorators.
 * @property {Array.<TableHeaderModel>} [headers = []] List of sub-headers.
 * @property {TableColumnModel} [column] Related column.
 */

function reduceTableHeader(state, action) {
  if (isState(state)) {
    state = {
      caption: '',
      renderers: [{id: 'table-default-header'}], // TODO Make this more generic
      ...state
    };
    if (isUndefined(state[TABLE_HEADER_ID_KEY])) {
      state[TABLE_HEADER_ID_KEY] = uniqueId();
    }
    state.renderers = reduceSetOfRenderers(state.renderers, action);
    state.headers = reduceSetOfTableHeaders(state.headers, action);
    state.column = reduceTableColumn(state.column, action);

    return freeze(state);
  }
}

export function reduceSetOfTableHeaders(state = [], action) {
  state = compact(state.map(header => reduceTableHeader(header, action)));
  return freeze(state);
}

/**
 * Get columns contained by header or its sub-headers.
 *
 * @method
 * @name TableHeaderModel.getNestedColumns
 * @param {TableHeaderModel} header Header to lookup columns in.
 * @returns {Array.<TableColumnModel>}
 */
export function getNestedColumns(header) {
  let {headers, column} = header;
  if (headers.length) {
    return flatten(headers.map(getNestedColumns));
  }
  if (column) {
    return [column];
  }
  return [];
}

/**
 * Check visibility of particular table header.
 *
 * @method
 * @name TableHeaderModel.isHeaderVisible
 * @param {TableHeaderModel} header Header check visibility of.
 * @return {Boolean}
 */
export function isHeaderVisible(header) {
  return getNestedColumns(header).some(column => column.visible);
}

/**
 * Converts header to stack of headers.
 *
 * Does not make any additional copies of {@link TableHeaderModel} objects.
 *
 * @method
 * @name TableHeaderModel.toStacks
 * @param {TableHeaderModel} header Header to convert to stacks.
 * @returns {Array.<TableHeaderStackModel>}
 */
export function toStacks(header) {
  if (header.headers.length) {
    let stacks = flatten(header.headers.map(toStacks));
    for (let stack of stacks) {
      stack.unshift(header);
    }
    return stacks;
  }
  return [[header]];
}

/**
 * Recurse through stacks of headers and merge headers at the same depth into a singe header
 * basing on strict caption equality.
 *
 * @method
 * @name TableHeaderModel.fromStacks
 * @param {Array.<TableHeaderStackModel>} stacks Stacks to group.
 * @param {Function} isJoinable Comparator that returns `true` if stacks have headers at
 *        given depth that can be conjoined (merged into single header), `false` otherwise.
 * @param {Number} [depth = 0] Index in stack at which to start header merging. If `depth > 0`
 *        was provided it omits given number of header rows from the top of header stack.
 * @returns {Array.<TableHeaderModel>}
 * @see TableHeaderStackModel.toStacks
 * @example
 * // Idempotent conversion of header A
 * fromStacks(toStacks(A)); // [A]
 */
export function fromStacks(stacks, isJoinable, depth = 0) {
  let targetHeaders = [];
  for (let i = 0; i < stacks.length; ++i) {
    let header = stacks[i][depth];

    // Last header in stack has no sub-headers by definition.
    if (depth < stacks[i].length - 1) {
      let colspan = [stacks[i]];

      // Siblings that can be joined are added to colspan.
      for (var j = i + 1; j < stacks.length; ++j) {
        if (depth < stacks[j].length && isJoinable(stacks[i], stacks[j], depth)) {
          colspan.push(stacks[j]);
        } else {
          break;
        }
      }
      i = j - 1;
      let headers = fromStacks(colspan, isJoinable, depth + 1);
      if (!isEqual(header.headers, headers)) {
        // Computed sub-headers of current header differ from ones existing in state.
        // So perform shallow copy of header to prevent original header changes.
        // See detailed explanation in class description.
        header = {...header, headers, [TABLE_HEADER_ID_KEY]: uniqueId()};
      }
    }
    targetHeaders.push(header);
  }
  return targetHeaders;
}
