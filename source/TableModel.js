import uniqueId from 'lodash/uniqueId';
import without from 'lodash/without';
import {isState, freeze} from '../../Runtime';
import {DATA_SET_FILTER, DATA_SET_DELETE_FILTER, DATA_SET_SORT, DATA_SET_DELETE_SORT} from '../../DataSetModel';
import {reduceTableStructure} from './TableStructureModel';
import {getNestedColumns} from './TableHeaderModel';
import {reduceDataSet} from '../../DataSetModel';
import {SORT_UNSORTED} from '../../SortingModel';

export const
  TABLE_TOGGLE_PINNED_ROW = 'Table.togglePinnedRow',
  TABLE_SHOW_ALL_COLUMNS = 'TableStructure.showAllColumns';

export function tableTogglePinnedRow(tableId, dataSetId, row) {
  return {type: TABLE_TOGGLE_PINNED_ROW, payload: {tableId, dataSetId, row}};
}

export function tableShowAllColumns(tableId) {
  return {type: TABLE_SHOW_ALL_COLUMNS, payload: {tableId}};
}

/**
 * @typedef {Object}
 * @name TableModel
 * Table state unites definitions of {@link TableStructureModel|table structure} and
 * {@link DataSetModel|data set}.
 *
 * @property {String} [id] Unique table identifier, used to distinguish tables at runtime.
 * @property {TableStructureModel} [structure] Table layout structure.
 * @property {DataSetModel} [dataSet] Data set to render rows from.
 */
export function reduceTable(state, action) {
  if (isState(state)) {
    state = {
      pinnedRowIds: [],
      ...state
    };
    if (state.id == null) {
      state.id = uniqueId('table');
    }
    let {payload} = action;

    if (payload && state.id == payload.tableId) {
      switch (action.type) {

        case TABLE_SHOW_ALL_COLUMNS:
          state.structure = {
            ...state.structure,
            headers: showAllColumns(state.structure.headers)
          };
          break;

        case TABLE_TOGGLE_PINNED_ROW:
          if (state.pinnedRowIds.includes(payload.row.id)) {
            state.pinnedRowIds = without(state.pinnedRowIds, payload.row.id);
          } else {
            state.pinnedRowIds = [...state.pinnedRowIds, payload.row.id];
          }
          break;
      }
    }
    state.structure = reduceTableStructure(state.structure, action);
    state.dataSet = reduceDataSet(state.dataSet, action);
    state.pinnedRowsDataSet = reduceDataSet(state.pinnedRowsDataSet, action);
    return freeze(state);
  }
}

export function getHiddenColumnCount(table) {
  let count = 0;
  for (let header of table.structure.headers) {
    for (let column of getNestedColumns(header)) {
      count += !column.visible;
    }
  }
  return count;
}

function showAllColumns(headers) {
  let out = [];
  for (let header of headers) {
    header = {...header};
    if (header.column) {
      header.column = {...header.column, visible: true};
    }
    if (header.headers) {
      header.headers = showAllColumns(header.headers);
    }
    out.push(header);
  }
  return out;
}

export function getSorting(table, columnId) {
  let {sorting} = table.dataSet,
      sort = sorting.find(sort => columnId in sort);
  if (sort) {
    return {index: sorting.indexOf(sort), sort: sort[columnId]};
  } else {
    return {index: -1, sort: SORT_UNSORTED};
  }
}
