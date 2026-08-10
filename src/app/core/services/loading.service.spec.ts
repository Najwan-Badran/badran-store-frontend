import { TestBed } from '@angular/core/testing';

import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('tracks concurrent loading operations with a signal', () => {
    const service = TestBed.inject(LoadingService);

    expect(service.isLoading()).toBe(false);

    service.start();
    service.start();

    expect(service.isLoading()).toBe(true);

    service.stop();

    expect(service.isLoading()).toBe(true);

    service.stop();

    expect(service.isLoading()).toBe(false);
  });

  it('does not underflow when stop is called too many times', () => {
    const service = TestBed.inject(LoadingService);

    service.stop();

    expect(service.isLoading()).toBe(false);
  });
});
