import { api } from '@/lib/apiClient';
import type { CartDto, CheckoutRequest, CheckoutResponse } from '@/types/api';

/** HTTP calls of the cart and checkout screens (SC-12 / SC-13). */
export const cartApi = {
  /** `GET /cart` -> `{ items, totalCents }`. */
  get: () => api.get<CartDto>('/cart'),

  /** `POST /cart/items` - 409 `ALREADY_ENROLLED` / `ALREADY_IN_CART`, 422 `FREE_COURSE` (BR-06). */
  add: (courseId: string) => api.post<void>('/cart/items', { courseId }),

  /** `DELETE /cart/items/:courseId` -> 204. */
  remove: (courseId: string) => api.delete<void>(`/cart/items/${courseId}`),

  /**
   * `POST /orders/checkout` (BR-07). Mock payment: success -> `{ order, enrolledCourseIds }`;
   * `simulateFailure: true` -> 402 `PAYMENT_FAILED` and the cart is left untouched.
   */
  checkout: (body: CheckoutRequest) => api.post<CheckoutResponse>('/orders/checkout', body),
};
