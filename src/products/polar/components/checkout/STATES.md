# Polar checkout: every state

The inventory behind the checkout draft at `/polar#checkout`. Read from
Polar's open-source checkout (`clients/packages/checkout/src`: one
component per piece, and the `*.test.tsx` fixtures that build each state)
and the page around it in the web app (`clients/apps/web/src/components/Checkout`,
`app/(checkout)/checkout/[clientSecret]`), plus the two screenshots of
Pane's live checkout. Strings are Polar's own (`packages/i18n/src/locales/en.ts`).

The checkout is a function of a handful of independent axes, so the draft
models it that way: each axis below is one control in the draft's state
picker, and every row is one value of it. Any combination is reachable;
`/polar#checkout?offer=trial&discount=temporary&step=3ds` links straight to one.
"Source" is where Polar decides it; "Draft" is the picker control and value
(Theme and Viewport sit at the picker's top).

## Layout and chrome

| State | Source | What changes | Draft |
| --- | --- | --- | --- |
| Desktop, two columns | `Checkout.tsx` (`md:grid-cols-2`) | Summary left on the shell gray, form right on white; both 480px max, meeting at the centre line | Viewport: Desktop |
| Mobile, one column | same, below `md` | Summary stacks over the form | Viewport: Mobile (390px) |
| Mobile, collapsed summary | `CheckoutCollapsibleOrderSummary`, `isOrderSummaryCollapsible` (one product, not free, fixed prices only) | A full-bleed "Order summary ⌄" bar with the compact hero price; tapping opens the summary | Mobile + any fixed single-product offer |
| Mobile, long description | `CheckoutProductDescription` (`line-clamp-4 md:line-clamp-none`, "Read more") | Description clamps to 4 lines with Read more | Mobile, any offer |
| Return link | `checkout.return_url` | A back arrow before the seller's avatar | Always on (fictional return URL) |
| Light / Dark | `?theme=` or system | Polar's two palettes | Theme |
| Embedded | `?embed=true`, `Checkout.tsx` embed branch | One rounded card, everything stacked, no seller header | Inventoried only, not drawn (follow-up) |
| Locale | `?locale=`, i18n | Copy, currency format | Inventoried only (en) |

## Offer: what is being bought

| State | Source | What changes | Draft |
| --- | --- | --- | --- |
| One-time, fixed | `product.recurring_interval = null` | Hero "$249", total "Total", CTA "Pay now", one-time mandate | Offer: One-time |
| Subscription, monthly | `recurring_interval = month` | Hero "$29 / mo", total row "Monthly", CTA "Subscribe now", subscription mandate | Offer: Subscription, monthly |
| Subscription, yearly | `recurring_interval = year` | "/ yr", "Yearly" | Offer: Subscription, yearly |
| Every N intervals | `recurring_interval_count > 1` | "Every 3 months", "/ 3 mo" | Inventoried only |
| Free trial | `active_trial_interval(_count)`, `CheckoutTrialHeroPrice` | Hero "14 days free" over "Then **$29/month** starting <date>", breakdown adds "Due today $0", CTA "Start trial", trial mandate | Offer: Free trial |
| Trial already used | `trialUnavailable`, `CheckoutBanner` | Plain subscription prices, plus a banner above the CTA: "No free trial for this purchase" | Offer: Trial already used |
| Free product | `is_free_product_price` | No breakdown, no payment form, no cardholder; CTA "Get for free"; mandate becomes the Merchant of Record line | Offer: Free product |
| Pay what you want | `amount_type = custom`, `CheckoutPWYWForm` | "Name a fair price · $5 minimum" money field; validation "Amount must be at least $5" | Offer: Pay what you want |
| Pay what you want, free allowed | `minimum_amount = 0` | Error "Amount must be $0 or at least $0.50"; at $0 the checkout turns free | Offer: Pay what you want, free allowed |
| Seats | `seat_based`, `CheckoutSeatSelector` | Stepper (− 5 +, click to type), "2 - 50 seats"; breakdown "Base price" + "5 seats × $12"; fixed seats show the number only | Offer: Seats |
| Seats update failed | `seats.updateFailed` | "Failed to update seats" under the stepper | Moment: Quantity update failed |
| Units | `unit_based`, `CheckoutUnitSelector` | "Number of packs" stepper, "3 packs × $10" row | Offer: Units |
| Metered usage | `MeteredPricesDisplay`, `MeteredChargesDetails`, `MeteredTierRows` | Under the price, "Additional metered charges may apply" disclosure: per meter "10,000 requests included" + rate, tier table "1–1,000 · 1,001+", "All usage is billed at the rate for the range it falls in" for volume tiers | Offer: Metered usage |
| Several products | `CheckoutProductSwitcher` | Radio list: name, "Billed monthly" / "One-time purchase", price (seat/unit ones "From $x") | Offer: Several products |
| Product media | `product.medias` | 40px thumbnail by the name, "+2" badge opens a slideshow | Inventoried only |

## Discount

| State | Source | What changes | Draft |
| --- | --- | --- | --- |
| Codes not allowed / not applicable | `allow_discount_codes`, `is_discount_applicable` | No discount control at all | Discount: Not offered |
| Collapsed | `CheckoutDiscountInput collapsible` | "Add discount code" secondary pill under the breakdown | Discount: Add button |
| Field open, code typed | expanded | Field with an "Apply" button inside its end; Enter applies | Discount: Code typed |
| Applying | `update({discount_code})` in flight | Apply spinning, totals waiting | Discount: Applying |
| Invalid code | API validation error on `discount_code` | Field red, message under it | Discount: Invalid code |
| Applied by code, percentage | `discount.type = percentage` | Breakdown row "Launch week (20%)" −$5.80, "Taxable amount"; field locked with its code and an ✕ to remove | Discount: Code applied, 20% |
| Applied without a code | `discount.code = null` (the screenshot's "Launch price") | Row and Taxable amount; Polar shows an empty locked field with ✕ | Discount: Automatic, no code |
| Limited-time (once / N months) | `isTemporaryDiscount`, `discount.until` | Row subtitle "Until Jan 29"; total becomes "First payment" (or "Total after trial" + date with a trial); hero trial line becomes "Free until …"; discounted mandate | Discount: Limited-time, 3 months |
| Removed | `update({discount_code: null})` | Back to collapsed | ✕ on an applied code |

## Taxes

| State | Source | What changes | Draft |
| --- | --- | --- | --- |
| Included | `tax_behavior = inclusive` | "Taxes (included)" row; total unchanged | Taxes: Included in the price |
| Added on top | exclusive | "Taxes" row; total = taxable + tax | Taxes: Added on top |
| Not known yet | `tax_amount = null` (address incomplete) | "—" in the tax row | Taxes: Not known yet |
| Reverse charge | valid business tax ID | Tax $0 | Business purchase: Tax ID applied |

## Contact and billing

| State | Source | What changes | Draft |
| --- | --- | --- | --- |
| Email empty / filled | `customer_email` | | Email: Empty / Filled |
| Email locked | `customer_id !== null` | Field disabled with the known customer's email | Email: Known customer |
| Email invalid / missing | form validation | "This field is required" | Email: Missing |
| Country only | `billing_address_fields` (most countries) | Country select alone | Billing address: Country only |
| Country with postal code and state | US / CA (`COUNTRIES_WITH_FIXED_STATE_OPTIONS`) | Postal code, State (or Province) select | Billing address: United States / Canada |
| Full address required | `require_billing_address` | Street, Apartment, Postal code + City, State/Province, Country | Billing address: Full address |
| Address errors | required fields empty on submit | Each field "This field is required" | Billing address: Full address, with errors |
| Purchasing as a business | `is_business_customer` | "Business Details" box: Business name (required), Tax ID (optional) | Business purchase: On |
| Tax ID typed | | "Apply" inside the field | Business purchase: Tax ID typed |
| Tax ID applied | `customer_tax_id` | Field locked, ✕ to clear; tax goes to reverse charge | Business purchase: Tax ID applied |
| Tax ID invalid | API error | Field red, message | Business purchase: Tax ID invalid |

## Custom fields (`CustomFieldInput`)

| State | What it draws | Draft |
| --- | --- | --- |
| None | | Custom fields: None |
| Text (one line), textarea | Label (Markdown), placeholder, help, min/max length | Custom fields: One of each type |
| Number | `ge` / `le` | Custom fields: One of each type |
| Date | min/max | Custom fields: One of each type |
| Select | options, placeholder | Custom fields: One of each type |
| Checkbox | label beside it, Markdown link (terms), required | Custom fields: One of each type |
| Required vs optional | "(Optional)" marker; required ones fail on submit | Custom fields: One of each type / With errors |

## Payment method (Stripe Payment Element)

| State | Source | What changes | Draft |
| --- | --- | --- | --- |
| Loading | Element not ready, CTA disabled | Skeleton where the element goes | Payment method: Loading |
| Failed to load | `onLoadError` | "The payment form failed to load. Please refresh the page and try again." | Payment method: Failed to load |
| Link, saved card | Link customer session (the screenshot) | Link account row, saved Visa •••• 3709 with "Confirm", "Change payment method" | Payment method: Link, saved card |
| Link, changing method | Link "Change payment method" | Saved cards to pick from, "Pay another way" | Payment method: Link, changing card |
| New card | tabs layout, `card` | Tabs (Card / Apple Pay / Google Pay), Card number, Expiration, CVC; "Cardholder name" field after | Payment method: New card |
| Card invalid | Element validation | "Your card number is incomplete." under the field | Payment method: New card, invalid |
| Wallet | `apple_pay`, `google_pay`, `link` (`WALLET_PAYMENT_METHODS`) | Wallet tab, no cardholder name | Payment method: Apple Pay |
| Not needed | free / $0 | No element | Offer: Free product |

## Submitting and after

| State | Source | What changes | Draft |
| --- | --- | --- | --- |
| Ready | | CTA enabled | Moment: Ready to pay |
| Updating | `isUpdatePending` | CTA disabled while a price-changing update is in flight | Moment: Updating price |
| Processing | `loadingLabel` "Processing order..." → "Processing payment" | CTA spinning, label under it (the draft drops the label: the button says it, and nothing shifts) | Moment: Processing |
| 3-D Secure | `intent_status = requires_action`, `handleNextAction` | Stripe's challenge over the page | Moment: 3-D Secure |
| 3DS not completed | `paymentNotCompleted` | "Payment was not completed. Please try again." | Moment: 3-D Secure not completed |
| Card declined | `PaymentError` | Root error "Your card was declined." | Moment: Card declined |
| Already subscribed | `AlreadyActiveSubscriptionError` | Root error | Moment: Already subscribed |
| Payments unavailable | org `payment_ready = false`, `denied` | Danger alert "Payments are currently unavailable", CTA disabled, red line under it | Moment: Payments unavailable |
| Test mode | org `status = created` | Info alert "Acme is in test mode" | Moment: Seller in test mode |
| Expired | `ExpiredCheckoutError`, 403/410 (Polar 404s today: "TODO: show expired checkout page") | Its own page | Moment: Checkout expired |
| Confirmation: processing | `status = confirmed` | "We are processing your order" | Moment: Confirming order |
| Confirmation: needs action | confirmed + `requires_action` | "Confirm payment" button | Moment: Confirm payment |
| Confirmation: failed | `status = failed` | "A problem occurred while processing your order" | Moment: Order failed |
| Success, granting | `succeeded`, `CheckoutBenefits` | "Thank you for your order!", "Granting benefits..." | Moment: Paid, granting benefits |
| Success, benefits | benefit grants | License key (copy), downloads, GitHub / Discord connect | Moment: Paid |
| Success, team seats | seat-based, `seats > 1`, `CheckoutSeatInvitations` | "Invite up to 4 more team members" emails | Moment: Paid (Offer: Seats) |

## Where the draft departs from Polar

- An applied code moves into the breakdown as a chip with its own ✕,
  instead of sitting in a locked, empty field (the screenshot's "Launch
  price" row next to an empty "Discount code" field with an ✕).
- Errors after Pay (declined, 3DS not completed, already subscribed) are an
  alert above the button rather than a red line under it.
- The breakdown, Link wallet, business details, benefits and seat invites
  are card-in-card frames from the dashboard's design system.
- The expired checkout has a page of its own; Polar 404s.
- The failed confirmation offers "Back to checkout".

## Live versions

Polar's sandbox (sandbox.polar.sh) shows each of these with Stripe's test
cards (4242… succeeds, 4000 0000 0000 0002 declines, 4000 0027 6000 3184
asks for 3-D Secure). The draft doesn't depend on any account; captures, if
any, stay outside the repo.
