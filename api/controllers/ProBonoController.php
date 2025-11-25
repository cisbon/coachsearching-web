<?php
// api/controllers/ProBonoController.php

class ProBonoController {
    private $db;

    public function __construct() {
        $this->db = new Database();
    }

    public function index() {
        try {
            // Join cs_coaches -> cs_user_profiles
            $query = "select=*,cs_coaches(cs_user_profiles(full_name,avatar_url))&is_booked=eq.false&start_time=gt.now&order=start_time.asc";
            
            $response = $this->db->request('GET', '/cs_pro_bono_slots?' . $query);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                $slots = $response['body'];
                
                // Flatten
                foreach ($slots as &$slot) {
                    if (isset($slot['cs_coaches']['cs_user_profiles'])) {
                        $profile = $slot['cs_coaches']['cs_user_profiles'];
                        $slot['coach_name'] = $profile['full_name'] ?? '';
                        $slot['avatar_url'] = $profile['avatar_url'] ?? '';
                        unset($slot['cs_coaches']);
                    }
                }

                if (empty($slots)) {
                    echo json_encode([
                        "data" => [],
                        "disclaimer" => "No data found; database may be empty or filters too strict."
                    ]);
                } else {
                    echo json_encode(["data" => $slots]);
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

    public function create($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        $token = str_replace('Bearer ', '', $authHeader);

        $data = json_decode(file_get_contents("php://input"), true);
        
        $insertData = [
            'coach_id' => $userId,
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time']
        ];

        try {
            $response = $this->db->request('POST', '/cs_pro_bono_slots', $insertData, $token);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                echo json_encode(["message" => "Slot created"]);
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
