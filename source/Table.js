import React from 'react';
import {GenericScrollBox} from 'react-scroll-box';
import {Sizing, TableStructureShape, DataSetShape, toStacksByColgroup} from './TableShape';

export class Table extends React.Component {

  static propTypes = {
    structure: TableStructureShape.isRequired,
    dataSet: DataSetShape.isRequired
  };

  _renderThead(stacks, table = [], depth = 0) {
    if (table.length <= depth) {
      table[depth] = [];
    }
    for (let i = 0; i < stacks.length; ++i) {
      let header = stacks[i][depth];
      // Last header in stack has no sub-headers by definition.
      if (depth < stacks[i].length - 1) {
        let colSpan = [stacks[i]];
        // Siblings that can be joined are added to colspan.
        for (var j = i + 1; j < stacks.length; ++j) {
          if (depth < stacks[j].length && stacks[i][depth].caption == stacks[j][depth].caption) {
            colSpan.push(stacks[j]);
          } else {
            break;
          }
        }
        i = j - 1;
        this._renderThead(colSpan, table, depth + 1);
        table[depth].push(<th key={table[depth].length} colSpan={colSpan.length}>{header.caption}</th>);
      } else {
        let totalDepth = 0;
        for (let stack of stacks) {
          totalDepth = Math.max(totalDepth, stack.length);
        }
        table[depth].push(<th key={table[depth].length} rowSpan={totalDepth - depth}>{header.caption}</th>);
      }
    }
    return table;
  }

  _renderCols(stacks) {
    let cols = [];
    let fluid = [],
        fluidTotal = 0,
        fixed = [], // Fixed widths of columns.
        fixedTotal = 0;  // Total fixed width of colgroup.
    for (let i = 0; i < stacks.length; ++i) {
      fixed[i] = 0;
      fluid[i] = 0;
      let {visible = true, width = 1, sizing = Sizing.FIXED} = stacks[i][stacks[i].length - 1].column;
      if (!visible) {
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
    for (let i = 0; i < stacks.length; ++i) {
      let style = {};
      if (fluid[i]) {
        let ratio = fluid[i] / fluidTotal;
        style.width = `calc(${ratio * 100}% - ${fixedTotal * ratio}px)`;
        style.minWidth = fluid[i] + 'px';
      } else {
        style.width = fixed[i] + 'px';
      }
      cols.push(<col key={i} style={style}/>);
    }
    return cols;
    //// Colgroup content must be equal to or wider than sum of widths of contained columns.
    //// We must set this size to prevent column overlapping if their shift is fluid and thou
    //// depends on container (colgroup) width.
    //colgroup.tbodyDataRowsContentElement.style.minWidth = fixedTotal + fluidTotal - 1 + 'px';
    //colgroup.tbodyPinnedRowsContentElement.style.minWidth = fixedTotal + fluidTotal - 1 + 'px';
  }

  _renderTbody(stacks, dataSet) {
    let table = [];
    for (let i = 0; i < dataSet.result.length; ++i) {
      table[i] = [];
      for (let j = 0; j < stacks.length; ++j) {
        table[i].push(<td key={j}>{dataSet.result[i][stacks[j][stacks[j].length - 1].column.key]}</td>);
      }
    }
    return table;
  }

  _computeColgroupWidths(colgroups, colgroupStacks) {
    let fixed = [],
        fluid = [],
        totalFluid = 0, // Total fluid width of given colgroups.
        totalFixed = 0, // Total fixed width of given colgroups.
        colgroupsFixed = 0; // Sum of widths of fixed (non-shrinkable) colgroups.

    for (let i = 0; i < colgroups.length; ++i) {
      let {headers, sizing} = colgroups[i];


      [fluid[i], fixed[i]] = this._reflowHeaderWidths(headers);


      switch (sizing) {

        case Sizing.FLUID:
          if (fluid[i]) {
            totalFluid += fixed[i] + fluid[i];
          } else {
            totalFixed += fixed[i];
          }
          continue;

        case Sizing.FIXED:
          totalFixed += fixed[i] + fluid[i];
          continue;

        default:
          throw new Error(`Expected colgroup sizing to be ${Sizing.FLUID} or ${Sizing.FIXED}`);
      }
    }
    for (let i = 0; i < colgroups.length; ++i) {
      let {style: headStyle} = colgroups[i].headElement,
        {style: bodyStyle} = findDOMNode(colgroups[i].bodyComponent),
        width = fixed[i] + fluid[i];
      switch (colgroups[i].sizing) {

        case Sizing.FLUID:
          if (fluid[i]) {
            // Colgroup is fluid and has fluid columns.
            let ratio = width / totalFluid;
            headStyle.width = bodyStyle.width = `calc(${ratio * 100}% - ${totalFixed * ratio}px)`;
            headStyle.maxWidth = bodyStyle.maxWidth = 'none';
          } else {
            // Colgroup is fluid but has no fluid columns.
            headStyle.width = bodyStyle.width = `calc(100% - ${totalFixed - width}px)`;
            headStyle.maxWidth = bodyStyle.maxWidth = width + 'px';
          }
          continue;

        case Sizing.FIXED:
          // Colgroup has fixed widths and cannot be shrinked, so it constraints
          // minimum width of the whole table.
          headStyle.width = bodyStyle.width = width + 'px';
          headStyle.maxWidth = bodyStyle.maxWidth = 'none';
          colgroupsFixed += width;
      }
    }
    return colgroupsFixed;
  }

  render() {
    const {style, className, structure, dataSet} = this.props;
    let classNames = ['data-table'];
    if (className) {
      classNames = classNames.concat(className);
    }

    let colgroupStacks = toStacksByColgroup(structure);

    return (
      <div style={style}
           className={classNames.join(' ')}>
        {colgroupStacks.map(stacks => {

          let thead = this._renderThead(stacks),
              tbody = this._renderTbody(stacks, dataSet),
              colgroup = <colgroup>{this._renderCols(stacks)}</colgroup>;

          return (
            <div className="data-table__colgroup" style={{width: '100%'}}>
              <div className="data-table__thead">
                <table>
                  {colgroup}
                  <thead>
                  {thead.map((tr, i) => <tr key={i}>{tr}</tr>)}
                  </thead>
                  <tbody>
                  {tbody.map((td, i) => <tr key={i}>{td}</tr>)}
                  </tbody>
                </table>
              </div>
              <GenericScrollBox className="data-table__tbody scroll-box--wrapped">
                <div className="scroll-box__viewport">
                  <table>
                    {colgroup}
                    <tbody>
                    {tbody.map((td, i) => <tr key={i}>{td}</tr>)}
                    </tbody>
                  </table>
                </div>
              </GenericScrollBox>
            </div>
          );
        })}
      </div>
    );
  }
}
