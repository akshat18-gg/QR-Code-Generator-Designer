import { describe, expect, it } from 'vitest';
import { editorReducer, INITIAL_STATE } from './editor';
import { activePreset, PRESETS } from './presets';

describe('editorReducer', () => {
  it('keeps each type’s inputs when switching tabs', () => {
    let state = editorReducer(INITIAL_STATE, {
      type: 'setInput',
      qrType: 'url',
      patch: { url: 'example.com' },
    });
    state = editorReducer(state, { type: 'setType', qrType: 'wifi' });
    state = editorReducer(state, { type: 'setInput', qrType: 'wifi', patch: { ssid: 'Home' } });
    state = editorReducer(state, { type: 'setType', qrType: 'url' });
    expect(state.inputs.url.url).toBe('example.com');
    expect(state.inputs.wifi.ssid).toBe('Home');
    expect(state.inputs.wifi.security).toBe('WPA');
  });

  it('marks fields touched once', () => {
    const once = editorReducer(INITIAL_STATE, { type: 'touch', field: 'email.to' });
    expect(once.touched).toEqual({ 'email.to': true });
    expect(editorReducer(once, { type: 'touch', field: 'email.to' })).toBe(once);
  });

  it('swaps ink and paper', () => {
    const state = editorReducer(INITIAL_STATE, { type: 'swapColours' });
    expect(state.style.fg).toBe(INITIAL_STATE.style.bg);
    expect(state.style.bg).toBe(INITIAL_STATE.style.fg);
  });

  it('applies a preset look without touching size, level, margin or logo', () => {
    const custom = editorReducer(INITIAL_STATE, {
      type: 'setStyle',
      patch: { size: 800, ecLevel: 'H', margin: 2 },
    });
    const rust = PRESETS.find((p) => p.id === 'rust');
    if (!rust) throw new Error('missing preset');
    const state = editorReducer(custom, { type: 'applyPreset', look: rust.look });
    expect(state.style).toMatchObject({ ...rust.look, size: 800, ecLevel: 'H', margin: 2 });
  });

  it('clears the logo back to defaults', () => {
    let state = editorReducer(INITIAL_STATE, {
      type: 'setLogo',
      patch: { src: 'data:x', name: 'a.png', size: 0.6 },
    });
    state = editorReducer(state, { type: 'clearLogo' });
    expect(state.style.logo).toEqual(INITIAL_STATE.style.logo);
  });

  it('loads a snapshot and forgets touched fields', () => {
    const touched = editorReducer(INITIAL_STATE, { type: 'touch', field: 'url.url' });
    const snapshot = {
      type: 'phone' as const,
      inputs: INITIAL_STATE.inputs,
      style: INITIAL_STATE.style,
    };
    expect(editorReducer(touched, { type: 'load', snapshot })).toEqual({
      ...snapshot,
      touched: {},
    });
  });
});

describe('presets', () => {
  it('has six presets with plain, unique names', () => {
    expect(PRESETS).toHaveLength(6);
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(6);
  });

  it('includes a gradient, rounded dots and a dark look', () => {
    expect(PRESETS.some((p) => p.look.gradient.kind !== 'none')).toBe(true);
    expect(
      PRESETS.some((p) => ['rounded', 'extra-rounded', 'dots'].includes(p.look.dotStyle)),
    ).toBe(true);
    expect(PRESETS.some((p) => p.id === 'night')).toBe(true);
  });

  it('starts on Newsprint', () => {
    expect(activePreset(INITIAL_STATE.style)?.id).toBe('newsprint');
  });

  it('shows Custom once a preset colour or pattern is edited', () => {
    const state = editorReducer(INITIAL_STATE, { type: 'setStyle', patch: { dotStyle: 'dots' } });
    expect(activePreset(state.style)).toBeUndefined();
  });

  it('stays active when only size, level or margin change', () => {
    const state = editorReducer(INITIAL_STATE, { type: 'setStyle', patch: { size: 300 } });
    expect(activePreset(state.style)?.id).toBe('newsprint');
  });

  it('recognises every preset after applying it', () => {
    for (const preset of PRESETS) {
      const state = editorReducer(INITIAL_STATE, { type: 'applyPreset', look: preset.look });
      expect(activePreset(state.style)?.id).toBe(preset.id);
    }
  });
});
