import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import flatten from 'lodash/flatten';
import last from 'lodash/last';
import sortBy from 'lodash/sortBy';
import sum from 'lodash/sum';
import zip from 'lodash/zip';
import uniq from 'lodash/uniq';
import compact from 'lodash/compact';
import debounce from 'lodash/debounce';
import React, {Component, PropTypes} from 'react';
import {findDOMNode} from 'react-dom';
import classNames from 'classnames';
import {GenericScrollBox} from 'react-scroll-box';
import {TableHeader} from './TableHeader';
import {TableRow} from './TableRow';
import {Sizing} from './../source/SizingEnum';
import {getStacksByColgroup} from './TableStructureModel';
import {isHeaderVisible, toStacks, fromStacks, TABLE_HEADER_ID_KEY} from './TableHeaderModel';
import {dataSetPageRequest} from '../../DataSetModel';

const {string, shape, arrayOf, object, oneOf} = PropTypes;

export const TABLE_HEADER_MODEL_SHAPE = shape({
  id: string,
  caption: string,
  renderers: arrayOf(
    shape({
      id: string
    })
  ),
  headers: arrayOf(object),
  column: object
});

export const TABLE_MODEL_SHAPE = shape({
  structure: shape({
    colgroups: arrayOf(
      shape({
        id: string,
        sizing: oneOf(Sizing.values)
      })
    ),
    headers: arrayOf(TABLE_HEADER_MODEL_SHAPE)
  }),
  dataSet: shape({})
});

// Number of rows to render off-screen to make scroll re-rendering fully invisible.
const OFFSCREEN_ROW_COUNT = 8;

// OFFSCREEN_ROW_COUNT / 2 above viewport and OFFSCREEN_ROW_COUNT / 2 below viewport
const REPAINT_ZONE_ROW_COUNT = 2;

// Number of rows requested from server.
const BUFFER_SIZE = 1000;

const DEFAULT_ROW_HEIGHT_ESTIMATE = 24;

export class Table extends Component {

  static propTypes = {
    model: object.isRequired
  };

  static contextTypes = {
    intl: object.isRequired
  };

  // Offset of topmost record that component intends to render. This record may not be yet available on in data set.
  _requestedOffset = 0;

  // Number of records that are intended to be rendered. These records may not be available in data set.
  _requestedRowCount = 0;

  // Array of colgroup definitions recalculated on every render.
  _renderedColgroups/* = []*/;

  // Rows that are actually rendered in table. They are always empty on initial render to speed up showing table
  // structure to user.
  _renderedRows = [];

  _rowHeight = DEFAULT_ROW_HEIGHT_ESTIMATE;

  _preventEnoughRowsCheck = false;

  _debouncedReleasePreventEnoughRowsCheck = debounce(() => this._preventEnoughRowsCheck = false, 100);

  componentDidMount () {
    this._reflow();
    let scheduledCheckEnoughRows = () => {
      if (!this._isUnmounted) {
        this._checkEnoughRows();
        setTimeout(scheduledCheckEnoughRows, 200);
      }
    };
    scheduledCheckEnoughRows();
  }

  componentWillUnmount() {
    this._isUnmounted = true;
  }

  componentDidUpdate () {
    this._reflow();
  }

  onViewportScroll = scroll => {
    for (let colgroup of this._renderedColgroups) {
      if (!colgroup.tbodyDataRowsScrollComponent) {
        continue;
      }
      if (colgroup.tbodyDataRowsScrollComponent == scroll) {
        colgroup.headElement.scrollLeft = scroll.scrollX;
        colgroup.tbodyPinnedRowsContainer.scrollLeft = scroll.scrollX;
      } else {
        colgroup.tbodyDataRowsScrollComponent.scrollTo(undefined, scroll.scrollY, 0, undefined, true);
      }
    }
    //if (scroll.isDraggingHandle() || scroll.isFastTracking()) {
      this._preventEnoughRowsCheck = true;
      this._debouncedReleasePreventEnoughRowsCheck();
    //}
  };

