import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from '../color-picker.js';

describe('hexToRgb', () => {
  it('converts black', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('converts white', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('converts red', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('converts green', () => {
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('converts blue', () => {
    expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('converts a mixed color', () => {
    expect(hexToRgb('#a1b2c3')).toEqual({ r: 161, g: 178, b: 195 });
  });
});

describe('rgbToHex', () => {
  it('converts black', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });

  it('converts white', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
  });

  it('converts red', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
  });

  it('rounds and pads single digits', () => {
    expect(rgbToHex(1, 16, 255)).toBe('#0110ff');
  });

  it('rounds floats', () => {
    expect(rgbToHex(254.7, 128.2, 64.9)).toBe('#ff8041');
  });
});

describe('rgbToHsv', () => {
  it('converts black', () => {
    const { h, s, v } = rgbToHsv(0, 0, 0);
    expect(s).toBe(0);
    expect(v).toBe(0);
  });

  it('converts white', () => {
    const { h, s, v } = rgbToHsv(255, 255, 255);
    expect(s).toBe(0);
    expect(v).toBe(1);
  });

  it('converts red', () => {
    const { h, s, v } = rgbToHsv(255, 0, 0);
    expect(h).toBe(0);
    expect(s).toBe(1);
    expect(v).toBe(1);
  });

  it('converts green', () => {
    const { h } = rgbToHsv(0, 255, 0);
    expect(h).toBeCloseTo(1 / 3, 5);
  });

  it('converts blue', () => {
    const { h } = rgbToHsv(0, 0, 255);
    expect(h).toBeCloseTo(2 / 3, 5);
  });

  it('converts dark red', () => {
    const { h, s, v } = rgbToHsv(128, 0, 0);
    expect(h).toBe(0);
    expect(s).toBe(1);
    expect(v).toBeCloseTo(128 / 255, 5);
  });
});

describe('hsvToRgb', () => {
  it('converts black', () => {
    const { r, g, b } = hsvToRgb(0, 0, 0);
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('converts white', () => {
    const { r, g, b } = hsvToRgb(0, 0, 1);
    expect(r).toBe(255);
    expect(g).toBe(255);
    expect(b).toBe(255);
  });

  it('converts red', () => {
    const { r, g, b } = hsvToRgb(0, 1, 1);
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('converts green', () => {
    const { r, g, b } = hsvToRgb(1 / 3, 1, 1);
    expect(r).toBe(0);
    expect(g).toBe(255);
    expect(b).toBe(0);
  });

  it('converts blue', () => {
    const { r, g, b } = hsvToRgb(2 / 3, 1, 1);
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(255);
  });

  it('converts desaturated color', () => {
    const { r, g, b } = hsvToRgb(0, 0, 0.5);
    expect(r).toBe(128);
    expect(g).toBe(128);
    expect(b).toBe(128);
  });
});

describe('round-trip hex -> rgb -> hsv -> rgb -> hex', () => {
  const testCases = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#a1b2c3', '#ff8041', '#123456', '#abcdef', '#800080', '#ffa500'];

  testCases.forEach(hex => {
    it(`round-trips ${hex}`, () => {
      const rgb = hexToRgb(hex);
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      const rgbBack = hsvToRgb(hsv.h, hsv.s, hsv.v);
      const hexBack = rgbToHex(rgbBack.r, rgbBack.g, rgbBack.b);
      expect(hexBack).toBe(hex);
    });
  });
});
