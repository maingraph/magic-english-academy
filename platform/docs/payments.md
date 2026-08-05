# Alfa-Bank payments

Magic English uses Alfa-Bank Belarus hosted checkout. Card details never enter landing or platform infrastructure.

## Flow

1. Landing sends customer contact data and an idempotency UUID to `POST /api/payments/orders`.
2. API fixes price at 75 BYN server-side and registers order through `register.do`.
3. Browser redirects only to HTTPS checkout URL returned by `ecom.alfabank.by`.
4. Success and failure pages call `GET /api/payments/orders/:token`.
5. API verifies status through `getOrderStatusExtended.do`. Only `orderStatus = 2` becomes paid.
6. Paid order appears under `/admin/payments`. Admin creates student account manually, then marks access fulfilled.
7. Scheduled job reconciles pending orders every five minutes.

## Required environment

```env
ALFA_API_URL=https://ecom.alfabank.by/payment/rest
ALFA_USERNAME=
ALFA_PASSWORD=
ALFA_RETURN_URL=https://magic-english-plan.by/payment/success
ALFA_FAIL_URL=https://magic-english-plan.by/payment/failed
```

Use `ALFA_TOKEN` instead of username/password only when bank issues a token. Never commit real credentials.

Landing build also needs:

```env
PAYMENT_API_URL=https://magic-english-plan.by/api
```

Before live sale: apply migration, configure API and landing environments, run a real minimum-value payment, verify admin status, then perform refund from Alfa merchant cabinet if needed.
