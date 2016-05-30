import React from 'react';
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
        style.minWidth = 0;
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

  render() {
    const {style, className, structure, dataSet} = this.props;
    let classNames = ['data-table'];
    if (className) {
      classNames = classNames.concat(className);
    }

    let colgroupStacks = toStacksByColgroup(structure),
        thead = this._renderThead(colgroupStacks[0]),
        tbody = this._renderTbody(colgroupStacks[0], dataSet),
        colgroup = <colgroup>{this._renderCols(colgroupStacks[0])}</colgroup>;

    return (
      <div style={style}
           className={classNames.join(' ')}>
        <div className="data-table__thead">
          <table style={{width: '100%'}}>
            {colgroup}
            <thead>
              {thead.map((tr, i) => <tr key={i}>{tr}</tr>)}
            </thead>
            <tbody>
              {tbody.map((td, i) => <tr key={i}>{td}</tr>)}
            </tbody>
          </table>
        </div>
        <div className="data-table__tbody">
          <table style={{width: '100%'}}>
            {colgroup}
            <tbody>
              {tbody.map((td, i) => <tr key={i}>{td}</tr>)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}
