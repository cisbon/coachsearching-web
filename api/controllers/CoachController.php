<?php
// api/controllers/CoachController.php

class CoachController {
    private $db;

    public function __construct() {
        $this->db = new Database();
    }

    public function index() {
        // Build Query String - cs_coaches now has full_name and avatar_url directly
        $query = "select=*";

        if (isset($_GET['search'])) {
            $search = $_GET['search'];
            $query .= "&or=(title.ilike.*$search*,bio.ilike.*$search*,full_name.ilike.*$search*)";
        }

        if (isset($_GET['language'])) {
            $lang = $_GET['language'];
            $query .= "&languages=cs.{{$lang}}"; // Contains operator for array
        }

        // Filter by session type
        if (isset($_GET['session_type'])) {
            $sessionType = $_GET['session_type'];
            $query .= "&session_types=cs.{{$sessionType}}";
        }

        // Only show completed profiles
        $query .= "&onboarding_completed=eq.true";

        // Order by rating
        $query .= "&order=rating_average.desc.nullslast,rating_count.desc";

        // Pagination
        $limit = 20;
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $offset = ($page - 1) * $limit;

        $query .= "&limit=$limit&offset=$offset";

        try {
            $response = $this->db->request('GET', '/cs_coaches?' . $query);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                $coaches = $response['body'];

                if (empty($coaches)) {
                    echo json_encode([
                        "data" => [],
                        "disclaimer" => "No data found; database may be empty or filters too strict."
                    ]);
                } else {
                    echo json_encode(["data" => $coaches]);
                }
            } else {
                http_response_code($response['status']);
                echo json_encode($response['body']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }

    public function get($id) {
        try {
            $query = "select=*&id=eq.$id";
            $response = $this->db->request('GET', '/cs_coaches?' . $query);

            if ($response['status'] >= 200 && $response['status'] < 300 && !empty($response['body'])) {
                $coach = $response['body'][0];
                echo json_encode(["data" => $coach]);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Coach not found"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }

    public function create($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        // Validate required fields
        if (!isset($data['full_name']) || !isset($data['title'])) {
            http_response_code(400);
            echo json_encode(["error" => "Full name and title are required"]);
            return;
        }

        // Build coach profile data
        $profileData = [
            'id' => $userId,
            'full_name' => $data['full_name'],
            'avatar_url' => $data['avatar_url'] ?? null,
            'title' => $data['title'],
            'bio' => $data['bio'] ?? '',
            'location' => $data['location'] ?? null,
            'hourly_rate' => $data['hourly_rate'] ?? 0,
            'currency' => $data['currency'] ?? 'EUR',
            'languages' => $data['languages'] ?? [],
            'specialties' => $data['specialties'] ?? [],
            'session_types' => $data['session_types'] ?? ['online'],
            'onboarding_completed' => $data['onboarding_completed'] ?? true,
            'updated_at' => date('c')
        ];

        try {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);

            // UPSERT using Prefer: resolution=merge-duplicates
            $response = $this->db->request('POST', '/cs_coaches', $profileData, $token, ['Prefer: resolution=merge-duplicates']);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                echo json_encode([
                    "message" => "Coach profile created successfully",
                    "data" => $profileData
                ]);
            } else {
                http_response_code($response['status']);
                echo json_encode($response['body']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }

    public function update($userId) {
        // Reuse create method for upsert functionality
        $this->create($userId);
    }

    /**
     * Get coach's weekly availability schedule
     * GET /coaches/{id}/availability
     */
    public function getAvailability($coachId) {
        try {
            $query = "select=*&coach_id=eq.$coachId&order=day_of_week.asc,start_time.asc";
            $response = $this->db->request('GET', '/cs_coach_availability?' . $query);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                echo json_encode(["data" => $response['body']]);
            } else {
                http_response_code($response['status']);
                echo json_encode($response['body']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }

    /**
     * Set or update coach's weekly availability
     * POST /coaches/me/availability
     * Body: [{ day_of_week: 1, start_time: "09:00", end_time: "17:00" }, ...]
     */
    public function setAvailability($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['slots']) || !is_array($data['slots'])) {
            http_response_code(400);
            echo json_encode(["error" => "Slots array is required"]);
            return;
        }

        try {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);

            // First, delete all existing availability for this coach
            $deleteQuery = "coach_id=eq.$userId";
            $this->db->request('DELETE', '/cs_coach_availability?' . $deleteQuery, null, $token);

            // Then insert new availability slots
            $slotsToInsert = [];
            foreach ($data['slots'] as $slot) {
                $slotsToInsert[] = [
                    'coach_id' => $userId,
                    'day_of_week' => $slot['day_of_week'],
                    'start_time' => $slot['start_time'],
                    'end_time' => $slot['end_time'],
                    'is_active' => $slot['is_active'] ?? true
                ];
            }

            if (!empty($slotsToInsert)) {
                $response = $this->db->request('POST', '/cs_coach_availability', $slotsToInsert, $token);

                if ($response['status'] >= 200 && $response['status'] < 300) {
                    echo json_encode([
                        "message" => "Availability updated successfully",
                        "data" => $slotsToInsert
                    ]);
                } else {
                    http_response_code($response['status']);
                    echo json_encode($response['body']);
                }
            } else {
                echo json_encode([
                    "message" => "Availability cleared",
                    "data" => []
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }

    /**
     * Get coach's availability overrides (specific dates)
     * GET /coaches/{id}/availability/overrides?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
     */
    public function getAvailabilityOverrides($coachId) {
        try {
            $query = "select=*&coach_id=eq.$coachId";

            if (isset($_GET['start_date'])) {
                $query .= "&date=gte." . $_GET['start_date'];
            }

            if (isset($_GET['end_date'])) {
                $query .= "&date=lte." . $_GET['end_date'];
            }

            $query .= "&order=date.asc,start_time.asc";

            $response = $this->db->request('GET', '/cs_coach_availability_overrides?' . $query);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                echo json_encode(["data" => $response['body']]);
            } else {
                http_response_code($response['status']);
                echo json_encode($response['body']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }

    /**
     * Create availability override for specific date
     * POST /coaches/me/availability/override
     * Body: { date: "YYYY-MM-DD", is_available: true/false, start_time: "HH:MM", end_time: "HH:MM", reason: "..." }
     */
    public function createAvailabilityOverride($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['date']) || !isset($data['is_available'])) {
            http_response_code(400);
            echo json_encode(["error" => "Date and is_available are required"]);
            return;
        }

        $overrideData = [
            'coach_id' => $userId,
            'date' => $data['date'],
            'is_available' => $data['is_available'],
            'start_time' => $data['start_time'] ?? null,
            'end_time' => $data['end_time'] ?? null,
            'reason' => $data['reason'] ?? null
        ];

        try {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);

            $response = $this->db->request('POST', '/cs_coach_availability_overrides', $overrideData, $token, ['Prefer: resolution=merge-duplicates']);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                echo json_encode([
                    "message" => "Availability override created successfully",
                    "data" => $overrideData
                ]);
            } else {
                http_response_code($response['status']);
                echo json_encode($response['body']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }

    /**
     * Get available time slots for a specific date
     * GET /coaches/{id}/available-slots?date=YYYY-MM-DD&duration=60
     * Returns array of available time slots considering weekly schedule, overrides, and existing bookings
     */
    public function getAvailableSlots($coachId) {
        if (!isset($_GET['date'])) {
            http_response_code(400);
            echo json_encode(["error" => "Date parameter is required"]);
            return;
        }

        $date = $_GET['date'];
        $duration = isset($_GET['duration']) ? (int)$_GET['duration'] : 60; // Default 60 minutes

        try {
            // Get day of week (0 = Sunday, 6 = Saturday)
            $dayOfWeek = date('w', strtotime($date));

            // Get weekly availability for this day
            $availQuery = "select=*&coach_id=eq.$coachId&day_of_week=eq.$dayOfWeek&is_active=eq.true";
            $availResponse = $this->db->request('GET', '/cs_coach_availability?' . $availQuery);

            if ($availResponse['status'] !== 200) {
                echo json_encode(["data" => [], "message" => "No availability set for this day"]);
                return;
            }

            $weeklySlots = $availResponse['body'];

            // Get overrides for this specific date
            $overrideQuery = "select=*&coach_id=eq.$coachId&date=eq.$date";
            $overrideResponse = $this->db->request('GET', '/cs_coach_availability_overrides?' . $overrideQuery);
            $overrides = $overrideResponse['status'] === 200 ? $overrideResponse['body'] : [];

            // Get existing bookings for this date
            $bookingsQuery = "select=start_time,end_time&coach_id=eq.$coachId&start_time=gte.$date" . "T00:00:00&start_time=lt.$date" . "T23:59:59&status=in.(pending,confirmed)";
            $bookingsResponse = $this->db->request('GET', '/cs_bookings?' . $bookingsQuery);
            $existingBookings = $bookingsResponse['status'] === 200 ? $bookingsResponse['body'] : [];

            // Build available slots
            $availableSlots = [];

            // If there are blocking overrides, return empty
            $hasBlockingOverride = false;
            foreach ($overrides as $override) {
                if (!$override['is_available']) {
                    $hasBlockingOverride = true;
                    break;
                }
            }

            if ($hasBlockingOverride) {
                echo json_encode(["data" => [], "message" => "Coach is unavailable on this date"]);
                return;
            }

            // Process available overrides or weekly slots
            $slotsToProcess = !empty($overrides) ? $overrides : $weeklySlots;

            foreach ($slotsToProcess as $slot) {
                $startTime = isset($slot['start_time']) ? $slot['start_time'] : '';
                $endTime = isset($slot['end_time']) ? $slot['end_time'] : '';

                if (empty($startTime) || empty($endTime)) continue;

                // Generate time slots
                $currentTime = strtotime($date . ' ' . $startTime);
                $endTimeStamp = strtotime($date . ' ' . $endTime);

                while ($currentTime + ($duration * 60) <= $endTimeStamp) {
                    $slotStart = date('H:i:s', $currentTime);
                    $slotEnd = date('H:i:s', $currentTime + ($duration * 60));
                    $slotStartISO = $date . 'T' . $slotStart;
                    $slotEndISO = $date . 'T' . $slotEnd;

                    // Check if this slot conflicts with existing bookings
                    $isBooked = false;
                    foreach ($existingBookings as $booking) {
                        $bookingStart = strtotime($booking['start_time']);
                        $bookingEnd = strtotime($booking['end_time']);
                        $checkStart = strtotime($slotStartISO);
                        $checkEnd = strtotime($slotEndISO);

                        if ($checkStart < $bookingEnd && $checkEnd > $bookingStart) {
                            $isBooked = true;
                            break;
                        }
                    }

                    if (!$isBooked) {
                        $availableSlots[] = [
                            'start_time' => $slotStartISO,
                            'end_time' => $slotEndISO,
                            'duration_minutes' => $duration
                        ];
                    }

                    $currentTime += ($duration * 60);
                }
            }

            echo json_encode(["data" => $availableSlots]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }
}

