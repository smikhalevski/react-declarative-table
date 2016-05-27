import {isState, freeze} from './Runtime';
import values from 'lodash/values';
import uniq from 'lodash/uniq';
import mapValues from 'lodash/mapValues';
import isString from 'lodash/isString';
import isBoolean from 'lodash/isBoolean';
import without from 'lodash/without';
import invariant from 'invariant';
import {AND, toMatcher, reduceFilter} from './FilterModel';
import {SORT_UNSORTED, toComparator} from './SortingModel';

export const
  RESULT_SET = Symbol('resultSet'); // Key to store filtered and sorted result set.

export const
  DATA_SET_UPDATE = 'DataSet.update',
  DATA_SET_PURGE = 'DataSet.purge',
  DATA_SET_VALUES_REQUEST = 'DataSet.valuesRequest',
  DATA_SET_VALUES = 'DataSet.values',
  DATA_SET_PAGE_REQUEST = 'DataSet.pageRequest',
  DATA_SET_FILTER = 'DataSet.filter',
  DATA_SET_DELETE_FILTER = 'DataSet.deleteFilter',
  DATA_SET_DELETE_ALL_FILTERS = 'DataSet.deleteAllFilters',
  DATA_SET_SORT = 'DataSet.sort',
  DATA_SET_DELETE_SORT = 'DataSet.deleteSort';

export function dataSetUpdate(dataSetId, dataSet) {
  return {type: DATA_SET_UPDATE, payload: {dataSetId, dataSet}};
}

export function dataSetPurge(dataSetId) {
  return {type: DATA_SET_PURGE, payload: {dataSetId}};
}

export function dataSetValuesRequest(dataSetId, fieldId) {
  return {type: DATA_SET_VALUES_REQUEST, payload: {dataSetId, fieldId}};
}

export function dataSetValues(dataSetId, fieldId, values) {
  return {type: DATA_SET_VALUES, payload: {dataSetId, fieldId, values}};
}

export function dataSetPageRequest(dataSetId, offset, limit) {
  return {type: DATA_SET_PAGE_REQUEST, payload: {dataSetId, offset, limit}};
}

export function dataSetFilter(dataSetId, filterId, filter) {
  return {type: DATA_SET_FILTER, payload: {dataSetId, filterId, filter}};
}

export function dataSetDeleteFilter(dataSetId, filterId) {
  return {type: DATA_SET_DELETE_FILTER, payload: {dataSetId, filterId}};
}

export function dataSetDeleteAllFilters(dataSetId) {
  return {type: DATA_SET_DELETE_ALL_FILTERS, payload: {dataSetId}};
}

export function dataSetSort(dataSetId, fieldId, sorting) {
  return {type: DATA_SET_SORT, payload: {dataSetId, fieldId, sorting}};
}

export function dataSetDeleteSort(dataSetId, fieldId) {
  return {type: DATA_SET_DELETE_SORT, payload: {dataSetId, fieldId}};
}

/**
 * @typedef {Object}
 * @name DataSetModel
 * Pageable data set that stores records.
 *
 * @property {*} id Non-unique identifier, required for update action to be applied.
 *           Data sets with same identifier would process same events.
 */
export function reduceDataSet(state, action) {
  if (isState(state)) {
    state = {
      id: undefined,
      stateful: false,
      processed: false,
      filters: {},
      sorting: [],
      rollup: {},

      count: 0,
      offset: 0,
      result: [],
      values: {},

      ...state
    };
    if (DEBUG) {
      invariant(isString(state.id), 'Expected `DataSet.id` to be a string');
      invariant(Number.isInteger(state.count), 'Expected `DataSet.count` to be an integer');
      invariant(Number.isInteger(state.offset), 'Expected `DataSet.offset` to be an integer');
      invariant(Array.isArray(state.result), 'Expected `DataSet.result` to be an array');
    }

    const {payload} = action;

    if (action.payload && payload.dataSetId == state.id) {
      switch (action.type) {

        case DATA_SET_PURGE:
          state.count = 0;
          state.offset = 0;
          state.result = [];
          state.values = [];
          break;

        case DATA_SET_VALUES_REQUEST:
          if (state.processed) {
            state.values = {
              ...state.values,
              [payload.fieldId]: uniq(state.result.map(res => res[payload.fieldId]))
            };
          }
          break;

        case DATA_SET_VALUES:
          state.values = {
            ...state.values,
            [payload.fieldId]: payload.values
          };
          break;

        case DATA_SET_FILTER:
          state.filters = {
            ...state.filters,
            [payload.filterId]: reduceFilter(payload.filter, action)
          };
          break;

        case DATA_SET_DELETE_FILTER:
          state.filters = {...state.filters};
          delete state.filters[payload.filterId];
          break;

        case DATA_SET_DELETE_ALL_FILTERS:
          state.filters = {};
          break;

        case DATA_SET_SORT:
          state.sorting = withoutSort(state.sorting, payload.fieldId);
          if (payload.sorting == SORT_UNSORTED) {
            break; // Do not add unsorted.
          }
          state.sorting.unshift({[payload.fieldId]: payload.sorting});
          break;

        case DATA_SET_DELETE_SORT:
          state.sorting = withoutSort(state.sorting, payload.fieldId);
          break;

        case DATA_SET_UPDATE:
          let {result, ...dataSet} = payload.dataSet;
          if (state.stateful) {
            state.result = [...result];
          } else {
            // Stateless data set reuses same `result` array to prevent its time travel.
            state.result.splice(0, state.result.length, ...result);
          }
          Object.assign(state, dataSet);
          break;
      }
    }
    let rows = state.result.slice(0);

    if (state.processed) {
      let matcher = toMatcher({[AND]: values(state.filters)});
      if (matcher) {
        rows = rows.filter(matcher);
      }
      if (state.sorting.length) {
        rows.sort(toComparator(state.sorting));
      }
    }
    let i = 0;
    for (let row of rows) {
      row.__index = state.offset + ++i;
    }

    state.rows = rows;
    state.count = Math.max(state.count, state.result.length);
    return freeze(state);
  }
}

export function withoutSort(sorting, fieldId) {
  return without(sorting, sorting.find(sort => fieldId in sort));
}
