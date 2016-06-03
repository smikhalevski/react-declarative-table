import {Sizing} from './SizingEnum';

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
 *
 * Does not make any additional copies of {@link TableHeaderShape} objects.
 *
 * @param {TableHeaderShape} header Header to convert to stacks.
 * @returns {Array.<TableHeaderStack>}
 */
export function toStacks(header) {
  if (header) {
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
  return [];
}

export function normalizeDataSet(dataSet) {
  return {offset: 0, count: dataSet.result.length, ...dataSet};
}

export function toRenderState(structure) {
  const {colgroups = [{id: 'default', sizing: 'fluid'}], headers = []} = structure;
  let colgroupRenderDescriptors = [],
      stacks = Array.prototype.concat(...headers.map(toStacks));
  for (let colgroup of colgroups) {
    let colgroupStacks = [],
        fluid = [],
        fluidTotal = 0,
        fixed = [], // Fixed widths of columns in this colgroup.
        fixedTotal = 0;  // Total fixed width of colgroup.

    for (let stack of stacks) {
      const {targetColgroupId = 'default', width = 80, hidden, sizing} = stack[stack.length - 1].column;
      if (colgroup.id === targetColgroupId) {
        let i = colgroupStacks.push(stack) - 1;
        fixed[i] = 0;
        fluid[i] = 0;
        if (hidden) {
          continue;
        }
        if (sizing == Sizing.FLUID) {
          fluidTotal += width;
          fluid[i] = width;
        } else {
          fixedTotal += width;
          fixed[i] = width;
        }
      }
    }
    if (colgroupStacks.length) {
      let colConstraints = [];
      for (let j = 0; j < colgroupStacks.length; ++j) {
        let constraints = {};
        if (fluid[j]) {
          let ratio = fluid[j] / fluidTotal;
          constraints.width = `calc(${ratio * 100}% - ${Math.round(fixedTotal * ratio)}px)`;
          constraints.minWidth = fluid[j] + 'px';
        } else {
          constraints.width = fixed[j] + 'px';
        }
        colConstraints.push(constraints);
      }
      colgroupRenderDescriptors.push({
        colgroupStacks,
        colConstraints,
        fluidTotal,
        fixedTotal,
        sizing: colgroup.sizing,
        scrollBox: colgroup.scrollBox
      });
    }
  }

  let tableFluidTotal = 0, // Total fluid width of given colgroups.
      tableFixedTotal = 0, // Total fixed width of given colgroups.
      tableMinWidth = 0; // Sum of widths of fixed (non-shrinkable) colgroups.

  for (let i = 0; i < colgroupRenderDescriptors.length; ++i) {
    const {fluidTotal, fixedTotal, sizing} = colgroupRenderDescriptors[i];
    if (sizing == Sizing.FLUID) {
      if (fluidTotal) {
        tableFluidTotal += fixedTotal + fluidTotal;
      } else {
        tableFixedTotal += fixedTotal;
      }
    } else {
      tableFixedTotal += fixedTotal + fluidTotal;
    }
  }

  for (let i = 0; i < colgroupRenderDescriptors.length; ++i) {
    let {fluidTotal, fixedTotal, sizing} = colgroupRenderDescriptors[i],
        constraints = {},
        width = fixedTotal + fluidTotal;
    if (sizing == Sizing.FLUID) {
      colgroupRenderDescriptors[i].colgroupMinWidth = width + 'px';
      if (fluidTotal) {
        // Colgroup is fluid and has fluid columns.
        let ratio = width / tableFluidTotal;
        constraints.width = `calc(${ratio * 100}% - ${Math.round(tableFixedTotal * ratio)}px)`;
      } else {
        // Colgroup is fluid but has no fluid columns.
        constraints.width = `calc(100% - ${tableFixedTotal - width}px)`;
        constraints.maxWidth = width + 'px';
      }
    } else {
      // Colgroup has fixed widths and cannot be shrinked, so it constraints
      // minimum width of the whole table.
      constraints.width = width + 'px';
      tableMinWidth += width;
    }
    colgroupRenderDescriptors[i].colgroupConstraints = constraints;
  }
  return {colgroupRenderDescriptors, tableMinWidth};
}
