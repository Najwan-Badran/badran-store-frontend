import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideApiConfig } from '../config/api.config';
import { CatalogApiService } from './catalog-api.service';

describe('CatalogApiService', () => {
  let service: CatalogApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfig({ baseUrl: 'https://api.example.test/api' }),
      ],
    });

    service = TestBed.inject(CatalogApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    TestBed.resetTestingModule();
  });

  it('adds product reviews using backend query parameters', () => {
    service.addReview(12, { orderId: 99, rating: 5, comment: 'Excellent finish' }).subscribe();

    const request = httpTestingController.expectOne(
      (candidate) =>
        candidate.url === 'https://api.example.test/api/v1/reviews/product/12' &&
        candidate.params.get('orderId') === '99' &&
        candidate.params.get('rating') === '5' &&
        candidate.params.get('comment') === 'Excellent finish',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ success: true, message: 'Review added', data: null });
  });
});
