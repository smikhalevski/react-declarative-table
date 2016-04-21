import React, {PropTypes, Component} from 'react';
import {Renderer} from '../renderer/Renderer';

const {object} = PropTypes;

export class TableHeader extends Component {

  static propTypes = {
    header: object.isRequired,
    table: object.isRequired
  };

  render() {
    let {header, table} = this.props,
      value = header.caption;
    return (
      <Renderer model={header.renderers}
                context={{value, header, table}}>
        {value}
      </Renderer>
    );
  }
}
