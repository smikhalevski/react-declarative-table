import React from 'react';
import {sizing} from './SizingEnum';

const {shape, string, bool, number} = React.PropTypes;

export const TableColumnShape = shape({
  key: string.isRequired,
  targetColgroupId: string.isRequired, // Reference to `tableColgroupShape.id`
  visible: bool,
  width: number, // px
  sizing: sizing
});
