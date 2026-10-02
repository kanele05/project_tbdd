import { z } from 'zod';

import { paginationQuery } from '@/lib/pagination';

export const PAYMENT_METHODS = ['MOCK_CARD', 'MOCK_EWALLET'] as const;

export const checkoutBody = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS, {
    error: 'paymentMethod must be MOCK_CARD or MOCK_EWALLET',
  }),
  /** Chỉ để demo/test (BR-07): true -> thanh toán giả lập thất bại. */
  simulateFailure: z.boolean({ error: 'simulateFailure must be a boolean' }).optional(),
});

export const enrollParams = z.object({ id: z.string().trim().min(1).max(64) });

export const listOrdersQuery = paginationQuery;

export type CheckoutInput = z.infer<typeof checkoutBody>;
