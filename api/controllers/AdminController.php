<?php
// api/controllers/AdminController.php

class AdminController {
    private $db;

    public function __construct() {
        $this->db = new Database();
    }

    public function getFeatures() {
        try {
            $response = $this->db->request('GET', '/cs_feature_flags');

            if ($response['status'] >= 200 && $response['status'] < 300) {
                $features = [];
                foreach ($response['body'] as $flag) {
                    $features[$flag['name']] = $flag['enabled'];
                }
                echo json_encode(["data" => $features]);
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
