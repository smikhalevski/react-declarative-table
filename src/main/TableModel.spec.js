import {toStacks} from './TableModel';

describe('TableModel::toStacks(header)', () => {

  it('ignores `undefined` header definitions', () => {
    expect(toStacks(null)).toEqual([]);

    let a1, a3, a = {
      caption: 'a',
      headers: [
        a1 = {caption: 'a1'},
        null,
        a3 = {caption: 'a3'}
      ]
    };
    expect(toStacks(a)).toEqual([
      [a, a1],
      [a, a3]
    ]);
  });

  it('converts header without sub-headers to an array of header stacks', () => {
    expect(toStacks({})).toEqual([[{}]]);
  });

  it('converts header with sub-headers to an array of header stacks', () => {
    let a1, a11, a12, a2, a = {
      caption: 'a',
      headers: [
        a1 = {
          caption: 'a1',
          headers: [
            a11 = {caption: 'a11'},
            a12 = {caption: 'a12'}
          ]
        },
        a2 = {caption: 'a2'}
      ]
    };

    expect(toStacks(a)).toEqual([
      [a, a1, a11],
      [a, a1, a12],
      [a, a2]
    ]);
  });
});
