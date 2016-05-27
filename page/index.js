import React from 'react';
import ReactDOM from 'react-dom';
import {Table} from '../source/Table';

import './index.less';

class App extends React.Component {

  render() {
    return (
      <div className="container">
        <Table structure={{colgroups: [{id: 'default'}], headers: [
          {
            caption: 'AAA',
            headers: [
              {
                column: {
                  key: 'bbb',
                  targetColgroupId: 'default'
                }
              },
              {
                caption: 'CCC',
                headers: [
                  {
                    caption: 'DDD',
                    column: {
                      key: 'ddd',
                      targetColgroupId: 'default'
                    }
                  },
                  {
                    caption: 'FFF',
                    column: {
                      key: 'fff',
                      targetColgroupId: 'default'
                    }
                  }
                ]
              }
            ]
          },
          {
            caption: 'EEE',
            column: {
              key: 'eee',
              targetColgroupId: 'default'
            }
          }
        ]}} dataSet={{count: 0, offset: 0, result: []}}/>
      </div>
    );
  }
}

ReactDOM.render(<App/>, document.getElementById('app'));
