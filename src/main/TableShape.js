import React from 'react';
import {Sizing} from './SizingEnum';

const {shape, arrayOf, oneOf, string, bool, number, object} = React.PropTypes;

// Sizing validator
const sizing = oneOf(Sizing.values);

export const TableColumnShape = shape({
  /**
   * Key in row object associated with this column.
   * By default, column value in i-th row is `dataSet.rows[i][column.key]`.
   */
  key: string.isRequired,

  /**
   * Reference to `TableColGroupShape.id` of colgroup to which this column belongs.
   * If colgroup with given identifier is not defined then column is not rendered.
   * @default {@link DEFAULT_COL_GROUP_ID}
   */
  targetColGroupId: string,

  /**
   * Column visibility flag.
   * @default false
   */
  hidden: bool,

  /**
   * Width of column in pixels.
   *
   * For fluid columns this is the minimum width. Space between fluid columns is proportionally distributed
   * basing on their minimum width.
   *
   * @default 80
   */
  width: number,

  /**
   * Horizontal column expansion mode:
   * - {@link Sizing.FLUID} Column occupies as much space of colgroup as possible but proportionally to other
   * fluid columns. Fluid column does not contract to less than `width`.
   * - {@link Sizing.FIXED} Width of column is always equal to `width`.
   *
   * @default Sizing.FIXED
   */
  sizing: sizing,

  /**
   * If sibling rows have same values for this column then this column is merged.
   * Negative value means column does not participate in row span.
   * @default -1
   */
  rowSpanPriority: number,

  /**
   * Number of rows that can be spanned if they contain same value for this column.
   */
  rowSpanLimit: number
});

let tableHeaderDescriptor = {
  /**
   * Optional header caption. By default, rendered as header content.
   */
  caption: string,
  column: TableColumnShape
  // headers
};

export const TableHeaderShape = shape(tableHeaderDescriptor);

// Nested header shape dependency
tableHeaderDescriptor.headers = arrayOf(TableHeaderShape);

// Col groups have only horizontal scrollbar.
export const TableColGroupShape = shape({
  id: string.isRequired,

  /**
   * Horizontal expansion and contraction mode for group of columns:
   * - {@link Sizing.FLUID} Colgroup occupies as much horizontal space of table as possible but proportionally to other
   * fluid colgroups. Fluid colgroup does not contract to less than sum of widths of contained columns.
   * - {@link Sizing.FIXED} Width of colgroup is always equal to sum of widths of contained columns. In this case
   * fluid columns contained by this colgroup are treated as fixed.
   *
   * @default Sizing.FIXED
   */
  sizing: sizing,

  /**
   * Properties provided to `GenericScrollBox` component rendered in this colgroup.
   */
  scrollBox: object
});

export const TableDataSetShape = shape({
  id: string,

  /**
   * Total number of available rows in this data set.
   * @default `rows.length`
   */
  totalCount: number,

  /**
   * Offset of the first record listed in `rows`.
   * @default 0
   */
  offset: number,

  /**
   * List of objects representing set of table rows in range from `offset` inclusive to
   * `offset + rows.length` exclusive.
   */
  rows: arrayOf(object.isRequired).isRequired
});

// Row groups have only vertical scrollbar.
export const TableRowGroupShape = shape({
  sourceDataSetId: string,

  /**
   * Vertical expansion and contraction mode of group of rows:
   * - {@link Sizing.FLUID} Group of rows occupies as much vertical space of table as possible but proportionally
   * to other fluid row groups.
   * - {@link Sizing.FIXED} Height of row group is always equal to sum of heights of contained rows.
   *
   * @default Sizing.FLUID
   */
  sizing: sizing,

  /**
   * Row group height in pixels.
   *
   * For fluid row groups this is the minimum height. Space between fluid row groups is proportionally distributed
   * basing on their minimum height.
   *
   * If `null` is provided as value then row group height fits height of contained rows.
   *
   * @default null
   */
  height: number
});
