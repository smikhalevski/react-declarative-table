import React from 'react';

const {shape, arrayOf, number, object} = React.PropTypes;

export const DataSetShape = shape({
  count: number.isRequired,
  offset: number.isRequired,
  result: arrayOf(object).isRequired
});
