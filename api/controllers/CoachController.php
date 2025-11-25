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
}

