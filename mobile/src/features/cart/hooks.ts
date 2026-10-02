import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { STALE_TIME } from '@/constants/config';
import { queryKeys } from '@/lib/queryKeys';
import type { CartDto, CheckoutRequest, CheckoutResponse, CourseDetail } from '@/types/api';

import { cartApi } from './api';

/** `GET /cart` (staleTime 0, never persisted - PLAN.md §10). */
export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart(),
    queryFn: cartApi.get,
    staleTime: STALE_TIME.cart,
  });
}

/** Number of items in the cart - the badge on the Home cart icon (SC-04). Backed by `['cart']`. */
export function useCartCount(): number {
  const { data } = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: cartApi.get,
    staleTime: STALE_TIME.cart,
    select: (cart: CartDto) => cart.items.length,
  });
  return data ?? 0;
}

/**
 * `POST /cart/items`. On success the course detail flips to `isInCart: true` right away (the
 * bottom-bar button becomes "Go to cart") and the cart / course queries are refreshed.
 * `ALREADY_IN_CART` / `ALREADY_ENROLLED` also refresh the course so the button catches up.
 */
export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: cartApi.add,
    onSuccess: (_data, courseId) => {
      queryClient.setQueryData<CourseDetail>(queryKeys.course(courseId), (course) =>
        course ? { ...course, isInCart: true } : course,
      );
    },
    onSettled: (_data, _error, courseId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId), exact: true });
    },
  });
}

/** `DELETE /cart/items/:courseId`; refreshes the cart and that course's `isInCart`. */
export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: cartApi.remove,
    onSettled: (_data, _error, courseId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId), exact: true });
    },
  });
}

/**
 * `POST /orders/checkout`. After a successful payment everything that depends on enrollment is
 * invalidated (PLAN.md §7.3): cart, My Courses, profile stats, the purchased courses, Home and
 * notifications (the server creates an `ORDER_PAID` one). A failed payment changes nothing.
 */
export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation<CheckoutResponse, Error, CheckoutRequest>({
    mutationFn: cartApi.checkout,
    onSuccess: ({ enrolledCourseIds }) => {
      const keys: QueryKey[] = [
        queryKeys.cart(),
        queryKeys.meCoursesAll(),
        queryKeys.meStats(),
        queryKeys.home(),
        queryKeys.notifications(),
        queryKeys.orders(),
        ...enrolledCourseIds.map((courseId) => queryKeys.course(courseId)),
      ];
      // Not awaited: the success screen must not wait for the refetches.
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
    },
  });
}
