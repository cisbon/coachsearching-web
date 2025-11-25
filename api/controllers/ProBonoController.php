<?php
// api/controllers/ProBonoController.php

class ProBonoController {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
    }

    public function index() {
        // Get available slots
        $query = "SELECT s.*, 
                         u.raw_user_meta_data->>'full_name' as coach_name, 
                         u.raw_user_meta_data->>'avatar_url' as avatar_url 
                  FROM cs_pro_bono_slots s 
                  JOIN cs_coaches c ON s.coach_id = c.id 
                  JOIN auth.users u ON c.id = u.id 
                  WHERE s.is_booked = false AND s.start_time > NOW() 
                  ORDER BY s.start_time ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $slots = $stmt->fetchAll();

        if (empty($slots)) {
            echo json_encode([
                "data" => [],
                "disclaimer" => "No data found; database may be empty or filters too strict."
            ]);
        } else {
            echo json_encode(["data" => $slots]);
        }
    }

    public function create($userId) {
        // Coach creates a slot
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        $query = "INSERT INTO cs_pro_bono_slots (coach_id, start_time, end_time) VALUES (:coach_id, :start_time, :end_time)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':coach_id', $userId);
        $stmt->bindValue(':start_time', $data['start_time']);
        $stmt->bindValue(':end_time', $data['end_time']);

        if ($stmt->execute()) {
            echo json_encode(["message" => "Slot created"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to create slot"]);
        }
    }
}
