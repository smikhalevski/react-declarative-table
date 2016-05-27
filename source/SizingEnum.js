import React from 'react';

const {oneOf} = React.PropTypes;

/**
 * @typedef {"fluid"|"fixed"}
 * @name TableSizing
 * @classdesc
 * Type of sizing of table colgroup or column.
 */
export const Sizing = {
  FLUID: 'fluid',
  FIXED: 'fixed',

  /**
   * Check that provided value conforms {@link TableSizing} type definition.
   *
   * @function
   * @name Sizing.isSizing
   * @param {*} sizing Value to test.
   * @return {Boolean}
   */
  isSizing(sizing) {
    return Sizing.values.includes(sizing);
  }
};

Sizing.values = [Sizing.FIXED, Sizing.FLUID];

export const sizing = oneOf(Sizing.values);
