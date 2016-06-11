import 'classlist-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import {Table} from '../main/Table';

import './index.less';

let rows = [];
for (let i = 0; i < 10000; ++i) {
  rows.push({index: i, bbb: 1, ccc: 2, ddd: 3, fff: 4, eee: 5});
}

class App extends React.Component {

  render() {
    return (
      <div style={{height: '100%'}}>
        <Table style={{height: '100%'}}
               colGroups={[
                 {
                   id:'default',
                   sizing: 'fluid',
                   scrollBox: {
                     outset: true
                   }
                 },
                 {
                   id: 'frozen',
                   sizing: 'fluid'
                 }
               ]}
               rowGroups={[
                 {id: 'default', height: 50},
                 {id: 'default', sizing: 'fixed', height: 100},
                 {id: 'default', height: 100}
               ]}
               headers={[
                 {
                   caption: 'AAA',
                   headers: [
                     {
                       caption: 'BBB',
                       column: {
                         key: 'index',
                         width: 100
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
                             sizing: 'fluid',
                             rowSpanPriority: 0,
                             targetColgroupId: 'frozen'
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
                     width: 100,
                     rowSpanPriority: 10,
                     rowSpanLimit: 3
                   }
                 }
               ]}
               dataSets={[
                 {
                   offset: 0,
                   count: rows.length,
                   rows
                 }
               ]}
        />
      </div>
    );
  }
}

ReactDOM.render(<App/>, document.getElementById('app'));
