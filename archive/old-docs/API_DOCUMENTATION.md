# CoachSearching API Documentation

**Base URL:** `https://clouedo.com/coachsearching/api`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Analytics Endpoints](#analytics-endpoints)
3. [Coaches Endpoints](#coaches-endpoints)
4. [Search Endpoints](#search-endpoints)
5. [Progress Endpoints](#progress-endpoints)
6. [Bookings Endpoints](#bookings-endpoints)
7. [Referrals Endpoints](#referrals-endpoints)
8. [Promo Codes Endpoints](#promo-codes-endpoints)
9. [Auth Endpoints](#auth-endpoints)
10. [Error Handling](#error-handling)
11. [Rate Limiting](#rate-limiting)

---

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

The token is obtained from Supabase authentication and should be included in the `api-client.js` automatically.

---

## Analytics Endpoints

### Get Platform Overview

```http
GET /analytics/overview
```

**Response:**
```json
{
  "total_users": 1247,
  "total_coaches": 89,
  "total_bookings": 3421,
  "total_revenue": 127650.50,
  "active_sessions": 34,
  "conversion_rate": 23.5,
  "avg_session_price": 75.00,
  "growth_rate": 18.2
}
```

### Get User Analytics

```http
GET /analytics/users/{period}
```

**Parameters:**
- `period`: `7d`, `30d`, `90d`, `1y`, `all`

**Response:**
```json
{
  "period": "30d",
  "total_users": 1247,
  "new_users": 89,
  "active_users": 456,
  "user_retention": 68.5,
  "growth_data": [
    {
      "date": "2025-11-01",
      "new_users": 12,
      "total_users": 1100
    }
  ]
}
```

### Get Revenue Analytics

```http
GET /analytics/revenue/{period}
```

**Response:**
```json
{
  "period": "30d",
  "total_revenue": 127650.50,
  "gross_revenue": 150180.00,
  "platform_fee": 22529.50,
  "coach_payout": 105120.00,
  "revenue_data": [
    {
      "date": "2025-11-01",
      "revenue": 3200.00
    }
  ]
}
```

### Get Booking Analytics

```http
GET /analytics/bookings/{period}
```

**Response:**
```json
{
  "period": "30d",
  "total_bookings": 3421,
  "completed_bookings": 2987,
  "cancelled_bookings": 234,
  "pending_bookings": 200,
  "booking_data": [
    {
      "date": "2025-11-01",
      "bookings": 45
    }
  ]
}
```

### Get Coach Analytics

```http
GET /analytics/coaches/{period}
```

**Response:**
```json
{
  "period": "30d",
  "total_coaches": 89,
  "active_coaches": 67,
  "verified_coaches": 54,
  "top_coaches": [
    {
      "id": "1",
      "name": "Sarah Johnson",
      "total_bookings": 145,
      "total_revenue": 10875.00,
      "avg_rating": 4.9
    }
  ]
}
```

---

## Coaches Endpoints

### List All Coaches

```http
GET /coaches
```

**Response:**
```json
{
  "coaches": [
    {
      "id": "1",
      "full_name": "Sarah Johnson",
      "email": "sarah@example.com",
      "title": "Certified Life Coach",
      "bio": "Helping professionals find clarity and purpose",
      "specialties": ["Life Coaching", "Career Coaching"],
      "languages": ["English", "Spanish"],
      "hourly_rate": 75.00,
      "rating_average": 4.9,
      "rating_count": 87,
      "is_verified": true,
      "avatar_url": null,
      "location": "Remote"
    }
  ],
  "source": "supabase"
}
```

### Get Single Coach

```http
GET /coaches/{id}
```

**Response:**
```json
{
  "id": "1",
  "full_name": "Sarah Johnson",
  "email": "sarah@example.com",
  "title": "Certified Life Coach",
  "bio": "Helping professionals find clarity and purpose",
  "specialties": ["Life Coaching", "Career Coaching"],
  "languages": ["English", "Spanish"],
  "hourly_rate": 75.00,
  "rating_average": 4.9,
  "rating_count": 87,
  "is_verified": true,
  "avatar_url": null,
  "location": "San Francisco, CA"
}
```

### Update Coach Profile

```http
PUT /coaches/{id}
```

**Request Body:**
```json
{
  "title": "Senior Life Coach",
  "bio": "Updated bio text",
  "hourly_rate": 85.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Coach profile updated",
  "coach_id": "1"
}
```

### Get Coach Portfolio

```http
GET /coaches/{id}/portfolio
```

**Response:**
```json
{
  "overview": {
    "summary": "Professional summary",
    "years_experience": 8,
    "clients_coached": 150,
    "success_rate": 92,
    "education": "ICF Certified Coach",
    "philosophy": "Coaching philosophy text"
  },
  "certifications": [
    {
      "id": "1",
      "name": "ICF Professional Certified Coach",
      "issuer": "International Coaching Federation",
      "date": "2019-06",
      "credential_id": "PCC123456",
      "image_url": null
    }
  ],
  "case_studies": [],
  "media": {
    "video_intro": "",
    "images": [],
    "documents": []
  }
}
```

### Update Coach Portfolio

```http
PUT /coaches/{id}/portfolio
```

**Request Body:**
```json
{
  "overview": {
    "summary": "Updated summary",
    "years_experience": 10
  },
  "certifications": [...]
}
```

### Get Coach Availability

```http
GET /coaches/{id}/availability
```

**Response:**
```json
{
  "monday": [
    {"start": "09:00", "end": "12:00"},
    {"start": "14:00", "end": "17:00"}
  ],
  "tuesday": [
    {"start": "09:00", "end": "17:00"}
  ],
  "wednesday": [],
  "thursday": [...],
  "friday": [...],
  "saturday": [],
  "sunday": []
}
```

### Set Coach Availability

```http
POST /coaches/{id}/availability
```

**Request Body:**
```json
{
  "monday": [
    {"start": "09:00", "end": "17:00"}
  ],
  "tuesday": []
}
```

---

## Search Endpoints

### Search Coaches

```http
POST /search/coaches
```

**Request Body:**
```json
{
  "query": "life coach",
  "specialties": ["Life Coaching", "Career Coaching"],
  "min_price": 50,
  "max_price": 100,
  "min_rating": 4.5,
  "languages": ["English"],
  "is_verified": true,
  "availability_day": "monday",
  "sort": "rating",
  "page": 1,
  "limit": 20
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "1",
      "full_name": "Sarah Johnson",
      "title": "Certified Life Coach",
      "bio": "...",
      "specialties": [...],
      "hourly_rate": 75.00,
      "rating_average": 4.9,
      "rating_count": 87
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```

### Get Search Suggestions

```http
GET /search/suggestions?q=life
```

**Response:**
```json
{
  "suggestions": [
    "Life Coaching",
    "Leadership Development"
  ]
}
```

---

## Progress Endpoints

### Get Client Progress

```http
GET /progress/client/{user_id}?period=30d
```

**Parameters:**
- `period`: `7d`, `30d`, `90d`, `1y`, `all`

**Response:**
```json
{
  "stats": {
    "total_sessions": 24,
    "goals_achieved": 3,
    "total_goals": 5,
    "average_progress": 68,
    "current_streak": 12
  },
  "sessions": [
    {
      "id": "1",
      "date": "2025-11-20",
      "title": "Career Planning Session",
      "notes": "Session notes",
      "mood": 8,
      "energy": 7,
      "progress_score": 75,
      "coach_feedback": "Great progress!"
    }
  ],
  "goals": [...],
  "achievements": [...],
  "action_items": [...]
}
```

### Update Action Item

```http
POST /progress/action-items/{id}
```

**Request Body:**
```json
{
  "completed": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Action item updated",
  "item_id": "1"
}
```

---

## Bookings Endpoints

### List User Bookings

```http
GET /bookings
```

**Response:**
```json
{
  "bookings": [
    {
      "id": "1",
      "coach_id": "1",
      "coach_name": "Sarah Johnson",
      "client_id": "user123",
      "scheduled_at": "2025-11-28T10:00:00Z",
      "duration": 60,
      "status": "confirmed",
      "price": 75.00,
      "notes": "Career planning session",
      "created_at": "2025-11-20T14:30:00Z"
    }
  ]
}
```

### Get Booking Details

```http
GET /bookings/{id}
```

### Create Booking

```http
POST /bookings
```

**Request Body:**
```json
{
  "coach_id": "1",
  "scheduled_at": "2025-11-28T10:00:00Z",
  "duration": 60,
  "price": 75.00,
  "notes": "Career planning session"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking created",
  "booking_id": "booking_xyz123",
  "booking": {
    "id": "booking_xyz123",
    "coach_id": "1",
    "scheduled_at": "2025-11-28T10:00:00Z",
    "duration": 60,
    "status": "pending",
    "price": 75.00
  }
}
```

### Update Booking

```http
PATCH /bookings/{id}
```

**Request Body:**
```json
{
  "scheduled_at": "2025-11-29T10:00:00Z",
  "notes": "Updated notes"
}
```

### Cancel Booking

```http
DELETE /bookings/{id}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled",
  "booking_id": "1"
}
```

---

## Referrals Endpoints

### Get Referral Code

```http
GET /referrals/code
```

**Response:**
```json
{
  "code": "COACH123ABC",
  "share_url": "https://coachsearching.com?ref=COACH123ABC"
}
```

### Get Referral Stats

```http
GET /referrals/stats
```

**Response:**
```json
{
  "total_referrals": 12,
  "successful_referrals": 8,
  "pending_referrals": 4,
  "total_rewards": 80.00,
  "available_balance": 50.00,
  "lifetime_earnings": 120.00
}
```

### List Referrals

```http
GET /referrals/list
```

**Response:**
```json
{
  "referrals": [
    {
      "id": "1",
      "referred_user": "John D.",
      "status": "completed",
      "reward_amount": 10.00,
      "date": "2025-11-15"
    }
  ]
}
```

### Apply Referral Code

```http
POST /referrals/apply
```

**Request Body:**
```json
{
  "code": "COACH123ABC"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Referral code applied",
  "discount": 10.00
}
```

### Validate Referral Code

```http
POST /referrals/validate
```

**Request Body:**
```json
{
  "code": "COACH123ABC"
}
```

**Response:**
```json
{
  "valid": true,
  "discount_amount": 10.00,
  "discount_type": "fixed"
}
```

---

## Promo Codes Endpoints

### Get Active Promo Codes

```http
GET /promo-codes/active
```

**Response:**
```json
{
  "promo_codes": [
    {
      "id": "1",
      "code": "WELCOME20",
      "description": "Get 20% off your first session",
      "discount_type": "percentage",
      "discount_value": 20,
      "valid_until": "2025-12-31"
    }
  ]
}
```

### Validate Promo Code

```http
POST /promo-codes/validate
```

**Request Body:**
```json
{
  "code": "WELCOME20",
  "booking_amount": 100.00
}
```

**Response:**
```json
{
  "valid": true,
  "code": "WELCOME20",
  "discount_amount": 20.00,
  "final_amount": 80.00
}
```

### Apply Promo Code

```http
POST /promo-codes/apply
```

**Request Body:**
```json
{
  "code": "WELCOME20",
  "booking_id": "booking_123",
  "discount_amount": 20.00
}
```

### Admin: List All Promo Codes

```http
GET /promo-codes
```

**Requires:** Admin authentication

### Admin: Create Promo Code

```http
POST /promo-codes
```

**Request Body:**
```json
{
  "code": "SUMMER25",
  "description": "Summer discount",
  "discount_type": "percentage",
  "discount_value": 25,
  "usage_limit": 100,
  "valid_until": "2025-08-31"
}
```

### Admin: Update Promo Code

```http
PATCH /promo-codes/{id}
```

### Admin: Deactivate Promo Code

```http
DELETE /promo-codes/{id}
```

---

## Auth Endpoints

### Get Current User

```http
GET /auth/me
```

**Response:**
```json
{
  "id": "user123",
  "email": "john@example.com",
  "name": "John Doe",
  "role": "client",
  "avatar_url": null,
  "created_at": "2025-09-01T10:00:00Z",
  "onboarding_completed": true
}
```

### Update User Profile

```http
PATCH /auth/me
```

**Request Body:**
```json
{
  "name": "John Smith",
  "bio": "Updated bio"
}
```

### Change Password

```http
POST /auth/change-password
```

**Request Body:**
```json
{
  "old_password": "oldpass123",
  "new_password": "newpass456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Request Account Deletion

```http
DELETE /auth/me
```

**Response:**
```json
{
  "success": true,
  "message": "Account deletion requested. Your account will be deleted in 30 days."
}
```

### Export User Data (GDPR)

```http
POST /auth/export-data
```

**Response:**
```json
{
  "success": true,
  "message": "Data export prepared",
  "data": {
    "user": {...},
    "bookings": [...],
    "reviews": [...],
    "payments": [...]
  }
}
```

---

## Error Handling

All endpoints return errors in the following format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `405` - Method Not Allowed
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Rate Limit:** 60 requests per minute
- **Headers:**
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

When rate limit is exceeded:

```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

---

## Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1732646400,
  "version": "1.0.0"
}
```

---

## Notes

1. **Mock Data:** Currently, the API returns mock data. Replace with Supabase queries in production.
2. **Authentication:** Implement JWT validation in production.
3. **CORS:** Configured to allow all origins (`Access-Control-Allow-Origin: *`). Restrict in production.
4. **Supabase Integration:** Update `config.php` with your Supabase credentials.
5. **Error Logging:** All `[COACH DEBUG]` logs are written to PHP error logs.

---

## Frontend Integration

The API is already integrated with the frontend via `js/api-client.js`:

```javascript
import api from './api-client.js';

// Example usage
const coaches = await api.coaches.search({
  query: 'life coach',
  min_price: 50,
  max_price: 100
});

const progress = await api.progress.getClientProgress(userId, '30d');
```

---

## Deployment

1. Upload `./api/` folder to your FTP server
2. Ensure files are accessible at `https://clouedo.com/coachsearching/api/`
3. Update `api/config.php` with production credentials
4. Test `/health` endpoint
5. Connect endpoints to Supabase database
6. Monitor PHP error logs for `[COACH DEBUG]` messages

---

**Last Updated:** November 26, 2025  
**Version:** 1.0.0
