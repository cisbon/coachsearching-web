<?php
// api/controllers/CoachController.php

class CoachController {
    private $db;

    public function __construct() {
        $this->db = new Database();
    }

    public function index() {
        // Build Query String
        // Select coaches and join with user profiles view
        $query = "select=*,cs_user_profiles(full_name,avatar_url)";
        
        if (isset($_GET['search'])) {
            $search = $_GET['search'];
            // PostgREST filtering is tricky with OR across tables.
            // Simplified: Filter by coach fields OR user name
            // Syntax: or=(title.ilike.*term*,bio.ilike.*term*,cs_user_profiles.full_name.ilike.*term*)
            // Note: Nested filtering on embedded resource requires !inner join if we want to filter parent by child.
            // But here we want OR. PostgREST doesn't easily support OR across parent/child.
            // We will filter by coach fields here for simplicity, or use a specific RPC if needed.
            // Let's try to filter just coach fields for now to ensure stability, or use a separate search endpoint.
            // Actually, we can use the 'or' operator on the top level fields.
            $query .= "&or=(title.ilike.*$search*,bio.ilike.*$search*)";
        }

        if (isset($_GET['language'])) {
            $lang = $_GET['language'];
            $query .= "&languages=cs.{{$lang}}"; // Contains operator for array
        }

        // Pagination
        $limit = 20;
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $offset = ($page - 1) * $limit;
        
        $query .= "&limit=$limit&offset=$offset";
        
        try {
            $response = $this->db->request('GET', '/cs_coaches?' . $query);
            
            if ($response['status'] >= 200 && $response['status'] < 300) {
                $coaches = $response['body'];
                
                // Flatten the structure for frontend compatibility
                // cs_user_profiles comes as an object or array inside
                foreach ($coaches as &$coach) {
                    if (isset($coach['cs_user_profiles'])) {
                        $coach['full_name'] = $coach['cs_user_profiles']['full_name'] ?? '';
                        $coach['avatar_url'] = $coach['cs_user_profiles']['avatar_url'] ?? '';
                        unset($coach['cs_user_profiles']);
                    }
                }

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
            $query = "select=*,cs_user_profiles(full_name,avatar_url)&id=eq.$id";
            $response = $this->db->request('GET', '/cs_coaches?' . $query);

            if ($response['status'] >= 200 && $response['status'] < 300 && !empty($response['body'])) {
                $coach = $response['body'][0];
                if (isset($coach['cs_user_profiles'])) {
                    $coach['full_name'] = $coach['cs_user_profiles']['full_name'] ?? '';
                    $coach['avatar_url'] = $coach['cs_user_profiles']['avatar_url'] ?? '';
                    unset($coach['cs_user_profiles']);
                }
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

    public function update($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['title'])) {
            http_response_code(400);
            echo json_encode(["error" => "Title is required"]);
            return;
        }

        $updateData = [
            'id' => $userId,
            'title' => $data['title'],
            'bio' => $data['bio'] ?? '',
            'hourly_rate' => $data['hourly_rate'] ?? 0,
            'languages' => $data['languages'] ?? [],
            'specialties' => $data['specialties'] ?? []
        ];

        // UPSERT
        try {
            // We need to pass the user's token to respect RLS "update own profile"
            // But we don't have the token here, only the UID extracted from it.
            // Wait, getAuthUid() extracts UID but we need the raw token for Supabase request.
            // We need to modify getAuthUid or pass the raw header.
            
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? '';
            $token = str_replace('Bearer ', '', $authHeader);

            $response = $this->db->request('POST', '/cs_coaches', $updateData, $token, ['Prefer: resolution=merge-duplicates']);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                echo json_encode(["message" => "Profile updated successfully"]);
            } else {
                http_response_code($response['status']);
                echo json_encode($response['body']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }
}
