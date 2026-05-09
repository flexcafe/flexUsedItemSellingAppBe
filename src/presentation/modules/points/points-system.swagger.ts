export const POINTS_SYSTEM_OVERVIEW_DOC = `Pointing, ranking, review, and withdrawal system:
1. The profile section can show the user's nickname, total points, available withdrawal points, current rank, current rank badge/config, next rank, and pending withdrawal amount.
2. User rank is based on total points. Supported tiers are NEWBIE, BRONZE, SILVER, GOLD, and VIP.
3. Admin manages rank thresholds with GET/PUT /admin/dashboard/points/rank-config.
4. Admin manages how many points each review star gives with GET/PUT /admin/dashboard/points/star-config. Reviews support 1 to 5 stars.
5. After a transaction reaches COMPLETED status, buyer and seller can each review the other side one time.
6. When a review is submitted, the reviewed user receives points based on the current star-point config. Example: if admin config says 5 stars = 10 points, a 5-star review gives 10 points.
7. The system stores every point change in the point ledger and updates the user's cached totalPoints/currentRank for fast profile reads.
8. A user can request point withdrawal from the profile section after KBZPay verification is complete.
9. Withdrawal requests appear in the admin dashboard. Admin can approve or reject pending requests.
10. When admin approves, the requested points are deducted from the user and the user is notified that payout is pending.
11. Admin manually sends money through KBZPay outside the system, then marks the withdrawal paid with the KBZPay transfer reference.
12. When admin marks paid, the system saves the transfer reference and sends a notification to the user with that transaction number.
13. Point-related notifications use eventKey + metadata (same pattern as KBZPay) and trigger Pusher on private-user-{id} for realtime inbox updates. Client event keys: POINTS_REVIEW_RECEIVED_CLIENT, POINTS_WITHDRAWAL_REQUESTED_CLIENT, POINTS_WITHDRAWAL_APPROVED_CLIENT, POINTS_WITHDRAWAL_REJECTED_CLIENT, POINTS_WITHDRAWAL_PAID_CLIENT. Admins receive POINTS_WITHDRAWAL_REQUESTED_ADMIN when a user submits a new withdrawal request.
14. One-time account milestone bonuses (100 points each, once per lifetime, tracked on the point ledger): after successful registration; after phone OTP verification; after email verification; after admin KBZPay verification. Notification event keys: POINTS_BONUS_REGISTRATION_CLIENT, POINTS_BONUS_PHONE_VERIFIED_CLIENT, POINTS_BONUS_EMAIL_VERIFIED_CLIENT, POINTS_BONUS_KBZPAY_VERIFIED_CLIENT.`;

export const CLIENT_POINTS_SUMMARY_DOC = `${POINTS_SYSTEM_OVERVIEW_DOC}

Frontend profile usage:
- Call this endpoint when loading the profile points/rank panel.
- Use totalPoints for rank display and availableWithdrawalPoints for withdrawal input validation.
- pendingWithdrawalAmount is already reserved by existing PENDING withdrawal requests.
- currentRankConfig describes the current tier; nextRankConfig helps show progress to the next tier.`;

export const CLIENT_TRANSACTION_STATS_DOC = `${POINTS_SYSTEM_OVERVIEW_DOC}

Frontend transaction stats usage:
- Use this separate endpoint for profile stats cards.
- totalTransactionsMade counts transactions where the user is either buyer or seller.
- completedSales counts COMPLETED transactions where user is seller.
- completedPurchases counts COMPLETED transactions where user is buyer.`;

export const CLIENT_PUBLIC_PROFILE_DOC = `${POINTS_SYSTEM_OVERVIEW_DOC}

Public profile visibility policy:
- This endpoint is for viewing another user's public profile card.
- It intentionally excludes private account data (phone, email, KBZ verification tags, withdrawal history, admin notes, transaction references, referral data, and point ledger details).
- It returns trust-facing fields only: nickname, avatar, region, rank, average stars, total reviews, completed sales, completed purchases, and memberSince.
- Use this endpoint for other-user profile screens, seller/buyer mini cards, or trust summary panels.`;

