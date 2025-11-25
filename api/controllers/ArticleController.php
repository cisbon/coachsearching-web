<?php
// api/controllers/ArticleController.php

class ArticleController {
    private $db;

    public function __construct() {
        $this->db = new Database();
    }

    public function index() {
        try {
            // Join cs_coaches -> cs_user_profiles
            // Syntax: select=*,cs_coaches(cs_user_profiles(full_name))
            $query = "select=*,cs_coaches(cs_user_profiles(full_name))&published=eq.true&order=created_at.desc";
            
            $response = $this->db->request('GET', '/cs_articles?' . $query);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                $articles = $response['body'];
                
                // Flatten
                foreach ($articles as &$article) {
                    if (isset($article['cs_coaches']['cs_user_profiles'])) {
                        $article['author_name'] = $article['cs_coaches']['cs_user_profiles']['full_name'] ?? 'Unknown';
                        unset($article['cs_coaches']);
                    }
                }

                if (empty($articles)) {
                    echo json_encode([
                        "data" => [],
                        "disclaimer" => "No data found; database may be empty or filters too strict."
                    ]);
                } else {
                    echo json_encode(["data" => $articles]);
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
            $query = "select=*";
            if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $id)) {
                 $query .= "&id=eq.$id";
            } else {
                 $query .= "&slug=eq.$id";
            }
           
            $response = $this->db->request('GET', '/cs_articles?' . $query);

            if ($response['status'] >= 200 && $response['status'] < 300 && !empty($response['body'])) {
                echo json_encode(["data" => $response['body'][0]]);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Article not found"]);
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

        if (!isset($data['title']) || !isset($data['content'])) {
            http_response_code(400);
            echo json_encode(["error" => "Title and Content are required"]);
            return;
        }

        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $data['title'])));

        $insertData = [
            'coach_id' => $userId,
            'title' => $data['title'],
            'slug' => $slug,
            'content' => $data['content'],
            'summary' => substr(strip_tags($data['content']), 0, 150),
            'published' => $data['published'] ?? false
        ];

        try {
            $response = $this->db->request('POST', '/cs_articles', $insertData, $token);

            if ($response['status'] >= 200 && $response['status'] < 300) {
                $article = $response['body'][0] ?? null;
                echo json_encode(["message" => "Article created", "id" => $article['id'] ?? null, "slug" => $slug]);
            } else {
                http_response_code($response['status']);
                echo json_encode($response['body']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to create article. Slug might be duplicate."]);
        }
    }
}
