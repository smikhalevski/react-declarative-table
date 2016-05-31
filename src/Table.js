import React from 'react';
import {findDOMNode} from 'react-dom';
import {GenericScrollBox} from 'react-scroll-box';
import {Sizing, TableStructureShape, DataSetShape} from './TableShape';
import {toRenderState} from './TableModel';

export class Table extends React.Component {

  static propTypes = {
    structure: TableStructureShape.isRequired,
    dataSet: DataSetShape.isRequired
  };

  _renderState;

  _renderThead(colgroupStacks, table = [], depth = 0) {
    if (table.length <= depth) {
      table[depth] = [];
    }
    for (let i = 0; i < colgroupStacks.length; ++i) {
      let header = colgroupStacks[i][depth];
      // Last header in stack has no sub-headers by definition.
      if (depth < colgroupStacks[i].length - 1) {
        let colSpan = [colgroupStacks[i]];
        // Siblings that can be joined are added to colspan.
        for (var j = i + 1; j < colgroupStacks.length; ++j) {
          if (depth < colgroupStacks[j].length && colgroupStacks[i][depth].caption == colgroupStacks[j][depth].caption) {
            colSpan.push(colgroupStacks[j]);
          } else {
            break;
          }
        }
        i = j - 1;
        this._renderThead(colSpan, table, depth + 1);
        table[depth].push(<th key={table[depth].length} colSpan={colSpan.length}>{header.caption}</th>);
      } else {
        let totalDepth = 0;
        for (let stack of colgroupStacks) {
          totalDepth = Math.max(totalDepth, stack.length);
        }
        table[depth].push(<th key={table[depth].length} rowSpan={totalDepth - depth} style={{height: '100%'}}>{header.caption}</th>);
      }
    }
    return table;
  }

  _renderTbody(colgroupStacks, dataSet) {
    let table = [];
    for (let i = 0; i < dataSet.result.length; ++i) {
      table[i] = [];
      for (let j = 0; j < colgroupStacks.length; ++j) {
        table[i].push(<td key={j}>{dataSet.result[i][colgroupStacks[j][colgroupStacks[j].length - 1].column.key]}</td>);
      }
    }
    return table;
  }

  _renderCols(colConstraints) {
    return <colgroup>{colConstraints.map((c, i) => <col key={i} style={c}/>)}</colgroup>;
  }

  onViewportScroll = targetScrollBox => {
    for (let desc of this._renderState.colgroupRenderDescriptors) {
      if (desc.scrollBox == targetScrollBox) {
        desc.thead.scrollLeft = targetScrollBox.scrollX;
      } else {
        desc.scrollBox.scrollTo(undefined, targetScrollBox.scrollY, 0, undefined, true);
      }
    }
  };

  componentDidMount() {
    let desc = this._renderState.colgroupRenderDescriptors[0];
    findDOMNode(this).style.height = desc.thead.offsetHeight + desc.tbody.offsetHeight + 'px';
  }

  render() {
    const {style, className, structure, dataSet} = this.props;
    let classNames = ['data-table'];
    if (className) {
      classNames = classNames.concat(className);
    }
    let renderState = toRenderState(structure);

    this._renderState = renderState;

    return (
      <table style={{minWidth: renderState.tableMinWidth, ...style}}
             className={classNames.join(' ')}>
        <colgroup>{renderState.colgroupRenderDescriptors.map((desc, i) => <col key={i} style={desc.colgroupConstraints}/>)}</colgroup>
        <thead>
        <tr>
          {renderState.colgroupRenderDescriptors.map((desc, i) => {
            let thead = this._renderThead(desc.colgroupStacks),
                colgroup = this._renderCols(desc.colConstraints),
                minWidth = desc.fluidTotal + desc.fixedTotal;
            return (
              <th key={i}
                  ref={ref => desc.thead = ref}
                  className="data-table__thead">
                <table className="data-table__table" style={{minWidth}}>
                  {colgroup}
                  <tbody>
                  {thead.map((tr, i) => <tr key={i}>{tr}</tr>)}
                  </tbody>
                </table>
              </th>
            );
          })}
        </tr>
        </thead>
        <tbody>
        <tr>
          {renderState.colgroupRenderDescriptors.map((desc, i) => {
            let tbody = this._renderTbody(desc.colgroupStacks, dataSet),
                colgroup = this._renderCols(desc.colConstraints),
                minWidth = desc.fluidTotal + desc.fixedTotal;
            return (
              <td key={i} className="data-table__tbody">
                <GenericScrollBox ref={ref => desc.scrollBox = ref}
                                  onViewportScroll={this.onViewportScroll}
                                  className="data-table__scroll-box scroll-box--wrapped"
                                  outset={true}>
                  <div className="scroll-box__viewport">
                    <table className="data-table__table" style={{minWidth}} ref={ref => desc.tbody = ref}>
                      {colgroup}
                      <tbody>
                      {tbody.map((td, i) => <tr key={i}>{td}</tr>)}
                      </tbody>
                    </table>
                  </div>
                </GenericScrollBox>
              </td>
            );
          })}
        </tr>
        </tbody>
      </table>
    );
  }
}
