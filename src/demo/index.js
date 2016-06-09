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
                 {id: 'default'}
                 //{id: 'default', sizing: 'fixed', height: 40},
                 //{id: 'default', height: 100}
               ]}
               headers={[
                 {
                   caption: 'AAA',
                   headers: [
                     {
                       caption: 'BBB',
                       column: {
                         key: 'index',
                         width: 100,
                         //targetColgroupId: 'frozen'
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
                             rowSpanPriority: 0
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
                     width: 10,
                     rowSpanPriority: 10
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


               cellComponent={function({row, column}) {return <a>{row[column.key]}</a>}}
               headerComponent={function({header}) {return <u>{header.caption}</u>}}
        />
      </div>
    );
  }
}

ReactDOM.render(<App/>, document.getElementById('app'));
