import React from 'react';
import ReactDOM from 'react-dom';
import {Table} from '../source/Table';

import './index.less';

class App extends React.Component {

  render() {
    return (
      <div className="container">
        <table style={{width: '100%'}}>
          <colgroup>
            <col style={{width: '50px'}}/>
            <col style={{width: 'calc(100% - 100px)'}}/>
            <col style={{width: '50px'}}/>
            <col style={{width: '100px'}}/>
          </colgroup>
          <thead>
          <tr>
            <th colSpan="2">A</th>
            <th>B</th>
            <th rowSpan="2">C</th>
          </tr>
          <tr>
            <th>A1</th>
            <th>A2</th>
            <th>B1</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td>a1</td>
            <td>a2</td>
            <td>b1</td>
            <td>c</td>
          </tr>
          </tbody>
        </table>



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
