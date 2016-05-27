import React from 'react';
import {TableColgroupShape} from './TableColgroupShape';
import {TableHeaderShape} from './TableHeaderShape';
import {toStacks} from './TableHeaderShape';

const {shape, arrayOf} = React.PropTypes;

export const TableStructureShape = shape({
  colgroups: arrayOf(TableColgroupShape).isRequired,
  headers: arrayOf(TableHeaderShape).isRequired
});

/**
 * Compute list of stacks broken down by colgroup.
 *
 * If stack has no related column then it is added to default colgroup.
 *
 * @param {TableStructureShape} structure Table structure descriptor.
 * @returns {Array.<Array.<TableHeaderStackModel>>}
 */
export function toStacksByColgroup(structure) {
  let groups = [],
      stacks = Array.prototype.concat(...structure.headers.map(toStacks));
  for (let colgroup of structure.colgroups) {
    let group = [];
    for (let stack of stacks) {
      if (colgroup.id === stack[stack.length - 1].column.targetColgroupId) {
        group.push(stack);
      }
    }
    groups.push(group);
  }
  return groups;
}