  // Recursively render headers.
  renderHeaders(headers) {
    if (headers.length == 0) {
      return; // Nothing to render.
    }
    return (
      <div className="table__thead__content">
        {headers.map(header =>
          <div key={header.id}
               ref={header.id}
               className={classNames('table__th', {table__th_group: header.headers.length, table__th_hidden: !isHeaderVisible(header)})}>
            <div className="table__th__content">
              <TableHeader table={this.props.model}
                           header={header}/>
            </div>
            {this.renderHeaders(header.headers)}
          </div>
        )}
      </div>
    );
  }

  // Recursively and unconditionally updates widths of header elements basing on provided header models
  // and returns calculated fluid and fixed width portions in pixels.
  _reflowHeaderWidths(headers) {
    let fluid = [],
        fixed = [];
    for (let i = 0; i < headers.length; ++i) {
      fixed[i] = 0;
      fluid[i] = 0;
      let {headers: nested, column} = headers[i];
      if (Array.isArray(nested) && nested.length) {
        // Header is a group of headers.
        [fluid[i], fixed[i]] = this._reflowHeaderWidths(nested);
        continue;
      }
      if (column) {
        let {visible, sizing, width} = column;
        if (!visible) {
          continue;
        }
        if (Number.isInteger(width) && width >= 0) {
          switch (sizing) {
            case Sizing.FLUID:
              fluid[i] = width;
              continue;
            case Sizing.FIXED:
              fixed[i] = width;
              continue;
            default:
              throw new Error(`Expected column sizing to be ${Sizing.FLUID} or ${Sizing.FIXED}`);
          }
        }
        throw new Error('Expected column width to be a non-negative integer');
      }
      throw new Error('Header expected to contain either sub-headers or a column');
    }
    let totalFluid = sum(fluid),
        totalFixed = sum(fixed);

    for (let i = 0; i < headers.length; ++i) {
      const {style} = this.refs[headers[i].id];
      if (fluid[i]) {
        let ratio = fluid[i] / totalFluid,
            restFixed = Math.round(totalFixed * ratio - fixed[i]);
        if (restFixed) {
          // Table contains mixed fluid and fixed columns, so we need to
          // use calc to exclude widths of fixed widths.
          style.width = `calc(${ratio * 100}% - ${restFixed}px)`;
          style.minWidth = fixed[i] + fluid[i] + 'px';
        } else {
          // Table contains only fluid columns, so omit excessive calc.
          style.width = ratio * 100 + '%';
          style.minWidth = 0;
        }
      } else {
        // Header contains only columns with fixed width.
        style.width = fixed[i] + 'px';
      }
    }
    return [totalFluid, totalFixed];
  }

