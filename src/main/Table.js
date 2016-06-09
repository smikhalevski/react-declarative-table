import React from 'react';
import {findDOMNode} from 'react-dom';
import {GenericScrollBox, ScrollAxes} from 'react-scroll-box';
import {Sizing, TableDataSetShape, TableColGroupShape, TableRowGroupShape, TableHeaderShape} from './TableShape';
import {canonizeLayout} from './TableModel';

const {bool, number, func, oneOfType, string, arrayOf} = React.PropTypes;

export function renderThead(cols, createHeaderContent) {
  let totalDepth = 0;
  for (let col of cols) {
    totalDepth = Math.max(totalDepth, col.stack.length);
  }
  const theadContent = [];
  let spans = [cols];
  
  for (let depth = 0; depth < totalDepth; ++depth) {
    const trContent = [],
          nestedSpans = [];
    for (const cols of spans) {
      for (let i = 0; i < cols.length; ++i) {
        const {stack: stackI} = cols[i],
              headerI = stackI[depth],
              content = createHeaderContent(headerI, stackI, totalDepth, depth);
        if (depth == stackI.length - 1) {
          // Last header in stack has no sub-headers by definition.
          trContent.push(
            <th key={trContent.length}
                rowSpan={totalDepth - depth}
                className="data-table__th data-table__th--leaf">
              {content}
            </th>
          );
          continue;
        }
        const span = [cols[i]];
        for (var j = i + 1; j < cols.length; ++j) {
          const {stack: stackJ} = cols[j],
                headerJ = stackJ[depth];
          if (depth < stackJ.length && headerI === headerJ) {
            span.push(cols[j]);
          } else {
            break;
          }
        }
        i = j - 1;
        nestedSpans.push(span);
        trContent.push(
          <th key={trContent.length}
              colSpan={span.length}
              className="data-table__th data-table__th--group">
            {content}
          </th>
        );
      }
    }
    theadContent.push(<tr key={depth} className="data-table__tr">{trContent}</tr>);
    spans = nestedSpans;
  }
  return <thead>{theadContent}</thead>;
}

export function renderTbody(cols, rows, offset, createCellContent) {
  let tbodyContent = [];

  const indices = []; // Indices of row-spanned columns in priority order.

  for (let i = 0; i < cols.length; ++i) {
    const {rowSpanPriority} = cols[i];
    if (rowSpanPriority < 0) {
      continue;
    }
    for (let j = 0; j < indices.length + 1; ++j) {
      if (indices[j] > rowSpanPriority) {
        continue;
      }
      indices.splice(j, 0, i);
      break;
    }
  }

  for (let i = 0; i < rows.length; ++i) {

    const rowSpans = [];
    let maxRowSpan = 1;
    for (let k = 0; k < indices.length; ++k) {
      let x = indices[k],
          {key} = cols[x].column;
      rowSpans[x] = 1;
      for (let j = i; j < rows.length - 1; ++j) {
        if (rowSpans[x] == rowSpans[indices[k - 1]]) {
          // Lower priority column cannot span more rows than higher priority.
          break;
        }
        if (rows[j][key] == rows[j + 1][key]) {
          rowSpans[x]++;
          maxRowSpan = Math.max(maxRowSpan, rowSpans[x]);
        } else {
          break;
        }
      }
    }

    const firstTrContent = [];
    for (let j = 0; j < cols.length; ++j) {
      firstTrContent.push(<td key={j} rowSpan={rowSpans[j]} className="data-table__td">{rows[i][cols[i].column.key]}</td>);
      rowSpans[j]--;
    }
    tbodyContent.push(<tr key={offset + tbodyContent.length} className="data-table__tr">{firstTrContent}</tr>);

    for (let k = 1; k < maxRowSpan; ++k) {
      const trContent = [];
      for (let j = 0; j < cols.length; ++j) {
        if (rowSpans[j] > 0) {
          trContent.push(<td key={j} rowSpan={rowSpans[j]} className="data-table__td">{rows[i][cols[i].column.key]}</td>);
          rowSpans[j]--;
        }
      }
      tbodyContent.push(<tr key={offset + tbodyContent.length} className="data-table__tr">{trContent}</tr>);
    }

    i += maxRowSpan - 1;
  }

  return <tbody>{tbodyContent}</tbody>;
}












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
            let colgroup = this._renderCols(canonicColGroup.cols);
            return (
                <div key={i}
                     ref={ref => canonicColGroup.thead = ref}
                     style={canonicColGroup.style}
                     className="data-table__colgroup">
                  <div className="data-table__table-container"
                       style={canonicColGroup.constraints}>
                    <table>
                      {colgroup}
                      {renderThead(canonicColGroup.cols, header => header.caption)}
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
                let colgroup = this._renderCols(canonicColGroup.cols);
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
                          {renderTbody(canonicColGroup.cols, renderedRows, effectiveOffset, (row, column) => row[column.key])}
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
