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

    public function get($bookingId, $userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        $token = str_replace('Bearer ', '', $authHeader);

        try {
            $query = "select=*&id=eq.$bookingId";
            $response = $this->db->request('GET', '/cs_bookings?' . $query, [], $token);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                if (!empty($response['body'])) {
                    echo json_encode(["data" => $response['body'][0]]);
                } else {
                    http_response_code(404);
                    echo json_encode(["error" => "Booking not found"]);
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

    /**
     * Create a new booking
     * POST /bookings
     * Body: {
     *   coach_id, start_time, duration_minutes, meeting_type,
     *   amount, currency, meeting_location (optional), client_notes (optional),
     *   stripe_payment_intent_id
     * }
     */
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

        // Validate required fields
        if (!isset($data['coach_id']) || !isset($data['start_time']) || !isset($data['duration_minutes'])) {
            http_response_code(400);
            echo json_encode(["error" => "coach_id, start_time, and duration_minutes are required"]);
            return;
        }

        // Calculate end_time
        $startTime = new DateTime($data['start_time']);
        $duration = $data['duration_minutes'];
        $endTime = clone $startTime;
        $endTime->add(new DateInterval('PT' . $duration . 'M'));

        // Calculate platform fee (10%) and coach payout (90%)
        $amount = $data['amount'] ?? 0;
        $platformFee = round($amount * 0.10, 2);
        $coachPayout = round($amount * 0.90, 2);

        $insertData = [
            'coach_id' => $data['coach_id'],
            'client_id' => $userId,
            'package_id' => $data['package_id'] ?? null,
            'start_time' => $startTime->format('c'),
            'end_time' => $endTime->format('c'),
            'duration_minutes' => $duration,
            'status' => $data['stripe_payment_intent_id'] ? 'pending' : 'pending', // Will be confirmed after payment
            'type' => $data['type'] ?? 'paid',
            'meeting_type' => $data['meeting_type'] ?? 'online',
            'meeting_link' => $data['meeting_link'] ?? null,
            'meeting_location' => $data['meeting_location'] ?? null,
            'amount' => $amount,
            'currency' => $data['currency'] ?? 'EUR',
            'platform_fee' => $platformFee,
            'coach_payout' => $coachPayout,
            'stripe_payment_intent_id' => $data['stripe_payment_intent_id'] ?? null,
            'client_notes' => $data['client_notes'] ?? null
        ];

        try {
            $response = $this->db->request('POST', '/cs_bookings', $insertData, $token, ['Prefer: return=representation']);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                $booking = $response['body'][0] ?? $insertData;
                echo json_encode([
                    "message" => "Booking created successfully",
                    "data" => $booking
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
     * Update a booking (reschedule)
     * PUT /bookings/{id}
     * Body: { start_time, duration_minutes }
     */
    public function update($bookingId, $userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        $token = str_replace('Bearer ', '', $authHeader);

        $data = json_decode(file_get_contents("php://input"), true);

        $updateData = [];

        if (isset($data['start_time']) && isset($data['duration_minutes'])) {
            $startTime = new DateTime($data['start_time']);
            $duration = $data['duration_minutes'];
            $endTime = clone $startTime;
            $endTime->add(new DateInterval('PT' . $duration . 'M'));

            $updateData['start_time'] = $startTime->format('c');
            $updateData['end_time'] = $endTime->format('c');
            $updateData['duration_minutes'] = $duration;
        }

        if (isset($data['meeting_link'])) {
            $updateData['meeting_link'] = $data['meeting_link'];
        }

        if (isset($data['coach_notes'])) {
            $updateData['coach_notes'] = $data['coach_notes'];
        }

        if (isset($data['status'])) {
            $updateData['status'] = $data['status'];
        }

        $updateData['updated_at'] = date('c');

        try {
            $query = "id=eq.$bookingId";
            $response = $this->db->request('PATCH', '/cs_bookings?' . $query, $updateData, $token);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                echo json_encode(["message" => "Booking updated successfully"]);
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
     * Cancel a booking
     * POST /bookings/{id}/cancel
     * Body: { cancellation_reason }
     */
    public function cancel($bookingId, $userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        $token = str_replace('Bearer ', '', $authHeader);

        $data = json_decode(file_get_contents("php://input"), true);

        $updateData = [
            'status' => 'cancelled',
            'cancelled_at' => date('c'),
            'cancelled_by' => $userId,
            'cancellation_reason' => $data['cancellation_reason'] ?? 'No reason provided',
            'updated_at' => date('c')
        ];

        try {
            $query = "id=eq.$bookingId";
            $response = $this->db->request('PATCH', '/cs_bookings?' . $query, $updateData, $token);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                echo json_encode(["message" => "Booking cancelled successfully"]);

                // TODO: Trigger refund process if applicable
                // TODO: Send cancellation notification emails
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
     * Mark booking as completed
     * POST /bookings/{id}/complete
     */
    public function complete($bookingId, $userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        $token = str_replace('Bearer ', '', $authHeader);

        $updateData = [
            'status' => 'completed',
            'completed_at' => date('c'),
            'updated_at' => date('c')
        ];

        try {
            $query = "id=eq.$bookingId";
            $response = $this->db->request('PATCH', '/cs_bookings?' . $query, $updateData, $token);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                echo json_encode(["message" => "Booking marked as completed"]);

                // TODO: Trigger review request notification
                // TODO: Process coach payout
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
