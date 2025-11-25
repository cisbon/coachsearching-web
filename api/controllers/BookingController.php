<?php
// api/controllers/BookingController.php

class BookingController {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
    }

    public function index($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        // Get bookings where user is client OR coach
        $query = "SELECT * FROM cs_bookings WHERE client_id = :uid OR coach_id = :uid ORDER BY start_time DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':uid', $userId);
        $stmt->execute();
        $bookings = $stmt->fetchAll();

        if (empty($bookings)) {
            echo json_encode([
                "data" => [],
                "disclaimer" => "No data found; database may be empty or filters too strict."
            ]);
        } else {
            echo json_encode(["data" => $bookings]);
        }
    }

    public function create($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        // Validate inputs
        if (!isset($data['coach_id']) || !isset($data['start_time'])) {
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields"]);
            return;
        }

        // Insert Booking
        $query = "INSERT INTO cs_bookings (coach_id, client_id, start_time, end_time, amount, status) 
                  VALUES (:coach_id, :client_id, :start_time, :end_time, :amount, 'pending') RETURNING id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':coach_id', $data['coach_id']);
        $stmt->bindValue(':client_id', $userId);
        $stmt->bindValue(':start_time', $data['start_time']);
        $stmt->bindValue(':end_time', $data['end_time']); // Should be calculated or passed
        $stmt->bindValue(':amount', $data['amount']);

        if ($stmt->execute()) {
            $bookingId = $stmt->fetchColumn();
            echo json_encode(["message" => "Booking created", "id" => $bookingId]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to create booking"]);
        }
    }
}
