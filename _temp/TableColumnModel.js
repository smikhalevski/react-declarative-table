import isUndefined from 'lodash/isUndefined';
import {isState, freeze} from '../../Runtime';
import isString from 'lodash/isString';
import uniqueId from 'lodash/uniqueId';
import invariant from 'invariant';
import {Sizing} from './../source/SizingEnum';
import {DEFAULT_COLGROUP_ID} from './TableColgroupModel';
import {reduceSetOfRenderers} from '../renderer/RendererModel';

export const
  TABLE_COLUMN_HIDE = 'TableColumn.hide',
  TABLE_COLUMN_SHOW = 'TableColumn.show';

export function tableColumnHide(columnUid) {
  return {type: TABLE_COLUMN_HIDE, payload: {columnUid}};
}

export function tableColumnShow(columnUid) {
  return {type: TABLE_COLUMN_SHOW, payload: {columnUid}};
}

/**
 * @typedef {Object}
 * @name TableColumnModel
 * Column model describes how data stored in {@link TableModel} should be rendered and what
 * user actions are permitted for it.
 *
 * @property {String} id Identifier of column which is used to retrieve content from
 *           {@link TableModel|table rows}. Table can contain multiple columns with same id,
 *           which means they would acquire same data to render.
 * @property {String} [colgroupId = DEFAULT_COLGROUP_ID] Identifier of colgroup this column should
 *           be attached to. If `colgroupId` is explicitly specified and colgroup with given id
 *           does not exist among {@link TableStructureModel|table colgroups} then column is not
 *           rendered.
 * @property {Boolean} [visible = true] Visibility status.
 * @property {Number} [width = 80] Width of column in pixels.
 * @property {TableSizing} [sizing = FIXED] Column *stretching* mode if excessive space
 *           is available around table.
 *           <ul>
 *             <li>
 *               **`FLUID`** Column occupies all available space but at least as wide as `width`.
 *               If table contains multiple columns with `sizing` set to `fluid` those columns
 *               occupy space proportionally to their `width`;
 *             </li>
 *             <li>**`FIXED`** Column has fixed width of `width`;</li>
 *           </ul>
 *
 * @property {Array.<RendererModel>} [renderers] List of renderers that would output values.
 * @property {String} [modifiers] List of CSS classes.
 */
export function reduceTableColumn(state, action) {
  if (isState(state)) {
    state = {
      id: null, // fieldId
      targetColgroupId: DEFAULT_COLGROUP_ID,
      visible: true,
      width: 120,
      sizing: Sizing.FIXED,
      modifiers: null,
      ...state
    };
    if (DEBUG) {
      invariant(isString(state.id), 'Expected `TableColumn.id` to be a string');
      invariant(Sizing.isSizing(state.sizing), 'Expected `TableColumn.sizing` to be sizing');
      invariant(Number.isInteger(state.width), 'Expected `TableColumn.width` to be an integer number of pixels');
    }
    if (isUndefined(state.uid)) {
      state.uid = uniqueId();
    }
    if (action.payload && state.uid == action.payload.columnUid) {
      switch (action.type) {

        case TABLE_COLUMN_HIDE:
          state.visible = false;
          break;

        case TABLE_COLUMN_SHOW:
          state.visible = true;
          break;
      }
    }
    state.renderers = reduceSetOfRenderers(state.renderers, action, {state});
    return freeze(state);
  }
}
