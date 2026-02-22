<?php
// api/controllers/CoachController.php
//
// After the schema migration cs_coaches holds only operational/billing data.
// All display fields (full_name, title, bio, avatar_url, slug, specialties,
// languages, hourly_rate, …) live in cs_users.profile_data (JSONB).
// The coach_profiles VIEW in Supabase flattens both for easy querying.

class CoachController {
    private $db;

    public function __construct() {
        $this->db = new Database();
    }

    // -------------------------------------------------------------------------
    // GET /coaches  — list coaches for browsing (uses coach_profiles view)
    // -------------------------------------------------------------------------
    public function index() {
        // Use the coach_profiles view which joins cs_users + cs_coaches and
        // promotes JSONB profile_data columns to real SQL columns.
        $query = 'select=*&onboarding_completed=eq.true';

        if (isset($_GET['search'])) {
            $s = urlencode($_GET['search']);
            $query .= "&or=(full_name.ilike.*$s*,title.ilike.*$s*,bio.ilike.*$s*)";
        }

        if (isset($_GET['language'])) {
            $lang = $_GET['language'];
            $query .= "&languages=cs.[\"$lang\"]";
        }

        if (isset($_GET['session_type'])) {
            $st = $_GET['session_type'];
            $query .= "&session_types=cs.[\"$st\"]";
        }

        if (isset($_GET['max_price'])) {
            $query .= '&hourly_rate=lte.' . floatval($_GET['max_price']);
        }

        $query .= '&order=is_featured.desc.nullslast,profile_views.desc.nullslast,hourly_rate.asc.nullslast';

        $limit  = 20;
        $page   = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $offset = ($page - 1) * $limit;
        $query .= "&limit=$limit&offset=$offset";

        try {
            $response = $this->db->request('GET', '/coach_profiles?' . $query);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                $coaches = $response['body'] ?? [];
                echo json_encode(['data' => $coaches]);
            } else {
                http_response_code($response['status']);
                echo json_encode($response['body']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // GET /coaches/{id}  — single coach by user UUID
    // -------------------------------------------------------------------------
    public function get($id) {
        try {
            $response = $this->db->request('GET', '/coach_profiles?id=eq.' . $id . '&limit=1');

            if ($response['status'] >= 200 && $response['status'] < 300 && !empty($response['body'])) {
                echo json_encode(['data' => $response['body'][0]]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Coach not found']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // POST /coaches  — create / upsert coach profile
    // Writes:
    //   • cs_users  — core fields + profile_data JSONB (display data)
    //   • cs_coaches — operational fields only
    // -------------------------------------------------------------------------
    public function create($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['full_name']) || !isset($data['title'])) {
            http_response_code(400);
            echo json_encode(['error' => 'full_name and title are required']);
            return;
        }

        $headers = getallheaders();
        $token   = str_replace('Bearer ', '', $headers['Authorization'] ?? '');

        // --- 1. Build profile_data JSONB (display fields) --------------------
        $profileData = [
            'title'                         => $data['title']                        ?? null,
            'bio'                           => $data['bio']                          ?? '',
            'title_en'                      => $data['title_en']                    ?? null,
            'bio_en'                        => $data['bio_en']                      ?? null,
            'primary_profile_language'      => $data['primary_profile_language']    ?? null,
            'specialties'                   => $data['specialties']                  ?? [],
            'years_experience'              => $data['years_experience']             ?? null,
            'languages'                     => $data['languages']                    ?? [],
            'session_types'                 => $data['session_types']                ?? ['online'],
            'hourly_rate'                   => $data['hourly_rate']                  ?? null,
            'currency'                      => $data['currency']                     ?? 'EUR',
            'is_verified'                   => $data['is_verified']                  ?? false,
            'is_featured'                   => $data['is_featured']                  ?? false,
            'profile_completion_percentage' => $data['profile_completion_percentage'] ?? 0,
            'city_id'                       => $data['city_id']                      ?? null,
            'banner_url'                    => $data['banner_url']                   ?? null,
            'instagram_url'                 => $data['instagram_url']                ?? null,
            'linkedin_url'                  => $data['linkedin_url']                 ?? null,
            'intro_video_url'               => $data['intro_video_url']              ?? null,
            'website_url'                   => $data['website_url']                  ?? null,
            'offers_free_discovery'         => $data['offers_free_discovery']        ?? true,
        ];

        // --- 2. Update cs_users (core fields + profile_data) ----------------
        $userUpdate = [
            'full_name'            => $data['full_name'],
            'avatar_url'           => $data['avatar_url']       ?? null,
            'user_type'            => 'coach',
            'onboarding_completed' => $data['onboarding_completed'] ?? true,
            'updated_at'           => date('c'),
            'profile_data'         => $profileData,
        ];
        if (!empty($data['slug'])) {
            $userUpdate['slug'] = $data['slug'];
        }

        $userResp = $this->db->request('PATCH', '/cs_users?id=eq.' . $userId, $userUpdate, $token);

        // --- 3. Upsert cs_coaches (operational fields only) -----------------
        $coachOp = [
            'user_id'              => $userId,
            'onboarding_completed' => $data['onboarding_completed'] ?? true,
            'updated_at'           => date('c'),
        ];

        $this->db->request(
            'POST',
            '/cs_coaches',
            $coachOp,
            $token,
            ['Prefer: resolution=merge-duplicates']
        );

        if ($userResp['status'] < 200 || $userResp['status'] >= 300) {
            http_response_code($userResp['status']);
            echo json_encode($userResp['body']);
            return;
        }

        echo json_encode([
            'message' => 'Coach profile saved successfully',
            'data'    => array_merge(['id' => $userId], $userUpdate),
        ]);
    }

    public function update($userId) {
        $this->create($userId);
    }

    // -------------------------------------------------------------------------
    // Availability — operate on cs_coach_availability (unchanged table)
    // -------------------------------------------------------------------------
    public function getAvailability($coachId) {
        try {
            $response = $this->db->request(
                'GET',
                '/cs_coach_availability?select=*&coach_id=eq.' . $coachId . '&order=day_of_week.asc,start_time.asc'
            );
            if ($response['status'] >= 200 && $response['status'] < 300) {
                echo json_encode(['data' => $response['body']]);
            } else {
                http_response_code($response['status']);
                echo json_encode($response['body']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function setAvailability($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['slots']) || !is_array($data['slots'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Slots array is required']);
            return;
        }

        $headers = getallheaders();
        $token   = str_replace('Bearer ', '', $headers['Authorization'] ?? '');

        try {
            $this->db->request('DELETE', '/cs_coach_availability?coach_id=eq.' . $userId, null, $token);

            $slots = array_map(fn($s) => [
                'coach_id'    => $userId,
                'day_of_week' => $s['day_of_week'],
                'start_time'  => $s['start_time'],
                'end_time'    => $s['end_time'],
                'is_active'   => $s['is_active'] ?? true,
            ], $data['slots']);

            if (!empty($slots)) {
                $resp = $this->db->request('POST', '/cs_coach_availability', $slots, $token);
                if ($resp['status'] >= 200 && $resp['status'] < 300) {
                    echo json_encode(['message' => 'Availability updated', 'data' => $slots]);
                    return;
                }
                http_response_code($resp['status']);
                echo json_encode($resp['body']);
            } else {
                echo json_encode(['message' => 'Availability cleared', 'data' => []]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function getAvailabilityOverrides($coachId) {
        try {
            $query = 'select=*&coach_id=eq.' . $coachId;
            if (isset($_GET['start_date'])) $query .= '&date=gte.' . $_GET['start_date'];
            if (isset($_GET['end_date']))   $query .= '&date=lte.' . $_GET['end_date'];
            $query .= '&order=date.asc,start_time.asc';

            $response = $this->db->request('GET', '/cs_coach_availability_overrides?' . $query);
            if ($response['status'] >= 200 && $response['status'] < 300) {
                echo json_encode(['data' => $response['body']]);
            } else {
                http_response_code($response['status']);
                echo json_encode($response['body']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function createAvailabilityOverride($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['date'], $data['is_available'])) {
            http_response_code(400);
            echo json_encode(['error' => 'date and is_available are required']);
            return;
        }

        $override = [
            'coach_id'     => $userId,
            'date'         => $data['date'],
            'is_available' => $data['is_available'],
            'start_time'   => $data['start_time'] ?? null,
            'end_time'     => $data['end_time']   ?? null,
            'reason'       => $data['reason']     ?? null,
        ];

        $headers = getallheaders();
        $token   = str_replace('Bearer ', '', $headers['Authorization'] ?? '');

        try {
            $resp = $this->db->request(
                'POST',
                '/cs_coach_availability_overrides',
                $override,
                $token,
                ['Prefer: resolution=merge-duplicates']
            );
            if ($resp['status'] >= 200 && $resp['status'] < 300) {
                echo json_encode(['message' => 'Availability override created', 'data' => $override]);
            } else {
                http_response_code($resp['status']);
                echo json_encode($resp['body']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function getAvailableSlots($coachId) {
        if (!isset($_GET['date'])) {
            http_response_code(400);
            echo json_encode(['error' => 'date parameter is required']);
            return;
        }

        $date     = $_GET['date'];
        $duration = isset($_GET['duration']) ? (int)$_GET['duration'] : 60;

        try {
            $dayOfWeek = date('w', strtotime($date));

            $weeklySlots = ($this->db->request(
                'GET',
                '/cs_coach_availability?select=*&coach_id=eq.' . $coachId
                . '&day_of_week=eq.' . $dayOfWeek . '&is_active=eq.true'
            ))['body'] ?? [];

            $overrides = ($this->db->request(
                'GET',
                '/cs_coach_availability_overrides?select=*&coach_id=eq.' . $coachId . '&date=eq.' . $date
            ))['body'] ?? [];

            $existingBookings = ($this->db->request(
                'GET',
                '/cs_bookings?select=start_time,end_time&coach_id=eq.' . $coachId
                . '&start_time=gte.' . $date . 'T00:00:00&start_time=lt.' . $date . 'T23:59:59'
                . '&status=in.(pending,confirmed)'
            ))['body'] ?? [];

            foreach ($overrides as $o) {
                if (!$o['is_available']) {
                    echo json_encode(['data' => [], 'message' => 'Coach is unavailable on this date']);
                    return;
                }
            }

            $slotsToProcess = !empty($overrides) ? $overrides : $weeklySlots;
            $availableSlots = [];

            foreach ($slotsToProcess as $slot) {
                if (empty($slot['start_time']) || empty($slot['end_time'])) continue;

                $cur = strtotime($date . ' ' . $slot['start_time']);
                $end = strtotime($date . ' ' . $slot['end_time']);

                while ($cur + $duration * 60 <= $end) {
                    $slotStartISO = $date . 'T' . date('H:i:s', $cur);
                    $slotEndISO   = $date . 'T' . date('H:i:s', $cur + $duration * 60);

                    $booked = false;
                    foreach ($existingBookings as $b) {
                        $bs = strtotime($b['start_time']);
                        $be = strtotime($b['end_time']);
                        if (strtotime($slotStartISO) < $be && strtotime($slotEndISO) > $bs) {
                            $booked = true;
                            break;
                        }
                    }

                    if (!$booked) {
                        $availableSlots[] = [
                            'start_time'       => $slotStartISO,
                            'end_time'         => $slotEndISO,
                            'duration_minutes' => $duration,
                        ];
                    }

                    $cur += $duration * 60;
                }
            }

            echo json_encode(['data' => $availableSlots]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
