import React from 'react';
import {findDOMNode} from 'react-dom';
import {GenericScrollBox, ScrollAxes} from 'react-scroll-box';
import {Sizing, TableDataSetShape, TableColGroupShape, TableRowGroupShape, TableHeaderShape} from './TableShape';
import {toRenderState, normalizeDataSet, canonizeLayout} from './TableModel';

const {bool, number, func, oneOfType, string, arrayOf} = React.PropTypes;

export class Table extends React.Component {

  static defaultProps = {
    className: 'data-table--wrapped',
    disabled: false,
    headless: false,
    estimatedRowHeight: 24,
    cellComponent: null,
    headerComponent: null,
    onDataSetRowsRangeRequired: (requiredOffset, requiredLimit, dataSet) => {},
    // Number of rows to render off-screen to make scroll re-rendering fully invisible.
    offscreenRowCount: 8,
    // `offscreenRowCount / 2` above viewport and `offscreenRowCount / 2` below viewport
    repaintZoneRowCount: 2,
    // Number of rows requested from server.
    bufferRowCount: 1000
  };

  static propTypes = {
    colGroups: arrayOf(TableColGroupShape.isRequired),
    rowGroups: arrayOf(TableRowGroupShape.isRequired),
    headers: arrayOf(TableHeaderShape.isRequired),
    dataSets: arrayOf(TableDataSetShape.isRequired),

    disabled: bool,
    headless: bool,
    estimatedRowHeight: number,
    onDataSetRowsRangeRequired: func,
    offscreenRowCount: number,
    repaintZoneRowCount: number,
    bufferRowCount: number,
    cellComponent: oneOfType([func, string]),
    headerComponent: oneOfType([func, string])
  };

  _checkEnoughRowsId;
  _canonicLayout; // Rendering model.

  // Offset of topmost record that component intends to render. This record may not be yet available on in data set.
  _requestedOffset = {};

  // Number of records that are intended to be rendered. These records may not be available in data set.
  _requestedRowCount = {};

  _renderHeader(header) {
    const {headerComponent} = this.props;
    if (headerComponent) {
      return React.createElement(headerComponent, {header, table: this.props});
    }
    return header.caption;
  }

  _renderCell(row, column) {
    const {cellComponent} = this.props;
    if (cellComponent) {
      return React.createElement(cellComponent, {row, column, table: this.props});
    }
    return row[column.key];
  }

  _renderRow(tds, i) {
    return <tr key={i}>{tds}</tr>;
  }

  _renderThead(cols, table = [], depth = 0) {
    if (table.length <= depth) {
      table[depth] = [];
    }
    for (let i = 0; i < cols.length; ++i) {
      let header = cols[i].stack[depth];
      // Last header in stack has no sub-headers by definition.
      if (depth < cols[i].stack.length - 1) {
        let colSpan = [cols[i]];
        // Siblings that can be joined are added to colspan.
        for (var j = i + 1; j < cols.length; ++j) {
          if (depth < cols[j].stack.length && cols[i].stack[depth].caption == cols[j].stack[depth].caption) {
            colSpan.push(cols[j]);
          } else {
            break;
          }
        }
        i = j - 1;
        this._renderThead(colSpan, table, depth + 1);
        table[depth].push(<th key={table[depth].length} className="data-table__th" colSpan={colSpan.length}>{this._renderHeader(header)}</th>);
      } else {
        let totalDepth = 0;
        for (let col of cols) {
          totalDepth = Math.max(totalDepth, col.stack.length);
        }
        table[depth].push(<th key={table[depth].length} className="data-table__th" rowSpan={totalDepth - depth} style={{height: '100%'}}>{this._renderHeader(header)}</th>);
      }
    }
    return table;
  }

  _renderTbody(cols, rows, effectiveOffset) {
    let table = [];
    for (let i = 0; i < rows.length; ++i) {
      table[i] = [];
      for (let j = 0; j < cols.length; ++j) {
        table[i].push(<td key={effectiveOffset + j} className="data-table__td">{this._renderCell(rows[i], cols[j].column)}</td>);
      }
    }
    return table;
  }