  // Unconditionally updates widths of given colgroups and returns sum of their minimum widths in pixels.
  // Provided colgroups are generated at runtime! These are not colgroup models.
  _reflowColgroupWidths(colgroups) {
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

  // Updates widths of columns in each rendered row.
  _reflowColumnWidths(colgroups) {
    // Position columns below corresponding headers and set their widths.
    for (let colgroup of colgroups) {
      let fluid = [],
          fluidTotal = 0,
          fixed = [], // Fixed widths of columns.
          fixedTotal = 0;  // Total fixed width of colgroup.
      const {columns} = colgroup;
      for (let i = 0; i < columns.length; ++i) {
        fixed[i] = 0;
        fluid[i] = 0;
        let {visible, width, sizing} = columns[i];
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
      for (let rowComponent of colgroup.rowComponents) {
        let columnElements = rowComponent.getColumnElements();
        for (let i = 0; i < columns.length; ++i) {
          const {style} = columnElements[i];
          if (fluid[i]) {
            let ratio = fluid[i] / fluidTotal;
            style.width = `calc(${ratio * 100}% - ${fixedTotal * ratio}px)`;
            style.minWidth = fluid[i] + 'px';
          } else {
            style.width = fixed[i] + 'px';
            style.minWidth = 0;
          }
        }
        let tr = findDOMNode(rowComponent);
        tr.classList.add('table__tr_ready');
      }
      // Colgroup content must be equal to or wider than sum of widths of contained columns.
      // We must set this size to prevent column overlapping if their shift is fluid and thou
      // depends on container (colgroup) width.
      colgroup.tbodyDataRowsContentElement.style.minWidth = fixedTotal + fluidTotal - 1 + 'px';
      colgroup.tbodyPinnedRowsContentElement.style.minWidth = fixedTotal + fluidTotal - 1 + 'px';
    }
  }

  _reflow() {
    //if (DEBUG) {
    //  console.time('reflow');
    //}
    findDOMNode(this).style.minWidth = this._reflowColgroupWidths(this._renderedColgroups) + 'px';
    this._reflowColumnWidths(this._renderedColgroups);

    const {count} = this.props.model.dataSet,
          effectiveOffset = this._getEffectiveOffset(this.props);
    const bodyOffset = effectiveOffset + Math.max(0, this._requestedOffset - effectiveOffset);

    for (let colgroup of this._renderedColgroups) {
      let {style} = colgroup.tbodyDataRowsContentElement;
      style.paddingTop = bodyOffset * this._rowHeight + 'px';
      style.height = count * this._rowHeight + 'px';
    }
    //if (DEBUG) {
    //  console.timeEnd('reflow');
    //}
  }

  _checkEnoughRows() {
    if (this._preventEnoughRowsCheck) {
      return;
    }
    let [colgroup] = this._renderedColgroups;
    if (!colgroup) {
      return; // Not rendered.
    }
    // Offset of viewport in rows.
    const viewportOffset = Math.floor(colgroup.tbodyDataRowsScrollComponent.scrollY / this._rowHeight);

    // Number of rows that are visible on screen.
    const viewportRowCount = Math.ceil(findDOMNode(colgroup.tbodyDataRowsScrollComponent).clientHeight / this._rowHeight);

    const {_requestedOffset: offset, _requestedRowCount: rowCount} = this;

    const dataSet = this.props.model.dataSet,
          totalRowCount = dataSet.count,
          effectiveOffset = this._getEffectiveOffset(this.props);

    const isDangerAbove = offset > 0 && offset + REPAINT_ZONE_ROW_COUNT >= viewportOffset,
          isDangerBelow = offset + rowCount < totalRowCount && Math.max(0, offset + rowCount - REPAINT_ZONE_ROW_COUNT) <= viewportOffset + viewportRowCount,
          isRowsDisappeared = offset + rowCount > totalRowCount;

    if (isDangerAbove || isDangerBelow || isRowsDisappeared) {
      // Render of additional rows required because user has reached danger zones while scrolling.

      let offset = Math.min(this.props.model.dataSet.count - viewportRowCount, viewportOffset) - OFFSCREEN_ROW_COUNT / 2;
      this._requestedOffset = Math.max(0, Math.floor(offset));
      this._requestedRowCount = Math.min(viewportRowCount + OFFSCREEN_ROW_COUNT + Math.min(0, offset), totalRowCount - this._requestedOffset);

      // Request new data set range is required rendering range is out of its bounds.
      const isInsufficientAbove = this._requestedOffset < effectiveOffset,
            isInsufficientBelow = this._requestedOffset + this._requestedRowCount > effectiveOffset + dataSet.rows.length;

      if (isInsufficientAbove || isInsufficientBelow) {
        let bufferOffset = Math.round(this._requestedOffset - (BUFFER_SIZE - this._requestedRowCount) / 2);
        this.props.dispatch(dataSetPageRequest(dataSet.id, Math.max(0, bufferOffset), BUFFER_SIZE + Math.min(0, bufferOffset)));
      } else {
        // Just request component repaint.
        this.setState({});
      }
    }
  }

  shouldComponentUpdate(props, state, context) {
    // Create an array of rows that should be rendered on viewport. This array can contain less rows than
    // `_requestedRowCount`, because some of them (leading or trailing) may not be available in data set.
    let skipOffset = Math.max(0, this._requestedOffset - this._getEffectiveOffset(props));
    let renderedRows = props.model.dataSet.rows.slice(skipOffset, skipOffset + this._requestedRowCount);

    let hasChanges =
      !isEqual(this.props.model.structure, props.model.structure) ||
      !isEqual(this._renderedRows, renderedRows) ||
      !isEqual(omit(this.props.model.dataSet, 'result', 'rows'), omit(props.model.dataSet, 'result', 'rows')) ||
      !isEqual(this.props.model.pinnedRowsDataSet, props.model.pinnedRowsDataSet);

    this._renderedRows = renderedRows;

    // TODO Remove intl dependency from here
    let locale = context.intl.locale;
    if (this.__locale != locale) {
      this.__locale = locale;
      return true;
    }

    return hasChanges;
  }

  _getEffectiveOffset(props) {
    return Math.min(props.model.dataSet.offset, props.model.dataSet.count - this._requestedRowCount);
  }

  render() {
    const {model, modifiers} = this.props;
    const {structure, dataSet, pinnedRowsDataSet = {rows: []}} = model;

    // Condition on which headers at certain level in stack can be merged into one.
    let isJoinable = (stackI, stackJ, depth) => stackI[depth].caption == stackJ[depth].caption;

    // Assemble info about colgroup that should be rendered.
    this._renderedColgroups = [];
    for (let [i, stacks] of getStacksByColgroup(structure).entries()) {
      if (stacks.length == 0) {
        continue; // Colgroup is not referenced by any column.
      }
      // Restore structure of headers from stacks. It may differ from one in view definition,
      // because columns were reordered while aligning them to colgroups.
      let headers = fromStacks(stacks, isJoinable),
          columns = [];
      stacks = flatten(headers.map(toStacks));
      for (let stack of stacks) {
        columns.push(last(stack).column);
      }
      let colgroup = {
        ...structure.colgroups[i],
        headers,
        columns,
        headElement: null,
        tbodyDataRowsScrollComponent: null,
        bodyComponent: null,
        tbodyDataRowsContentElement: null,
        rowComponents: []
      };
      this._renderedColgroups.push(colgroup);
    }

    return (
      <div className={classNames('table', structure.modifiers, modifiers)}>
        <div className="table__thead">
          {this._renderedColgroups.map(colgroup =>
            <div key={colgroup.id}
                 ref={ref => colgroup.headElement = ref}
                 className="table__colgroup">
              {this.renderHeaders(colgroup.headers)}
            </div>
          )}
        </div>
        <div className="table__tbody">
          {this._renderedColgroups.map(colgroup =>
            <div key={colgroup.id}
                 ref={ref => colgroup.bodyComponent = ref}
                 className="table__colgroup">
              <div className="table__colgroup__pinned-rows"
                   ref={ref => colgroup.tbodyPinnedRowsContainer = ref}>
                <div className="table__tbody__content"
                     ref={ref => colgroup.tbodyPinnedRowsContentElement = ref}>
                  {pinnedRowsDataSet.rows.map((row, i) =>
                    <TableRow key={row.id}
                              ref={ref => colgroup.rowComponents.push(ref)}
                              table={model}
                              row={row}
                              columns={colgroup.columns}/>
                  )}
                </div>
              </div>
              <GenericScrollBox className="table__colgroup__data-rows scroll-box--wrapped"
                                ref={ref => colgroup.tbodyDataRowsScrollComponent = ref}
                                captureKeyboard={true}
                                outset={true}
                                onViewportScroll={this.onViewportScroll}>
                <div className="scroll-box__viewport">
                  <div className="table__tbody__content"
                       ref={ref => colgroup.tbodyDataRowsContentElement = ref}
                       data-offset={this._requestedOffset}
                       data-parity={this._requestedOffset % 2 ? 'even' : 'odd'}>
                    {this._renderedRows.map((row, i) =>
                      <TableRow key={row.id}
                                ref={ref => colgroup.rowComponents.push(ref)}
                                table={model}
                                row={row}
                                columns={colgroup.columns}/>
                    )}
                  </div>
                </div>
              </GenericScrollBox>
            </div>
          )}
        </div>
      </div>
    );
  }
}
