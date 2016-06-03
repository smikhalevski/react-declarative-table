import React from 'react';
import {findDOMNode} from 'react-dom';
import {GenericScrollBox, ScrollAxes} from 'react-scroll-box';
import {Sizing, TableStructureShape, DataSetShape} from './TableShape';
import {toRenderState, normalizeDataSet} from './TableModel';

const {bool, number, func} = React.PropTypes;

// Number of rows to render off-screen to make scroll re-rendering fully invisible.
const OFFSCREEN_ROW_COUNT = 8;

// OFFSCREEN_ROW_COUNT / 2 above viewport and OFFSCREEN_ROW_COUNT / 2 below viewport
const REPAINT_ZONE_ROW_COUNT = 2;

// Number of rows requested from server.
const BUFFER_SIZE = 1000;

export class Table extends React.Component {

  static defaultProps = {
    className: 'data-table--wrapped',
    disabled: false,
    headless: false,
    estimatedRowHeight: 24,
    onDataSetRowsRangeRequired: (requiredOffset, requiredLimit, dataSet) => {}
  };

  static propTypes = {
    structure: TableStructureShape.isRequired,
    dataSet: DataSetShape.isRequired,
    disabled: bool,
    headless: bool,
    estimatedRowHeight: number,
    onDataSetRowsRangeRequired: func
  };

  _checkEnoughRowsTimeout;
  _renderState; // Rendering model.
  _normalizedDataSet;
  _effectiveOffset;

  // Offset of topmost record that component intends to render. This record may not be yet available on in data set.
  _requestedOffset = 0;

  // Number of records that are intended to be rendered. These records may not be available in data set.
  _requestedRowCount = 0;

  // Rows that are actually rendered in table. They are always empty on initial render to speed up showing table
  // structure to user.
  _renderedRows;

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

  _renderTbody(colgroupStacks, rows) {
    let table = [];
    for (let i = 0; i < rows.length; ++i) {
      table[i] = [];
      for (let j = 0; j < colgroupStacks.length; ++j) {
        table[i].push(<td key={j}>{rows[i][colgroupStacks[j][colgroupStacks[j].length - 1].column.key]}</td>);
      }
    }
    return table;
  }

  _renderCols(colConstraints) {
    return <colgroup>{colConstraints.map((c, i) => <col key={i} style={c}/>)}</colgroup>;
  }

  _checkEnoughRows() {
    const {estimatedRowHeight, onDataSetRowsRangeRequired} = this.props;
    let scrollBox = this._renderState.colgroupRenderDescriptors[0].scrollBoxRef;

    // Offset of viewport in rows.
    const viewportOffset = Math.floor(scrollBox.scrollY / estimatedRowHeight);

    // Number of rows that are visible on screen.
    const viewportRowCount = Math.ceil(findDOMNode(scrollBox).clientHeight / estimatedRowHeight);

    const {_requestedOffset: offset, _requestedRowCount: rowCount} = this;

    const dataSet = this._normalizedDataSet,
          totalRowCount = dataSet.count,
          effectiveOffset = this._effectiveOffset;

    const isDangerAbove = offset > 0 && offset + REPAINT_ZONE_ROW_COUNT >= viewportOffset,
          isDangerBelow = offset + rowCount < totalRowCount && Math.max(0, offset + rowCount - REPAINT_ZONE_ROW_COUNT) <= viewportOffset + viewportRowCount,
          isRowsDisappeared = offset + rowCount > totalRowCount;

    if (isDangerAbove || isDangerBelow || isRowsDisappeared) {
      // Render of additional rows required because user has reached danger zones while scrolling.

      let offset = Math.min(dataSet.count - viewportRowCount, viewportOffset) - OFFSCREEN_ROW_COUNT / 2;
      this._requestedOffset = Math.max(0, Math.floor(offset));
      this._requestedRowCount = Math.min(viewportRowCount + OFFSCREEN_ROW_COUNT + Math.min(0, offset), totalRowCount - this._requestedOffset);

      // Request new data set range is required rendering range is out of its bounds.
      const isInsufficientAbove = this._requestedOffset < effectiveOffset,
            isInsufficientBelow = this._requestedOffset + this._requestedRowCount > effectiveOffset + dataSet.result.length;

      if (isInsufficientAbove || isInsufficientBelow) {
        let bufferOffset = Math.round(this._requestedOffset - (BUFFER_SIZE - this._requestedRowCount) / 2);
        onDataSetRowsRangeRequired(Math.max(0, bufferOffset), BUFFER_SIZE + Math.min(0, bufferOffset), this.props.dataSet);

        // TODO Do we need to re-render here?
        this.setState({});
      } else {
        // Just request component repaint.
        this.setState({});
      }
    }
  }

