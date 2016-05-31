import React from 'react';
import ReactDOM from 'react-dom';
import {Table} from '../src/Table';

import './index.less';

class App extends React.Component {

  render() {
    return (
      <div>
        <Table structure={{colgroups: [{id:'default', sizing: 'fluid'}, {id:'fixed'}], headers: [
          {
            caption: 'AAA',
            headers: [
              {
                caption: 'BBB',
                column: {
                  key: 'bbb',
                  width: 100,
                  targetColgroupId: 'fixed'
                }
              },
              {
                caption: 'CCC',
                headers: [
                  {
                    caption: 'DDD',
                    column: {
                      key: 'ddd',
                      width: 100,
                      sizing: 'fluid'
                    }
                  },
                  {
                    caption: 'FFF',
                    column: {
                      key: 'fff',
                      width: 100
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
              width: 10
            }
          }
        ]}} dataSet={{count: 0, offset: 0, result: [

          {bbb:1, ccc:2, ddd:3, fff:4, eee:5},
          {bbb:6, ccc:7, ddd:8, fff:9, eee:10}

        ]}}/>
      </div>
    );
  }
}

ReactDOM.render(<App/>, document.getElementById('app'));
