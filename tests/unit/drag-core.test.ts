import { describe, it, expect } from 'vitest';
import { shouldIgnore } from '../../src/content/modules/drag/drag-core';

describe('shouldIgnore', () => {
  it('ignores BODY element', () => {
    expect(shouldIgnore(document.body)).toBe(true);
  });

  it('ignores HTML element', () => {
    expect(shouldIgnore(document.documentElement)).toBe(true);
  });

  it('ignores SCRIPT element', () => {
    const script = document.createElement('script');
    expect(shouldIgnore(script)).toBe(true);
  });

  it('ignores STYLE element', () => {
    const style = document.createElement('style');
    expect(shouldIgnore(style)).toBe(true);
  });

  it('ignores BR element', () => {
    const br = document.createElement('br');
    expect(shouldIgnore(br)).toBe(true);
  });

  it('allows DIV element', () => {
    const div = document.createElement('div');
    expect(shouldIgnore(div)).toBe(false);
  });

  it('allows SPAN element', () => {
    const span = document.createElement('span');
    expect(shouldIgnore(span)).toBe(false);
  });

  it('allows BUTTON element', () => {
    const button = document.createElement('button');
    expect(shouldIgnore(button)).toBe(false);
  });

  it('allows IMG element', () => {
    const img = document.createElement('img');
    expect(shouldIgnore(img)).toBe(false);
  });

  it('ignores non-HTMLElement (SVGElement)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    expect(shouldIgnore(svg)).toBe(true);
  });

  it('ignores element inside x-ray-overlay', () => {
    const overlay = document.createElement('x-ray-overlay');
    const child = document.createElement('div');
    overlay.appendChild(child);
    document.body.appendChild(overlay);
    try {
      expect(shouldIgnore(child)).toBe(true);
    } finally {
      overlay.remove();
    }
  });

  it('allows element outside x-ray-overlay', () => {
    const container = document.createElement('div');
    const child = document.createElement('div');
    container.appendChild(child);
    document.body.appendChild(container);
    try {
      expect(shouldIgnore(child)).toBe(false);
    } finally {
      container.remove();
    }
  });
});
