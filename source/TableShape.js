import React from 'react';

const {shape, arrayOf, oneOf, string, bool, number, object} = React.PropTypes;

/**
 * @typedef {"fluid"|"fixed"}
 * Type of sizing of table colgroup or column.
 */
export const Sizing = {
  FLUID: 'fluid',
  FIXED: 'fixed'
};

Sizing.values = [Sizing.FIXED, Sizing.FLUID];

export const TableColumnShape = shape({
  key: string.isRequired,
  targetColgroupId: string.isRequired, // Reference to `TableColgroupShape.id`
  visible: bool,
  width: number, // px
  sizing: oneOf(Sizing.values)
});

let tableHeaderDesc = {
  caption: string,
  column: TableColumnShape
  // headers
};

export const TableHeaderShape = shape(tableHeaderDesc);

// Nested header shape dependency
tableHeaderDesc.headers = arrayOf(TableHeaderShape);

export const TableColgroupShape = shape({
  id: string.isRequired,
  sizing: oneOf(Sizing.values)
});

export const TableStructureShape = shape({
  colgroups: arrayOf(TableColgroupShape).isRequired,
  headers: arrayOf(TableHeaderShape).isRequired
});

export const DataSetShape = shape({
  count: number,
  offset: number,
  result: arrayOf(object).isRequired
});

/**
 * @typedef {Array.<TableHeaderShape>}
 * @name TableHeaderStackShape
 * Stack represents ordered list of headers.
 *
 * Header at `i` is a parent of `i + 1` header. Having stack `[A, B]`, means that `B` is contained
 * among sub-headers of `A`.
 */
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
