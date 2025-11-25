<?php
// api/controllers/AdminController.php

class AdminController {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
    }

    public function getFeatures() {
        $query = "SELECT * FROM cs_feature_flags";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $features = $stmt->fetchAll(PDO::FETCH_KEY_PAIR); // Returns [name => enabled]

        echo json_encode(["data" => $features]);
    }
}
