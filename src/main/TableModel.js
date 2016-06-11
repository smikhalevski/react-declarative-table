import {Sizing} from './SizingEnum';

export const
    DEFAULT_COL_GROUP_ID = 'default',
    DEFAULT_ROW_GROUP_ID = 'default';

export function flatten(array) {
  return Array.prototype.concat.apply([], array);
}

/**
 * @typedef {Array.<TableHeaderShape>}
 * @name TableHeaderStack
 * Stack represents ordered list of headers.
 *
 * Header at `i` is a parent of `i + 1` header. Having stack `[A, B]`, means that `B` is contained
 * among sub-headers of `A`.
 */
/**
 * Converts header to stack of headers.
 * @param {TableHeaderShape} header Header to convert to stacks.
 * @returns {Array.<TableHeaderStack>}
 */
export function toStacks(header) {
  if (header) {
    const {headers} = header;
    if (headers && headers.length) {
      let stacks = flatten(headers.map(toStacks));
      for (let stack of stacks) {
        stack.unshift(header);
      }
      return stacks;
    }
    return [[header]];
  }
  return [];
}

export function canonizeRowGroupsLayout(rowGroups = [{id: DEFAULT_ROW_GROUP_ID}], dataSets = []) {
  const canonicRowGroups = [];

  for (const {id, sizing, height, className} of rowGroups) {
    for (const dataSet of dataSets) {
      const {targetRowGroupId = DEFAULT_ROW_GROUP_ID, rows = [], offset = 0, totalCount = rows.length} = dataSet;

      if (id == targetRowGroupId) {
        const style = {};
        if (sizing == Sizing.FIXED) {
          style.flex = '0 0 auto';
          if (height > 0) {
            style.height = `${height}px`;
          }
        } else {
          if (height > 0) {
            style.flex = `${height} 1 auto`;
            style.minHeight = `${height}px`;
          } else {
            style.flex = '1 1 auto';
          }
        }
        // Original data set is also stored here to provide it to `onDataSetRowsRangeRequired` as is.
        canonicRowGroups.push({id, dataSet, style, className, offset, totalCount, rows});
        break;
      }
    }
  }
  return canonicRowGroups;
}

export function canonizeLayout(model) {
  const {colGroups = [{id: DEFAULT_COL_GROUP_ID}], headers = []} = model;

  let canonicRowGroups = canonizeRowGroupsLayout(model.rowGroups, model.dataSets),
      canonicColGroups = [],
      existingStacks = flatten(headers.map(toStacks)),
      totalFluid = 0, // Table total fluid width.
      totalFixed = 0;

  for (const {id, sizing, className, scrollBox} of colGroups) {
    let cols = [], // Descriptors for <col> elements.
        fluid = 0, // Colgroup fluid width.
        fixed = 0; // Colgroup fixed width.

    for (const stack of existingStacks) {
      const {column} = stack[stack.length - 1],
            {targetColgroupId = DEFAULT_COL_GROUP_ID, width = 80} = column;
      if (column.hidden) {
        continue; // Ignore hidden columns.
      }
      if (id === targetColgroupId) {
        let col = {stack, column, fixed: 0, fluid: 0, style: {}};
        if (column.sizing == Sizing.FLUID) {
          fluid += width;
          col.fluid = width;
        } else {
          fixed += width;
          col.fixed = width;
        }
        cols.push(col);
      }
    }
    if (cols.length) {
      for (const col of cols) {
        if (col.fluid) {
          let ratio = col.fluid / fluid;
          col.style.width = `calc(${ratio * 100}% - ${Math.round(fixed * ratio)}px)`;
        } else {
          col.style.width = `${col.fixed}px`;
        }
        // Save user-provided style to target <col> style.
        Object.assign(col.style, col.column.style);
      }
      if (sizing == Sizing.FLUID) {
        if (fluid) {
          totalFluid += fixed + fluid;
        } else {
          totalFixed += fixed;
        }
      } else {
        totalFixed += fixed + fluid;
      }
      canonicColGroups.push({cols, fixed, fluid, sizing, scrollBox, style: {}, constraints: {}, className});
    }
  }

  let tableMinWidth;

  for (const {fluid, fixed, sizing, style, constraints} of canonicColGroups) {
    const width = fixed + fluid; // Minimum width of colgroup.

    if (sizing == Sizing.FLUID) {
      constraints.minWidth = `${width}px`;
      if (fluid) {
        // Colgroup is fluid and has fluid columns.
        let ratio = width / totalFluid;
        style.width = `calc(${ratio * 100}% - ${Math.round(totalFixed * ratio)}px)`;
      } else {
        // Colgroup is fluid but has no fluid columns.
        style.width = `calc(100% - ${totalFixed - width}px)`;
        style.maxWidth = `${width}px`;
      }
    } else {
      tableMinWidth += width;
      style.width = `${width}px`;
    }
  }
  return {canonicRowGroups, canonicColGroups, style: {minWidth: `${tableMinWidth}px`}};
}
