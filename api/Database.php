<?php
// api/Database.php

class Database {
    private $url = SUPABASE_URL;
    private $key = SUPABASE_ANON_KEY;

    /**
     * Make a request to Supabase REST API
     * 
     * @param string $method GET, POST, PATCH, DELETE
     * @param string $endpoint e.g. '/cs_coaches?select=*'
     * @param array $data Data to send (for POST/PATCH)
     * @param string|null $token User's JWT token (optional)
     * @param array $extraHeaders Additional headers
     * @return array Response data and status
     */
    public function request($method, $endpoint, $data = [], $token = null, $extraHeaders = []) {
        $ch = curl_init();
        $url = rtrim($this->url, '/') . '/rest/v1' . $endpoint;
        
        // Handle RPC calls
        if (strpos($endpoint, '/rpc/') === 0) {
            $url = rtrim($this->url, '/') . '/rest/v1' . $endpoint;
        }

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

        $headers = [
            'apikey: ' . $this->key,
            'Content-Type: application/json',
            'Prefer: return=representation' // Return the created/updated object
        ];

        if ($token) {
            $headers[] = 'Authorization: Bearer ' . $token;
        } else {
            $headers[] = 'Authorization: Bearer ' . $this->key;
        }

        if (!empty($extraHeaders)) {
            $headers = array_merge($headers, $extraHeaders);
        }

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        if (!empty($data) && ($method === 'POST' || $method === 'PATCH' || $method === 'PUT')) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        
        curl_close($ch);

        if ($error) {
            throw new Exception("CURL Error: " . $error);
        }

        return [
            'status' => $httpCode,
            'body' => json_decode($response, true)
        ];
    }
}