  _renderCols(cols) {
    return <colgroup>{cols.map((col, i) => <col key={i} style={col.style}/>)}</colgroup>;
  }

  _checkEnoughRows() {
    const {_requestedOffset, _requestedRowCount} = this;
    const {estimatedRowHeight, onDataSetRowsRangeRequired, repaintZoneRowCount, offscreenRowCount, bufferRowCount} = this.props;

    let scrollBox = this._renderState.colgroupRenderDescriptors[0].scrollBoxRef;
    if (!scrollBox) {
      return;
    }

    // Offset of viewport in rows.
    const viewportOffset = Math.floor(scrollBox.scrollY / estimatedRowHeight);

    // Number of rows that are visible on screen.
    const viewportRowCount = Math.ceil(this._referenceScrollBoxEl.clientHeight / estimatedRowHeight);

    const dataSet = this._normalizedDataSet,
          availableRowCount = dataSet.totalCount,
          effectiveOffset = this._effectiveOffset;

    const isDangerAbove = _requestedOffset > 0 && _requestedOffset + repaintZoneRowCount >= viewportOffset,
          isDangerBelow = _requestedOffset + _requestedRowCount < availableRowCount && Math.max(0, _requestedOffset + _requestedRowCount - repaintZoneRowCount) <= viewportOffset + viewportRowCount,
          isRowsDisappeared = _requestedOffset + _requestedRowCount > availableRowCount;

    if (isDangerAbove || isDangerBelow || isRowsDisappeared) {
      // Render of additional rows required because user has reached danger zones while scrolling.
      let offset = Math.min(availableRowCount - viewportRowCount, viewportOffset) - offscreenRowCount / 2;

      this._requestedOffset = Math.max(0, Math.floor(offset));
      this._requestedRowCount = Math.min(viewportRowCount + offscreenRowCount + Math.min(0, offset), availableRowCount - this._requestedOffset);

      // Request new data set range is required rendering range is out of its bounds.
      const isInsufficientAbove = this._requestedOffset < effectiveOffset,
            isInsufficientBelow = this._requestedOffset + this._requestedRowCount > effectiveOffset + dataSet.rows.length;

      if (isInsufficientAbove || isInsufficientBelow) {
        let bufferOffset = Math.round(this._requestedOffset - (bufferRowCount - this._requestedRowCount) / 2);
        onDataSetRowsRangeRequired(Math.max(0, bufferOffset), bufferRowCount + Math.min(0, bufferOffset), this.props.dataSet);

        // TODO Do we need to re-render here?
        //this.setState({});
      } else {
        // Just request component repaint.
        this.setState({});
      }
    }
  }

  componentDidMount () {
    //let scheduledCheckEnoughRows = () => {
    //  this._checkEnoughRows();
    //  this._checkEnoughRowsId = setTimeout(scheduledCheckEnoughRows, 200);
    //};
    //scheduledCheckEnoughRows();
  }

  componentWillUnmount() {
    clearTimeout(this._checkEnoughRowsId);
  }

  onViewportScroll = (targetScrollBox, rowIndex, colIndex) => {
    const {canonicRowGroups, canonicColGroups} = this._canonicLayout;
    for (let j = 0; j < canonicRowGroups[rowIndex].scrollBoxes.length; ++j) {
      if (j != colIndex) {
        canonicRowGroups[rowIndex].scrollBoxes[j].scrollTo(undefined, targetScrollBox.scrollY, 0, undefined, true);
      }
    }
    canonicColGroups[colIndex].thead.scrollLeft = targetScrollBox.scrollX;
    for (let i = 0; i < canonicRowGroups.length; ++i) {
      if (i != rowIndex) {
        canonicRowGroups[i].scrollBoxes[colIndex].scrollTo(targetScrollBox.scrollX, undefined, 0, undefined, true);
      }
    }
  };