export const CLIENT_REQUEST_WITHDRAWAL_DOC = `${POINTS_SYSTEM_OVERVIEW_DOC}

Frontend withdrawal usage:
- User enters the withdrawal amount in profile and submits this endpoint.
- The amount must be at least 1 and cannot exceed availableWithdrawalPoints from GET /client/profile/points.
- User KBZPay must be verified before requesting withdrawal.
- This creates a PENDING request for admin dashboard review.
- The user receives a POINTS_WITHDRAWAL_REQUESTED_CLIENT notification; each active admin receives POINTS_WITHDRAWAL_REQUESTED_ADMIN (metadata includes withdrawalId, requesterUserId, nickname, phone, amount).`;

export const CLIENT_WITHDRAWAL_HISTORY_DOC = `${POINTS_SYSTEM_OVERVIEW_DOC}

Frontend withdrawal history usage:
- Use this endpoint to show the user's withdrawal request list in profile.
- Status values are PENDING, APPROVED, REJECTED, and TRANSFERRED.
- kbzTransferRef is filled after admin marks the request paid.`;

export const CLIENT_CREATE_REVIEW_DOC = `${POINTS_SYSTEM_OVERVIEW_DOC}

Frontend review usage:
- Call this endpoint only after the transaction is COMPLETED.
- Buyer can review seller; seller can review buyer.
- Each user can review the same transaction only once.
- stars must be between 1 and 5.
- The reviewed user receives points based on admin star-point configuration at submit time.`;

export const ADMIN_STAR_CONFIG_DOC = `${POINTS_SYSTEM_OVERVIEW_DOC}

Admin star-point config usage:
- Use this configuration to control points awarded by reviews.
- Configure starCount 1, 2, 3, 4, and 5 with desired pointsAwarded values.
- This affects future reviews. Existing reviews keep their original pointsAwarded value.`;

export const ADMIN_RANK_CONFIG_DOC = `${POINTS_SYSTEM_OVERVIEW_DOC}

Admin rank config usage:
- Use this configuration to control point thresholds for NEWBIE, BRONZE, SILVER, GOLD, and VIP.
- minPoints is the lower bound.
- maxPoints can be null for the highest tier, usually VIP.
- Users' currentRank is recalculated when their point balance changes.`;

export const ADMIN_WITHDRAWAL_LIST_DOC = `${POINTS_SYSTEM_OVERVIEW_DOC}

Admin withdrawal list usage:
- Use this endpoint to load the withdrawal management table.
- Optional status query filters PENDING, APPROVED, REJECTED, or TRANSFERRED.
- Rows include user nickname, phone, KBZPay account info, amount, status, admin note, and transfer reference.`;

export const ADMIN_APPROVE_WITHDRAWAL_DOC = `${POINTS_SYSTEM_OVERVIEW_DOC}

Admin approve usage:
- Approves only PENDING withdrawal requests.
- Deducts the requested points from the user at approval time.
- Recalculates user rank after deduction.
- Sends a notification to the user that the withdrawal is approved and KBZPay transfer is pending.`;

export const ADMIN_REJECT_WITHDRAWAL_DOC = `${POINTS_SYSTEM_OVERVIEW_DOC}

Admin reject usage:
- Rejects only PENDING withdrawal requests.
- Does not deduct user points.
- Optional adminNote is sent to the user notification as the rejection reason.`;

export const ADMIN_MARK_WITHDRAWAL_PAID_DOC = `${POINTS_SYSTEM_OVERVIEW_DOC}

Admin paid usage:
- Use only after the request is APPROVED.
- Admin manually sends money through KBZPay first.
- Then submit kbzTransferRef here.
- The system marks the request TRANSFERRED and notifies the user with the KBZPay transaction number.`;
