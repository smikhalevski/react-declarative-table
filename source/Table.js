import React from 'react';
import {TableStructureShape, toStacksByColgroup} from './TableStructureShape';
import {DataSetShape} from './DataSetShape';

const {any} = React.PropTypes;

export class Table extends React.Component {

  static propTypes = {
    structure: TableStructureShape.isRequired,
    dataSet: DataSetShape.isRequired
  };

  _defaultIsJoinable = (stackI, stackJ, depth) => stackI[depth].caption == stackJ[depth].caption;

  _renderHeaders(stacks, isJoinable, thead = [], depth = 0) {
    let tr = thead[depth] = thead[depth] || []; // tr at requested depth.
    for (let i = 0; i < stacks.length; ++i) {
      let colSpan, header = stacks[i][depth];
      // Last header in stack has no sub-headers by definition.
      if (depth < stacks[i].length - 1) {
        colSpan = [stacks[i]];

        // Siblings that can be joined are added to colspan.
        for (var j = i + 1; j < stacks.length; ++j) {
          if (depth < stacks[j].length && isJoinable(stacks[i], stacks[j], depth)) {
            colSpan.push(stacks[j]);
          } else {
            break;
          }
        }
        i = j - 1;
        this._renderHeaders(colSpan, isJoinable, thead, depth + 1);
      }
      let th,
          key = (depth + 1) * tr.length,
          caption = header.caption || header.column.key;
      if (colSpan) {
        th = <th key={key} colSpan={colSpan.length} header={header}>{caption}</th>
      } else {
        let stackDepth = 0;
        for (let stack of stacks) {
          stackDepth = Math.max(stackDepth, stack.length);
        }
        th = <th key={key} rowSpan={stackDepth - depth} header={header}>{caption}</th>;
      }
      thead[depth].push(th);
    }
    return thead;
  }

  render() {
    const {style, className, structure} = this.props;
    let classNames = ['data-table'];
    if (className) {
      classNames = classNames.concat(className);
    }

    let groups = toStacksByColgroup(structure);

    let thead = this._renderHeaders(groups[0], this._defaultIsJoinable);

    return (
      <div style={style}
           className={classNames.join(' ')}>
        <div className="data-table__thead">
          <table>
            <thead>
              {thead.map((tr, i) => <tr key={i}>{tr}</tr>)}
            </thead>
          </table>
        </div>
        <div className="data-table__tbody">
          data-table__tbody
        </div>
      </div>
    );
  }
}
