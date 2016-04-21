import {isState, freeze} from '../../Runtime';
import uniqueId from 'lodash/uniqueId';
import flatten from 'lodash/flatten';
import last from 'lodash/last';
import {reduceSetOfTableColgroups, DEFAULT_COLGROUP_ID} from './TableColgroupModel';
import {reduceSetOfTableHeaders} from './TableHeaderModel';
import {toStacks} from './TableHeaderModel';

/**
 * @typedef {Object}
 * @name TableStructureModel
 * Description of table layout and header structure.
 *
 * @property {Array.<TableColgroupModel>} [colgroups] Column grouping of this table.
 *           If not provided table would have one colgroup `DEFAULT_COLGROUP_ID`. Columns which have
 *           no {@link TableColumnModel|`colgroupRef`} specified are added to default colgroup.
 *           If not explicitly specified, default colgroup is rendered last.
 * @property {Array.<TableHeaderModel>} [headers] Headers of this table.
 * @property {String} [modifiers] Space-separated list of style classes.
 * @example
 * let tableStructure = {
 *   colgroups: [
 *     {
 *       // See {@link TableColgroupModel}
 *       id: 'main',
 *       sizing: 'fixed'
 *     }
 *     // Default colgroup is added implicitly at runtime.
 *   ],
 *   headers: [
 *     {
 *       // See {@link TableHeaderModel}
 *       caption: 'A',
 *       headers: [
 *         {
 *           caption: 'Sub-A',
 *           column: {
 *             // See {@link TableColumnModel}
 *             id: 'columnA', // Id to lookup in {@link TableModel|TableModel.rows}.
 *             visible: true,
 *             width: 25,
 *             sizing: 'fixed',
 *             colgroupRef: 'main'
 *           }
 *         }
 *       ]
 *     },
 *     {
 *       caption: 'B'
 *       column: {
 *         // This column would be added to default colgroup,
 *         // because no explicit `colgroupRef` is specified.
 *         id: 'columnB'
 *       }
 *     }
 *   ]
 * });
 */
export function reduceTableStructure(state = {}, action) {
  state = {
    modifiers: '',
    ...state,

    colgroups: reduceSetOfTableColgroups(state.colgroups, action),
    headers: reduceSetOfTableHeaders(state.headers, action)
  };
  return freeze(state);
}

/**
 * Compute list of stacks broken down by colgroup.
 *
 * If stack has no related column then it is added to default colgroup.
 *
 * @method
 * @name TableStructureModel.getStacksByColgroup
 * @param {TableStructureModel} state
 * @returns {Array.<Array.<TableHeaderStackModel>>}
 */
export function getStacksByColgroup (state) {
  let groups = [],
      stacks = flatten(state.headers.map(toStacks));
  for (let colgroup of state.colgroups) {
    let group = [];
    for (let stack of stacks) {
      if (colgroup.id === last(stack).column.targetColgroupId) {
        group.push(stack);
      }
    }
    groups.push(group);
  }
  return groups;
}
