<?php
// api/controllers/ArticleController.php

class ArticleController {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
    }

    public function index() {
        $query = "SELECT a.*, u.raw_user_meta_data->>'full_name' as author_name 
                  FROM cs_articles a 
                  JOIN cs_coaches c ON a.coach_id = c.id 
                  JOIN auth.users u ON c.id = u.id 
                  WHERE published = true 
                  ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $articles = $stmt->fetchAll();

        if (empty($articles)) {
            echo json_encode([
                "data" => [],
                "disclaimer" => "No data found; database may be empty or filters too strict."
            ]);
        } else {
            echo json_encode(["data" => $articles]);
        }
    }

    public function get($id) {
        // ID can be UUID or Slug
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $id)) {
             $query = "SELECT * FROM cs_articles WHERE id = :id";
        } else {
             $query = "SELECT * FROM cs_articles WHERE slug = :id";
        }
       
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':id', $id);
        $stmt->execute();
        $article = $stmt->fetch();

        if ($article) {
            echo json_encode(["data" => $article]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Article not found"]);
        }
    }

    public function create($userId) {
        if (!$userId) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['title']) || !isset($data['content'])) {
            http_response_code(400);
            echo json_encode(["error" => "Title and Content are required"]);
            return;
        }

        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $data['title'])));

        $query = "INSERT INTO cs_articles (coach_id, title, slug, content, summary, published) 
                  VALUES (:coach_id, :title, :slug, :content, :summary, :published) RETURNING id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindValue(':coach_id', $userId);
        $stmt->bindValue(':title', $data['title']);
        $stmt->bindValue(':slug', $slug);
        $stmt->bindValue(':content', $data['content']);
        $stmt->bindValue(':summary', substr(strip_tags($data['content']), 0, 150));
        $stmt->bindValue(':published', $data['published'] ?? false, PDO::PARAM_BOOL);

        try {
            if ($stmt->execute()) {
                $id = $stmt->fetchColumn();
                echo json_encode(["message" => "Article created", "id" => $id, "slug" => $slug]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to create article. Slug might be duplicate."]);
        }
    }
}
