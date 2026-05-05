export const KBZPAY_VERIFICATION_FLOW_DOC = `Manual KBZPay verification process:
1. Client registers or logs in.
2. Client completes phone/email verification if still pending.
3. Client opens profile verification section.
4. Client calls POST /client/auth/kbzpay/request-verification to start KBZPay verification. This payload accepts only optional message. Do not send kbzTransactionId in this step.
5. System marks KBZPay status as PENDING and keeps the request in admin queue.
6. Admin checks GET /admin/dashboard/auth/kbzpay/pending-verifications and sends instruction with POST /admin/dashboard/auth/kbzpay/:userId/send-instruction using adminPhoneForTransfer (optional adminNote can be included).
7. Frontend shows instruction, and client transfers exactly 100 MMK to the provided admin phone.
8. Client sends POST /client/auth/kbzpay/submit-transaction with kbzTransactionId after transfer.
9. Admin manually checks KBZPay app (amount, sender account/name/number, and transaction record) and finalizes with POST /admin/dashboard/auth/kbzpay/:userId/verify.
10. Client checks GET /client/auth/me to confirm KBZPay status is VERIFIED.`;

export const KBZPAY_REQUEST_VERIFICATION_DOC = `${KBZPAY_VERIFICATION_FLOW_DOC}

This endpoint handles Step 4.`;

export const KBZPAY_SUBMIT_TRANSACTION_DOC = `${KBZPAY_VERIFICATION_FLOW_DOC}

This endpoint handles Step 8.`;

export const KBZPAY_PROFILE_STATUS_DOC = `${KBZPAY_VERIFICATION_FLOW_DOC}

Use this endpoint for Step 10 status check.`;

export const KBZPAY_PENDING_LIST_DOC = `${KBZPAY_VERIFICATION_FLOW_DOC}

This endpoint is used in Step 6.`;

export const KBZPAY_SEND_INSTRUCTION_DOC = `${KBZPAY_VERIFICATION_FLOW_DOC}

This endpoint is used in Step 6.`;

export const KBZPAY_ADMIN_VERIFY_DOC = `${KBZPAY_VERIFICATION_FLOW_DOC}

This endpoint handles Step 9.`;
