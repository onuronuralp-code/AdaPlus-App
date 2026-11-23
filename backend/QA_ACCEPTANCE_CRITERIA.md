# Ada+ — QA Acceptance Criteria

**Test setup:** Two test accounts required.
- **User A** — registered, logged in
- **User B** — registered, logged in (separate device or simulator)
- **Admin** — ADMIN role account

---

## 1. Authentication

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| A-1 | Signup | Register with a valid email + password (≥8 chars) | Account created; user lands on main tab |
| A-2 | Duplicate email | Register with an already-used email | Error message returned |
| A-3 | Login | Login with correct credentials | JWT stored; user sees profile info |
| A-4 | Wrong password | Login with incorrect password | Error message; no token stored |
| A-5 | Logout | Tap logout icon → confirm "Çıkış Yap" | Profile tab shows "Giriş Yapılmadı"; tap "Giriş Yap" navigates to login |
| A-6 | Session persistence | Force-close and reopen app while logged in | User remains logged in (30-day JWT) |
| A-7 | Expired session | Log in on a second device; log out on first | Both devices should remain logged in (stateless JWT — no server-side invalidation) |

---

## 2. Forum — Posts

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| F-1 | Create post (User A) | Write content → tap YAYINLA | Post appears at top of feed immediately |
| F-2 | Post daily limit | User A tries to post a second post the same day | Alert: "You have reached the daily post limit of 1. Try again tomorrow." |
| F-3 | User B sees User A's post | User B opens forum | Post by A visible without login |
| F-4 | Anonymous post | User A creates post with "Anonim" toggled | Author name hidden in feed |
| F-5 | Poll creation | User A creates a poll with 2+ options | Poll renders with vote buttons; vote counts start at 0 |
| F-6 | Poll vote | User B votes on User A's poll | Percentage updates; User B cannot vote again |
| F-7 | Like a post | User B likes User A's post | Like count increments; heart turns filled |
| F-8 | Unlike | User B taps the filled heart | Like count decrements; heart turns empty |
| F-9 | Like requires auth | Logged-out user taps like | Redirected to login screen |
| F-10 | Report a post | User B reports User A's post | "Şikayetiniz alındı" confirmation; reporting twice returns error |
| F-11 | Delete own post | User A deletes their post | Post removed from feed for all users |
| F-12 | Cannot delete others' post | User B tries to delete User A's post (API) | 403 Forbidden |

---

## 3. Forum — Replies

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| R-1 | Post reply (User B) | User B opens User A's post → writes reply → send | Reply appears; post's reply count increments |
| R-2 | Reply daily limit | User B sends 4th reply in same day | Alert: "You have reached the daily reply limit of 3. Try again tomorrow." |
| R-3 | Reply to reply blocked | User A tries to reply to User B's reply (API) | 400: "Replies to replies are not allowed." |
| R-4 | User A sees User B's reply | User A opens their post | User B's reply is visible |

---

## 4. User Profile

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| P-1 | Posts tab | User A opens Profile → Paylaşımlar | Only User A's top-level posts shown |
| P-2 | Replies tab | User A opens Yanıtlar | Only User A's replies shown |
| P-3 | Likes tab | User A opens Beğeniler | Posts that User A has liked shown |
| P-4 | Listings tab | User A opens İlanlar | User A's own listings (all statuses including PENDING) |
| P-5 | Activities tab | User A opens Etkinlikler | User A's own activities with status badge (Beklemede / Onaylı / Reddedildi) |
| P-6 | Reload on tab focus | Switch to another tab and back to Profile | Data refreshes automatically (no stale posts) |
| P-7 | View another user's posts | (via API) GET /api/v1/users/{userB-id}/posts | Returns User B's posts; no auth required |

---

