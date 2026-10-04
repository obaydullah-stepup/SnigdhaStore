Implement a configurable Meta Purchase Event Trigger system for our COD e-commerce store.

Goal

Add an Admin Panel setting that allows the admin to choose when the Meta Purchase event should be fired.

The admin must be able to select between:

Immediately — Fire Purchase when the customer successfully places an order.

Confirmed Only — Fire Purchase only when the order status is changed to Confirmed from the admin/order management system.

The selected setting must control the Purchase event behavior globally.

Admin Panel

Add a new setting:

Meta Purchase Event Trigger

Options:

Immediately

Confirmed Only

Example UI:

Meta Purchase Event Trigger

( ) Immediately
    Fire Purchase as soon as the customer places an order.

( ) Confirmed Only
    Fire Purchase only after the order is confirmed by the admin.


Persist this setting in the existing application settings/configuration system.

Do not hard-code the behavior.

Behavior: Immediately

When the admin setting is:

purchase_trigger = "immediately"


Flow:

Customer places order
        ↓
Order successfully created
        ↓
Trigger Purchase event
        ↓
Send to Meta


The Purchase event should only be triggered after the order has been successfully created.

Do not fire Purchase for failed order creation attempts.

Behavior: Confirmed Only

When the admin setting is:

purchase_trigger = "confirmed"


Flow:

Customer places order
        ↓
Order = Pending
        ↓
No Purchase event
        ↓
Admin confirms order
        ↓
Order = Confirmed
        ↓
Trigger Purchase event
        ↓
Send to Meta


Changing an order from Pending to Confirmed should trigger the Purchase event.

The event must NOT be triggered merely because the order was created.

Duplicate Prevention

This is critical.

The same order must never intentionally generate multiple Meta Purchase events.

Add a persistent field to the order, for example:

meta_purchase_sent: boolean


Default:

false


Before sending a Purchase event:

if meta_purchase_sent === true:
    do not send Purchase again


After a successful Meta event submission:

meta_purchase_sent = true


This must protect against:

Admin confirming the same order multiple times

Order status being updated repeatedly

Webhook retries

Page refreshes

API retries

Multiple backend requests

Race conditions

Use an atomic/database-safe mechanism where appropriate so concurrent requests cannot send duplicate Purchase events.

Pixel + CAPI

Support both:

Browser Pixel

If the Purchase event is fired from the browser, use the existing Meta Pixel implementation.

Conversions API

Support server-side Purchase events through Meta Conversions API.

When both Browser Pixel and CAPI send the same Purchase event, use the same unique event_id so Meta can deduplicate them.

Example:

order_id = 12345

event_name = Purchase
event_id = "purchase_order_12345"


The exact event ID strategy can be adjusted to fit the existing codebase, but it must be deterministic and unique per order.

Do NOT generate a new random event ID every time the same order is retried.

Important COD Requirement

Do not automatically send a Purchase event when an order is later cancelled.

For example:

Order placed
    ↓
Confirmed
    ↓
Purchase sent
    ↓
Customer cancels later


Do not attempt to resend or duplicate the Purchase event simply because the status changes again.

The original Purchase event remains recorded as sent.

If the existing Meta integration supports a separate cancellation/refund event, that can be handled independently. Do not treat cancellation as a second Purchase.

Configuration Changes

If the admin changes:

Immediately


to:

Confirmed Only


the new setting should apply to new triggering actions/orders.

Do not automatically replay old orders or resend historical Purchase events just because the setting changed.

Likewise, changing the setting must not reset:

meta_purchase_sent


for existing orders.

Consent / Privacy

Do NOT use CAPI as a way to bypass browser consent or privacy restrictions.

If the existing implementation requires marketing consent before Meta Purchase tracking, preserve that behavior for both Pixel and CAPI.

The new trigger setting controls WHEN the Purchase event is triggered.

The existing consent system controls WHETHER the event is permitted to be sent.

Keep these concerns separate:

Purchase Trigger
        +
Consent / Privacy Rules
        ↓
Should Purchase be sent?
        ↓
Pixel / CAPI


Do not classify Meta marketing tracking as a necessary store-functionality cookie merely because the customer placed an order.

Recommended Event Flow
Immediately mode
Customer
   ↓
Place COD Order
   ↓
Order created successfully
   ↓
Check consent / tracking eligibility
   ↓
Check meta_purchase_sent
   ↓
Purchase event
   ↓
Browser Pixel and/or CAPI
   ↓
Mark meta_purchase_sent = true

Confirmed Only mode
Customer
   ↓
Place COD Order
   ↓
Order = Pending
   ↓
No Purchase
   ↓
Admin confirms
   ↓
Order = Confirmed
   ↓
Check consent / tracking eligibility
   ↓
Check meta_purchase_sent
   ↓
Purchase event
   ↓
Browser Pixel and/or CAPI
   ↓
Mark meta_purchase_sent = true

Error Handling

If Meta API fails:

Do NOT mark meta_purchase_sent = true.

Store/log the failed attempt.

Make the event retryable.

Ensure retries use the same event_id.

Ensure retries cannot create duplicate Purchase events.

Example:

Meta request failed
       ↓
meta_purchase_sent = false
       ↓
retry
       ↓
same event_id


If Meta successfully accepts the event:

Meta request successful
       ↓
meta_purchase_sent = true

Existing Codebase Requirements

Before implementing:

Inspect the existing Meta Pixel implementation.

Inspect the existing consent implementation.

Inspect the existing order creation flow.

Inspect the existing order status update/confirmation flow.

Inspect any existing CAPI implementation.

Reuse existing abstractions where possible.

Do not create duplicate Meta integrations if one already exists.

Do not unnecessarily rewrite unrelated code.

Testing Requirements

Add tests for at least these scenarios:

Immediately

New order → Purchase sent.

Failed order creation → Purchase not sent.

Same order processed twice → only one Purchase.

Meta failure → meta_purchase_sent remains false.

Retry after failure → Purchase can be retried.

Successful retry → marked as sent.

Confirmed Only

New Pending order → no Purchase.

Pending → Confirmed → one Purchase.

Confirmed → Confirmed/update again → no duplicate Purchase.

Confirmed order cancelled later → no new Purchase.

Meta failure during confirmation → event remains retryable.

Retry after Meta failure → same event ID is used.

Configuration

Admin selects Immediately → new orders trigger Purchase.

Admin selects Confirmed Only → only confirmed orders trigger Purchase.

Changing the setting does not replay historical orders.

Changing the setting does not reset meta_purchase_sent.

Deliverable

Implement the complete feature end-to-end:

Admin setting UI

Persistent configuration

Purchase trigger logic

Order-status integration

Meta Pixel integration

Meta CAPI integration where already supported/configured

Event ID / deduplication

Duplicate prevention

Retry/error handling

Consent/privacy preservation

Automated tests

Keep the implementation compatible with the existing architecture and avoid unrelated changes.