  componentDidMount () {
    let scheduledCheckEnoughRows = () => {
      this._checkEnoughRows();
      this._checkEnoughRowsTimeout = setTimeout(scheduledCheckEnoughRows, 200);
    };
    scheduledCheckEnoughRows();
  }

  componentWillUnmount() {
    clearTimeout(this._checkEnoughRowsTimeout);
  }

  onViewportScroll = targetScrollBox => {
    for (let desc of this._renderState.colgroupRenderDescriptors) {
      if (!desc.scrollBoxRef) {
        continue;
      }
      if (desc.scrollBoxRef == targetScrollBox) {
        if (desc.thead) {
          desc.thead.scrollLeft = targetScrollBox.scrollX;
        }
      } else {
        desc.scrollBoxRef.scrollTo(undefined, targetScrollBox.scrollY, 0, undefined, true);
      }
    }
  };

  render() {
    const {style, className, structure, dataSet, disabled, headless, estimatedRowHeight} = this.props;
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
    let renderState = toRenderState(structure);
    let normalizedDataSet = normalizeDataSet(dataSet);

    this._renderState = renderState;
    this._normalizedDataSet = normalizedDataSet;
    this._effectiveOffset = Math.min(normalizedDataSet.offset, normalizedDataSet.count - this._requestedRowCount);

    // Create an array of rows that should be rendered on viewport. This array can contain less rows than
    // `_requestedRowCount`, because some of them (leading or trailing) may not be available in data set.
    let skipOffset = Math.max(0, this._requestedOffset - this._effectiveOffset);
    this._renderedRows = normalizedDataSet.result.slice(skipOffset, skipOffset + this._requestedRowCount);

    let topOffset = this._effectiveOffset + Math.max(0, this._requestedOffset - this._effectiveOffset);
    let topMargin = topOffset * estimatedRowHeight;
    let bottomMargin = (normalizedDataSet.count - topOffset - this._renderedRows.length) * estimatedRowHeight;

    if (!headless) {
      var theadGroup = (
        <div className="data-table__thead">
          {renderState.colgroupRenderDescriptors.map((desc, i) => {
            let thead = this._renderThead(desc.colgroupStacks),
                colgroup = this._renderCols(desc.colConstraints);
            return (
              <div key={i}
                   ref={ref => desc.thead = ref}
                   style={desc.colgroupConstraints}
                   className="data-table__colgroup">
                <table className="data-table__table"
                       style={{minWidth: desc.colgroupMinWidth}}>
                  {colgroup}
                  <tbody>
                  {thead.map((tr, i) => <tr key={i}>{tr}</tr>)}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className={classNames.join(' ')}
           style={{minWidth: renderState.tableMinWidth, ...style}}>
        {theadGroup}
        <div className="data-table__tbody">
          {renderState.colgroupRenderDescriptors.map((desc, i) => {
            let tbody = this._renderTbody(desc.colgroupStacks, this._renderedRows),
                colgroup = this._renderCols(desc.colConstraints);
            return (
              <GenericScrollBox {...desc.scrollBox}
                                key={i}
                                ref={ref => desc.scrollBoxRef = ref}
                                onViewportScroll={this.onViewportScroll}
                                axes={ScrollAxes.XY}
                                disabled={disabled}
                                style={desc.colgroupConstraints}
                                className="data-table__colgroup">
                <div className="scroll-box__viewport">
                  <table className="data-table__table"
                         style={{minWidth: desc.colgroupMinWidth, margin: `${topMargin}px 0 ${bottomMargin}px`}}
                         ref={ref => desc.tbody = ref}>
                    {colgroup}
                    <tbody>
                    {tbody.map((td, i) => <tr key={i}>{td}</tr>)}
                    </tbody>
                  </table>
                </div>
              </GenericScrollBox>
            );
          })}
        </div>
      </div>
    );
  }
}