## 5. Listings (İlanlar)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| L-1 | Browse listings | Open İlanlar without logging in | All APPROVED listings visible |
| L-2 | Category filter | Tap "Emlak" | Only Emlak listings shown |
| L-3 | Create listing (User A) | Fill title, description (≤500 chars), price, 11-digit contact, island, category → YAYINLA | Success alert "incelemeye alınmıştır"; listing NOT visible in feed yet |
| L-4 | Validation — contact | Enter non-11-digit contact | YAYINLA button stays disabled; inline error shown |
| L-5 | Validation — description | Enter >500 chars | Request blocked (backend 400) |
| L-6 | Listing requires auth | Logged-out user taps FAB (+ button) | Login prompt shown |
| L-7 | Admin approves | Admin opens /admin panel → approves User A's listing | Listing appears in feed within 60 seconds (polling) |
| L-8 | Admin rejects | Admin rejects with a reason | User A receives push notification "İlan başvurusu reddedildi" |
| L-9 | Listing detail | Tap any listing card | Opens detail page with full info; no route path shown in header |
| L-10 | User A sees own listing in profile | Profile → İlanlar tab | PENDING listing visible with "Beklemede" badge |
| L-11 | User B cannot see User A's PENDING listing | User B opens İlanlar | PENDING listing not visible |
| L-12 | Auto-refresh | Wait 60 seconds on listing screen | Any newly approved listing appears without manual refresh |

---

## 6. Activities (Etkinlikler)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| E-1 | Browse activities | Open Etkinlikler without logging in | All APPROVED upcoming activities visible |
| E-2 | Create activity (User A) | Fill name, dates (start < end), place, organizer, 11-digit contact, description ≤500 chars → submit | Success alert; activity NOT in public feed yet |
| E-3 | Start > end date | Set end date before start date | App shows validation error; submit blocked |
| E-4 | Contact validation | Enter non-11-digit contact | Submit blocked or 400 from backend |
| E-5 | Admin approves | Admin approves activity | Activity appears in feed within 60 seconds (polling) |
| E-6 | Admin rejects | Admin rejects with reason | User A receives push notification "Etkinlik başvurusu reddedildi" |
| E-7 | User A sees status | Profile → Etkinlikler | Own activity shown with status badge |

---

## 7. Push Notifications

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| N-1 | Token registered on login | User A logs in | Backend log shows "Registered IOS/ANDROID device token" |
| N-2 | Listing approved notification | Admin approves User A's listing | User A receives push: "İlan onaylandı — [title] ilanınız onaylandı ve yayında." |
| N-3 | Listing rejected notification | Admin rejects User A's listing | User A receives push: "İlan başvurusu reddedildi" with rejection reason |
| N-4 | Activity approved notification | Admin approves User A's activity | User A receives push: "Etkinlik onaylandı" |
| N-5 | Foreground notification | App open when notification arrives | In-app Alert shows title and body |
| N-6 | Token removed on logout | User A logs out | Backend log shows device token deleted; no subsequent pushes to that token |

---

## 8. Ferry & Bus Schedules (Read-only, no auth)

| # | Scenario | Expected |
|---|----------|----------|
| S-1 | Ferry departures | GET /api/v1/travel/ferries/departures?from=kinaliada returns upcoming departures with minutesUntil ≥ 0 |
| S-2 | Bus departures | GET /api/v1/travel/buses/departures?route=K1 returns bus times |
| S-3 | Rate limit | >60 req/min from same IP returns 429 |

---

## 9. Cross-user Interaction Flow (End-to-End)

Run this full flow with User A and User B:

1. **User A** creates a forum post (Message type)
2. **User B** (not logged in) opens forum → sees User A's post ✓
3. **User B** logs in → likes the post → like count = 1 ✓
4. **User B** replies to the post → User A's post reply count increments ✓
5. **User A** opens their Profile → Paylaşımlar → sees the post with like count = 1 and reply count = 1 ✓
6. **User A** creates a listing → Admin approves → **User B** sees it within 60 seconds ✓
7. **User A** creates an activity → Admin approves → **User A** receives push notification ✓
8. **User A** logs out → Profile shows "Giriş Yapılmadı" ✓
9. **User B** opens Profile → Paylaşımlar → sees their own reply ✓

---

## 10. Edge Cases & Security

| # | Scenario | Expected |
|---|----------|----------|
| X-1 | Unauthenticated POST to /forum/posts | 401 Unauthorized |
| X-2 | Expired JWT | 401; user must re-login |
| X-3 | Admin endpoint without ADMIN role | 403 Forbidden |
| X-4 | Invalid UUID in path | 400 or 404 with JSON error body |
| X-5 | XSS in post content | Content stored as-is; rendered as plain text, not HTML |
| X-6 | Oversized description (>500 chars) | 400 with field-level validation message |
| X-7 | Invalid phone number format | 400: "Contact number must be exactly 11 digits" |
