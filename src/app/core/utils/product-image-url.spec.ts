import { ProductDto } from '../models/product.models';
import { getPrimaryProductImageUrl, getProductGalleryImageUrls } from './product-image-url';

const productBase: ProductDto = {
  productId: 1,
  sku: 'FLAMINGO',
  nameAr: 'Flamingo',
  nameEn: 'Flamingo',
  descriptionAr: null,
  descriptionEn: null,
  category: {
    categoryId: 1,
    nameAr: 'Category',
    nameEn: 'Category',
    parentCategoryId: null,
  },
  brand: null,
  basePrice: 10,
  stockQuantity: 5,
  reorderThreshold: 1,
  isActive: true,
  isOnSale: false,
  isNewArrival: false,
  avgRating: 0,
  reviewCount: 0,
  specifications: null,
  images: [],
};

describe('product image URL helpers', () => {
  it('builds backend URLs for API asset paths', () => {
    const product: ProductDto = {
      ...productBase,
      images: [
        {
          imageId: 1,
          productId: 1,
          url: '/assets/products/Flamingo.jpg',
          sortOrder: 0,
        },
      ],
    };

    expect(getPrimaryProductImageUrl(product)).toBe('http://localhost:8080/assets/products/Flamingo.jpg');
  });

  it('keeps fallback behavior for products without images', () => {
    expect(getPrimaryProductImageUrl(productBase)).toBeNull();
    expect(getProductGalleryImageUrls(productBase)).toEqual([]);
  });
});
