import 'classlist-polyfill';

import React, {Component} from 'react';
import ReactDOM, {findDOMNode} from 'react-dom';
import classNames from 'classnames';

import './index.less';

class Demo extends Component {

  render() {

    return (
      <div className="container">
      </div>
    );
  }
}

ReactDOM.render(<Demo/>, document.getElementById('demo'));
