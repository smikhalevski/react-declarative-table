import React, {PropTypes} from 'react';
import {Renderer} from '../renderer/Renderer';

/**
 * @class TableCell
 * @extends React.Component
 * @classdesc
 * Cell of a table component.
 *
 * @property {React.Props} props Tag attributes.
 * @property {Object} props.row Model of row that contains this cell.
 * @property {TableColumnModel} props.column Model of hosting column.
 */
export class TableCell extends React.Component {

  static propTypes = {
    row: PropTypes.object.isRequired,
    column: PropTypes.object.isRequired,
    table: PropTypes.object.isRequired
  };

  static contextTypes = {
    intl: PropTypes.object.isRequired
  };

  shouldComponentUpdate(props, state, context) {
    // TODO Remove intl dependency from here
    let locale = context.intl.locale;
    if (this.__locale != locale) {
      this.__locale = locale;
      return true;
    }

    let {row, column: {id}} = this.props;
    return row[id] != props.row[id] || id == '__index';
  }

  render () {
    let {row, column, table} = this.props,
        value = row[column.id];
    return (
      <div className="table__td__content">
        <Renderer model={column.renderers}
                  context={{value, row, column, table}}>
          {value}
        </Renderer>
      </div>
    );
  }
}