  render() {
    const {style, className, disabled, headless, estimatedRowHeight} = this.props;
    let classNames = ['data-table'];
    if (className) {
      classNames = classNames.concat(className);
    }
    if (disabled) {
      classNames = classNames.concat('data-table--disabled');
    }
    if (headless) {
      classNames = classNames.concat('data-table--headless');
    }
    let canonicLayout = canonizeLayout(this.props);

    this._canonicLayout = canonicLayout;

    if (!headless) {
      var theadGroup = (
        <div className="data-table__thead">
          {canonicLayout.canonicColGroups.map((canonicColGroup, i) => {
            let thead = this._renderThead(canonicColGroup.cols),
                colgroup = this._renderCols(canonicColGroup.cols);
            return (
                <div key={i}
                     ref={ref => canonicColGroup.thead = ref}
                     style={canonicColGroup.style}
                     className="data-table__colgroup">
                  <div className="data-table__table-container"
                       style={canonicColGroup.constraints}>
                    <table>
                      {colgroup}
                      <tbody>
                      {thead.map(this._renderRow)}
                      </tbody>
                    </table>
                  </div>
                </div>
            );
          })}
        </div>
      );
    }
    return (
      <div className={classNames.join(' ')}
           style={{...canonicLayout.style, ...style}}>
        {theadGroup}
        {canonicLayout.canonicRowGroups.map((canonicRowGroup, i) => {

          canonicRowGroup.tbodies = [];
          canonicRowGroup.scrollBoxes = [];

          let requestedOffset = this._requestedOffset[canonicRowGroup.id] | 0,
              requestedRowCount = this._requestedRowCount[canonicRowGroup.id] || 20;

          let effectiveOffset = Math.min(canonicRowGroup.offset, canonicRowGroup.totalCount - requestedRowCount);

          // Create an array of rows that should be rendered on viewport. This array can contain less rows than
          // `_requestedRowCount`, because some of them (leading or trailing) may not be available in data set.
          let skipOffset = Math.max(0, requestedOffset - effectiveOffset);

          // Rows that are actually rendered in table. They are always empty on initial render to speed up showing table
          // structure to user.
          let renderedRows = canonicRowGroup.rows.slice(skipOffset, skipOffset + requestedRowCount);

          let topOffset = effectiveOffset + Math.max(0, requestedOffset - effectiveOffset);
          let topMargin = topOffset * estimatedRowHeight;
          let bottomMargin = (canonicRowGroup.totalCount - topOffset - renderedRows.length) * estimatedRowHeight;

          canonicRowGroup.renderedRows = renderedRows;
          canonicRowGroup.effectiveOffset = effectiveOffset;

          let parity = 'odd';
          if (effectiveOffset % 2) {
            parity = 'even';
          }

          return (
            <div key={i}
                 className="data-table__tbody"
                 style={canonicRowGroup.style}
                 data-parity={parity}
                 data-offset={effectiveOffset}>
              {canonicLayout.canonicColGroups.map((canonicColGroup, j) => {
                let tbody = this._renderTbody(canonicColGroup.cols, renderedRows, effectiveOffset),
                    colgroup = this._renderCols(canonicColGroup.cols);
                return (
                  <GenericScrollBox {...canonicColGroup.scrollBox}
                                    key={j}
                                    ref={ref => canonicRowGroup.scrollBoxes[j] = ref}
                                    onViewportScroll={targetScrollBox => this.onViewportScroll(targetScrollBox, i, j)}
                                    axes={ScrollAxes.XY}
                                    disabled={disabled}
                                    style={canonicColGroup.style}
                                    className="data-table__colgroup">
                    <div className="scroll-box__viewport">
                      <div className="data-table__table-container"
                           style={{...canonicColGroup.constraints, margin: `${topMargin}px 0 ${bottomMargin}px`}}>
                        <table ref={ref => canonicRowGroup.tbodies[j] = ref}>
                          {colgroup}
                          <tbody>
                          {tbody.map(this._renderRow)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </GenericScrollBox>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }
}
