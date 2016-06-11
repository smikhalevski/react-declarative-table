import React from 'react';
import {findDOMNode} from 'react-dom';
import {GenericScrollBox, ScrollAxes} from 'react-scroll-box';
import {Sizing, TableDataSetShape, TableColGroupShape, TableRowGroupShape, TableHeaderShape} from './TableShape';
import {canonizeLayout} from './TableModel';

const {bool, number, func, oneOfType, string, arrayOf} = React.PropTypes;

export function renderColgroup(cols) {
  let colgroupContent = [];
  for (let col of cols) {
    colgroupContent.push(<col key={colgroupContent.length} style={col.style}/>);
  }
  return <colgroup>{colgroupContent}</colgroup>;
}

export function equalityHeaderSpanPredicate(headerI, headerJ) {
  return headerI == headerJ;
}

export function renderThead(cols, createHeaderContent, headerSpanPredicate = equalityHeaderSpanPredicate) {
  let headerDepth = 0;
  for (let col of cols) {
    headerDepth = Math.max(headerDepth, col.stack.length);
  }
  const theadContent = [];
  let colSpans = [cols];
  
  for (let depth = 0; depth < headerDepth; ++depth) {
    const trContent = [],
          nestedColSpans = [];
    for (const cols of colSpans) {
      for (let i = 0; i < cols.length; ++i) {
        const {stack: stackI} = cols[i],
              headerI = stackI[depth],
              content = createHeaderContent(headerI, stackI, headerDepth, depth);
        if (depth == stackI.length - 1) {
          // Last header in stack has no sub-headers by definition.
          trContent.push(
            <th key={trContent.length}
                rowSpan={headerDepth - depth}
                className="data-table__th data-table__th--leaf">
              {content}
            </th>
          );
          continue;
        }
        const colSpan = [cols[i]];
        for (var j = i + 1; j < cols.length; ++j) {
          const {stack: stackJ} = cols[j],
                headerJ = stackJ[depth];
          if (depth < stackJ.length && headerSpanPredicate(headerI, headerJ)) {
            colSpan.push(cols[j]);
          } else {
            break;
          }
        }
        i = j - 1;
        nestedColSpans.push(colSpan);
        trContent.push(
          <th key={trContent.length}
              colSpan={colSpan.length}
              className="data-table__th data-table__th--group">
            {content}
          </th>
        );
      }
    }
    theadContent.push(<tr key={depth} className="data-table__tr">{trContent}</tr>);
    colSpans = nestedColSpans;
  }
  return <thead>{theadContent}</thead>;
}

export function sortByRowSpanPriority({rowSpanPriority: left}, {rowSpanPriority: right}) {
  if (typeof left != 'number') {
    return 1;
  }
  if (typeof right != 'number') {
    return -1;
  }
  return right - left;
}

export function renderTbody(cols, rows, offset, createCellContent) {
  const sortedCols = cols.slice().sort(sortByRowSpanPriority),
        colContents = [];
  for (let k = 0; k < sortedCols.length; ++k) {
    const {key, rowSpanPriority, rowSpanLimit = rows.length} = sortedCols[k].column,
          colContent = [];
    let i = 0;
    while (i < rows.length) {
      let rowSpan = 1;
      if (typeof rowSpanPriority == 'number') {
        for (let j = i + 1; j < rows.length; ++j) {
          if (rows[i][key] == rows[j][key] && rowSpan < rowSpanLimit && (k == 0 || !colContents[k - 1][j])) {
            colContent[j] = null;
            rowSpan++;
          } else {
            break;
          }
        }
      }
      colContent[i] = (
        <td key={k}
            rowSpan={rowSpan}
            className="data-table__td">
          {createCellContent(rows[i], sortedCols[k].column, rowSpan)}
        </td>
      );
      i += rowSpan;
    }
    colContents[k] = colContent;
  }
  const tbodyContent = [];
  for (let i = 0; i < rows.length; ++i) {
    const trContent = [];
    for (const col of cols) {
      let k = sortedCols.indexOf(col);
      trContent.push(colContents[k][i]);
    }
    tbodyContent.push(<tr key={offset + i} className="data-table__tr">{trContent}</tr>);
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
    bufferRowCount: 1000,
    createHeaderContent: (header, stack, headerDepth, depth) => header.caption,
    createCellContent: (row, column, rowSpan) => row[column.key]
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
    headerComponent: oneOfType([func, string]),

    createHeaderContent: func,
    createCellContent: func
  };

  _checkEnoughRowsId;
  _canonicLayout; // Rendering model.

  // Offset of topmost record that component intends to render. This record may not be yet available on in data set.
  _requestedOffset = {};

  // Number of records that are intended to be rendered. These records may not be available in data set.
  _requestedRowCount = {};

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
    const {style, className, disabled, headless, estimatedRowHeight, createHeaderContent, createCellContent} = this.props;
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
          {canonicLayout.canonicColGroups.map((canonicColGroup, i) =>
            <div key={i}
                 ref={ref => canonicColGroup.thead = ref}
                 style={canonicColGroup.style}
                 className="data-table__colgroup">
              <div className="data-table__table-container"
                   style={canonicColGroup.constraints}>
                <table>
                  {renderColgroup(canonicColGroup.cols)}
                  {renderThead(canonicColGroup.cols, createHeaderContent)}
                </table>
              </div>
            </div>
          )}
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
              {canonicLayout.canonicColGroups.map((canonicColGroup, j) =>
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
                        {renderColgroup(canonicColGroup.cols)}
                        {renderTbody(canonicColGroup.cols, renderedRows, effectiveOffset, createCellContent)}
                      </table>
                    </div>
                  </div>
                </GenericScrollBox>
              )}
            </div>
          );
        })}
      </div>
    );
  }
}
