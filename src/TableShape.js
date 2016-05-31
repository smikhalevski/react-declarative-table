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

// Sizing validator
const sizing = oneOf(Sizing.values);

export const TableColumnShape = shape({
  key: string.isRequired,

  /**
   * Reference to `TableColgroupShape.id` of colgroup to which this column belongs.
   *
   * If colgroup with given identifier is not defined then column is not rendered.
   *
   * @default "default"
   */
  targetColgroupId: string,

  /**
   * Column visibility flag.
   *
   * @default false
   */
  hidden: bool,

  /**
   * Width of column in pixels.
   */
  width: number,

  /**
   * Column expansion mode.
   *
   * If {@link Sizing.FLUID} than column occupies as much space of colgroup as possible but proportionally to other
   * fluid columns. Fluid column does not contract to less than `width`.
   *
   * If {@link Sizing.FIXED} then width of column is always equal to `width`.
   */
  sizing: sizing
});

let tableHeaderDescriptor = {
  caption: string,
  column: TableColumnShape
  // headers
};

export const TableHeaderShape = shape(tableHeaderDescriptor);

// Nested header shape dependency
tableHeaderDescriptor.headers = arrayOf(TableHeaderShape);

export const TableColgroupShape = shape({
  id: string.isRequired,

  /**
   * Colgroup contraction mode.
   *
   * If {@link Sizing.FLUID} than colgroup occupies as much space of table as possible but proportionally to other
   * fluid colgroups. Fluid colgroup does not contract to less than sum of widths of contained columns.
   *
   * If {@link Sizing.FIXED} then width of colgroup is always equal to sum of widths of contained columns. In this case
   * fluid columns contained by this colgroup are treated as fixed.
   */
  sizing: sizing,

  /**
   * Properties provided to scroll box component of this colgroup.
   */
  scrollBox: object
});

export const TableStructureShape = shape({
  /**
   * List of colgroups contained by this table.
   *
   * Table always has colgroup with id "default" which stores columns that have no explicit `targetColgroupId` defined.
   */
  colgroups: arrayOf(TableColgroupShape),
  headers: arrayOf(TableHeaderShape)
});

export const DataSetShape = shape({
  /**
   * Total number of records in data set.
   */
  count: number,

  /**
   * Offset of the first record listed in `result`.
   */
  offset: number,

  /**
   * List of objects representing table rows.
   */
  result: arrayOf(object).isRequired
});
