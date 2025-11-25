<?php
// api/controllers/CoachController.php

class CoachController {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
    }

    public function index() {
        // Search and Filter
        // Join with auth.users to get metadata
        $query = "SELECT c.*, 
                         u.raw_user_meta_data->>'full_name' as full_name, 
                         u.raw_user_meta_data->>'avatar_url' as avatar_url 
                  FROM cs_coaches c 
                  JOIN auth.users u ON c.id = u.id 
                  WHERE 1=1";
        $params = [];

        if (isset($_GET['search'])) {
            $query .= " AND (u.raw_user_meta_data->>'full_name' ILIKE :search OR c.title ILIKE :search OR c.bio ILIKE :search)";
            $params[':search'] = '%' . $_GET['search'] . '%';
        }

        if (isset($_GET['language'])) {
            $query .= " AND :language = ANY(c.languages)";
            $params[':language'] = $_GET['language'];
        }

        // Pagination
        $limit = 20;
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $offset = ($page - 1) * $limit;
        
        $query .= " LIMIT :limit OFFSET :offset";
        
        // Prepare and Execute
        $stmt = $this->conn->prepare($query);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        $coaches = $stmt->fetchAll();

        if (empty($coaches)) {
            echo json_encode([
                "data" => [],
                "disclaimer" => "No data found; database may be empty or filters too strict."
            ]);
        } else {
            // Add disclaimer for scraped data if applicable (mock logic here)
            foreach ($coaches as &$coach) {
                if (isset($coach['is_scraped']) && $coach['is_scraped']) {
                    $coach['disclaimer'] = "DISCLAIMER: Scraped on " . $coach['scraped_at'];
                }
            }
            echo json_encode(["data" => $coaches]);
        }
    }

    public function get($id) {
        $query = "SELECT c.*, 
                         u.raw_user_meta_data->>'full_name' as full_name, 
                         u.raw_user_meta_data->>'avatar_url' as avatar_url 
                  FROM cs_coaches c 
                  JOIN auth.users u ON c.id = u.id 
                  WHERE c.id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':id', $id);
        $stmt->execute();
        $coach = $stmt->fetch();

        if ($coach) {
            echo json_encode(["data" => $coach]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Coach not found"]);
        }
    }

    public function update($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        
        // Basic validation
        if (!isset($data['title'])) {
            http_response_code(400);
            echo json_encode(["error" => "Title is required"]);
            return;
        }

        // Update Coach Profile
        $query = "INSERT INTO cs_coaches (id, title, bio, hourly_rate, languages, specialties) 
                  VALUES (:id, :title, :bio, :hourly_rate, :languages, :specialties)
                  ON CONFLICT (id) DO UPDATE SET
                  title = EXCLUDED.title,
                  bio = EXCLUDED.bio,
                  hourly_rate = EXCLUDED.hourly_rate,
                  languages = EXCLUDED.languages,
                  specialties = EXCLUDED.specialties";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':id', $userId);
        $stmt->bindValue(':title', $data['title']);
        $stmt->bindValue(':bio', $data['bio'] ?? '');
        $stmt->bindValue(':hourly_rate', $data['hourly_rate'] ?? 0);
        $stmt->bindValue(':languages', '{' . implode(',', $data['languages'] ?? []) . '}'); // Simple array to postgres array
        $stmt->bindValue(':specialties', '{' . implode(',', $data['specialties'] ?? []) . '}');

        if ($stmt->execute()) {
            echo json_encode(["message" => "Profile updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update profile"]);
        }
    }
}
