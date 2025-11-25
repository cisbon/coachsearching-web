<?php
// api/controllers/BookingController.php

class BookingController {
    private $db;

    public function __construct() {
        $this->db = new Database();
    }

    public function index($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        // Get raw token
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        $token = str_replace('Bearer ', '', $authHeader);

        // Get bookings where user is client OR coach
        // RLS handles the "OR" logic (View own bookings), so we just select *
        // But we might want to filter? No, RLS does it.
        // We just need to send the token.
        
        try {
            $query = "select=*&order=start_time.desc";
            $response = $this->db->request('GET', '/cs_bookings?' . $query, [], $token);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                $bookings = $response['body'];
                if (empty($bookings)) {
                    echo json_encode([
                        "data" => [],
                        "disclaimer" => "No data found; database may be empty or filters too strict."
                    ]);
                } else {
                    echo json_encode(["data" => $bookings]);
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

        if (!isset($data['coach_id']) || !isset($data['start_time'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields"]);
            return;
        }

        $insertData = [
            'coach_id' => $data['coach_id'],
            'client_id' => $userId,
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
            'amount' => $data['amount'],
            'status' => 'pending'
        ];

        try {
            $response = $this->db->request('POST', '/cs_bookings', $insertData, $token);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                $booking = $response['body'][0] ?? null;
                echo json_encode(["message" => "Booking created", "id" => $booking['id'] ?? null]);
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
