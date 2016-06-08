import {Sizing, isSizing} from './SizingEnum';

describe('SizingEnum::isSizing(sizing)', () => {

  it('returns `true` if `sizing` is "fixed" or "fluid"', () => {
    expect(isSizing('fixed')).toBeTruthy();
    expect(isSizing('fluid')).toBeTruthy();
    expect(isSizing(Sizing.FIXED)).toBeTruthy();
    expect(isSizing(Sizing.FLUID)).toBeTruthy();
    expect(isSizing('foo')).toBeFalsy();
    expect(isSizing(null)).toBeFalsy();
  });
});
