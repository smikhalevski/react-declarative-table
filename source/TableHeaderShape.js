import React from 'react';
import {TableColumnShape} from './TableColumnShape';

const {shape, string, arrayOf} = React.PropTypes;

/**
 * @typedef {Array.<TableHeaderShape>}
 * @name TableHeaderStackShape
 * Stack represents ordered list of headers.
 *
 * Header at `i` is a parent of `i + 1` header. Having stack `[A, B]`, means that `B` is contained
 * among sub-headers of `A`.
 */
/**
 * @typedef {Object}
 * @name TableHeaderShape
 * Hierarchical table header definition.
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
 * Explode `headerA` into a set of {@link TableHeaderStackShape|stacks}.
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
 * Calling {@link fromStacks} with `depth = 0`
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
 * {@link fromStacks}, three new headers would be introduced: **A′**, **C′** and **C″**.
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
 * - If header has no `headers` or `column` specified header is not rendered.
 * - If header has `headers` and non of these nested headers meet conditions to be rendered then
 *   owning header is not rendered.
 *
 * @property {String} [caption = ""] Header caption. If not specified, `column.key` is used as header caption.
 * @property {TableColumnShape} [column] Related column.
 * @property {Array.<TableHeaderShape>} [headers = []] List of sub-headers.
 */
let tableHeaderDesc = {
  caption: string,
  column: TableColumnShape
  // headers
};

export const TableHeaderShape = shape(tableHeaderDesc);

// Nested header shape dependency
tableHeaderDesc.headers = arrayOf(TableHeaderShape);

/**
 * Converts header to stack of headers.
 *
 * Does not make any additional copies of {@link TableHeaderShape} objects.
 *
 * @param {TableHeaderShape} header Header to convert to stacks.
 * @returns {Array.<TableHeaderStackShape>}
 */
export function toStacks(header) {
  const {headers} = header;
  if (Array.isArray(headers) && headers.length) {
    let stacks = Array.prototype.concat(...headers.map(toStacks));
    for (let stack of stacks) {
      stack.unshift(header);
    }
    return stacks;
  }
  return [[header]];
}
