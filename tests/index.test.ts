import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @sudobility/di to avoid broken import chain in tests
vi.mock('@sudobility/di', () => ({
  initializeInfoService: vi.fn(),
}));

import {
  WebInfoService,
  createWebInfoService,
  initializeInfoService,
  getInfoService,
  resetInfoService,
} from '../src/info/info.web.js';
import { InfoType } from '@sudobility/types';

describe('WebInfoService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('can be instantiated', () => {
    const service = new WebInfoService();
    expect(service).toBeDefined();
  });

  it('has initial state with isVisible false', () => {
    const service = new WebInfoService();
    const state = service.getState();

    expect(state.isVisible).toBe(false);
    expect(state.title).toBe('');
    expect(state.description).toBe('');
    expect(state.variant).toBe(InfoType.INFO);
  });

  it('updates state when show is called', () => {
    const service = new WebInfoService();

    service.show('Test Title', 'Test Message', InfoType.SUCCESS, 3000);

    const state = service.getState();
    expect(state.isVisible).toBe(true);
    expect(state.title).toBe('Test Title');
    expect(state.description).toBe('Test Message');
    expect(state.variant).toBe(InfoType.SUCCESS);
    expect(state.duration).toBe(3000);
  });

  it('notifies subscribers when state changes', () => {
    const service = new WebInfoService();
    const listener = vi.fn();

    service.subscribe(listener);

    // Should be called immediately with initial state
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ isVisible: false })
    );

    service.show('Test', 'Message', InfoType.INFO);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ isVisible: true, title: 'Test' })
    );
  });

  it('unsubscribe stops notifications', () => {
    const service = new WebInfoService();
    const listener = vi.fn();

    const unsubscribe = service.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    service.show('Test', 'Message', InfoType.INFO);

    // Should not have been called again
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('dismiss hides the banner', () => {
    const service = new WebInfoService();

    service.show('Test', 'Message', InfoType.INFO);
    expect(service.getState().isVisible).toBe(true);

    service.dismiss();
    expect(service.getState().isVisible).toBe(false);
  });

  it('auto-dismisses after interval', () => {
    const service = new WebInfoService();

    service.show('Test', 'Message', InfoType.INFO, 3000);
    expect(service.getState().isVisible).toBe(true);

    vi.advanceTimersByTime(3000);
    expect(service.getState().isVisible).toBe(false);
  });

  it('auto-dismisses after default 5000ms when no interval specified', () => {
    const service = new WebInfoService();

    service.show('Test', 'Message', InfoType.INFO);
    expect(service.getState().isVisible).toBe(true);

    vi.advanceTimersByTime(4999);
    expect(service.getState().isVisible).toBe(true);

    vi.advanceTimersByTime(1);
    expect(service.getState().isVisible).toBe(false);
  });

  it('clears previous timeout when showing new banner', () => {
    const service = new WebInfoService();

    service.show('First', 'Message', InfoType.INFO, 3000);
    vi.advanceTimersByTime(2000);

    service.show('Second', 'Message', InfoType.SUCCESS, 5000);
    expect(service.getState().title).toBe('Second');

    // First timer would have fired at 3000ms, but we showed new at 2000ms
    vi.advanceTimersByTime(1000); // Now at 3000ms total
    expect(service.getState().isVisible).toBe(true);
    expect(service.getState().title).toBe('Second');

    // Second timer fires at 2000 + 5000 = 7000ms total
    vi.advanceTimersByTime(4000); // Now at 7000ms
    expect(service.getState().isVisible).toBe(false);
  });
});

describe('createWebInfoService', () => {
  it('creates a WebInfoService instance', () => {
    const service = createWebInfoService();
    expect(service).toBeInstanceOf(WebInfoService);
  });
});

describe('singleton functions', () => {
  afterEach(() => {
    resetInfoService();
  });

  it('initializeInfoService creates a service', () => {
    initializeInfoService();
    const service = getInfoService();
    expect(service).toBeInstanceOf(WebInfoService);
  });

  it('initializeInfoService accepts custom service', () => {
    const customService = new WebInfoService();
    initializeInfoService(customService);
    expect(getInfoService()).toBe(customService);
  });

  it('initializeInfoService does not overwrite existing service', () => {
    const firstService = new WebInfoService();
    const secondService = new WebInfoService();

    initializeInfoService(firstService);
    initializeInfoService(secondService);

    expect(getInfoService()).toBe(firstService);
  });

  it('getInfoService throws if not initialized', () => {
    expect(() => getInfoService()).toThrow(
      'Info service not initialized. Call initializeInfoService() at app startup.'
    );
  });

  it('resetInfoService clears the singleton', () => {
    initializeInfoService();
    expect(() => getInfoService()).not.toThrow();

    resetInfoService();
    expect(() => getInfoService()).toThrow();
  });
});
