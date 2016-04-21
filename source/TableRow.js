import React, {PropTypes, Component} from 'react';
import isEqual from 'lodash/isEqual';
import classNames from 'classnames';
import {TableCell} from './TableCell';
const {arrayOf, object} = PropTypes;

export class TableRow extends Component {

  static propTypes = {
    table: object.isRequired,
    row: object.isRequired,
    columns: arrayOf(object).isRequired
  };

  static contextTypes = {
    intl: object.isRequired
  };

  columnElements = [];

  getColumnElements() {
    return this.columnElements;
  }

  //shouldComponentUpdate(props, state, context) {
  //  // TODO Remove intl dependency from here
  //  let locale = context.intl.locale;
  //  if (this.__locale != locale) {
  //    this.__locale = locale;
  //    return true;
  //  }
  //
  //  return !isEqual(props.row, this.props.row);
  //}

  render () {
    let {table, row, columns} = this.props;
    return (
      <div className="table__tr">
        {columns.map((column, i) => {
        return (
            <div key={i}
                 ref={ref => this.columnElements[i] = ref}
                 className={classNames('table__td', column.modifiers, {'table__td_hidden': !column.visible})}>
              <TableCell table={table}
                         row={row}
                         column={column}/>
            </div>
          );
        })}
      </div>
    );
  }
}
