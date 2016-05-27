import React from 'react';
import {sizing} from './SizingEnum';

const {shape, string} = React.PropTypes;

export const TableColgroupShape = shape({
  id: string.isRequired,
  sizing: sizing
});
