<?php
/**
 * Bookings Endpoints
 * GET /bookings - Get user's bookings
 * GET /bookings/{id} - Get booking details
 * POST /bookings - Create booking
 * PATCH /bookings/{id} - Update booking
 * DELETE /bookings/{id} - Cancel booking
 */

function handleBookings($method, $id, $action, $input) {
    if ($method === 'GET' && !$id) {
        getBookings($_GET);
    } elseif ($method === 'GET' && $id) {
        getBooking($id);
    } elseif ($method === 'POST' && !$id) {
        createBooking($input);
    } elseif ($method === 'PATCH' && $id) {
        updateBooking($id, $input);
    } elseif ($method === 'DELETE' && $id) {
        cancelBooking($id);
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
}

function getBookings($params) {
    // TODO: Replace with actual Supabase query
    $bookings = [
        [
            'id' => '1',
            'coach_id' => '1',
            'coach_name' => 'Sarah Johnson',
            'client_id' => 'user123',
            'scheduled_at' => '2025-11-28T10:00:00Z',
            'duration' => 60,
            'status' => 'confirmed',
            'price' => 75.00,
            'notes' => 'Career planning session',
            'created_at' => '2025-11-20T14:30:00Z'
        ]
    ];
    
    echo json_encode(['bookings' => $bookings]);
}

function getBooking($id) {
    // TODO: Replace with actual Supabase query
    $booking = [
        'id' => $id,
        'coach_id' => '1',
        'coach_name' => 'Sarah Johnson',
        'client_id' => 'user123',
        'scheduled_at' => '2025-11-28T10:00:00Z',
        'duration' => 60,
        'status' => 'confirmed',
        'price' => 75.00,
        'notes' => 'Career planning session',
        'created_at' => '2025-11-20T14:30:00Z'
    ];
    
    echo json_encode($booking);
}

function createBooking($input) {
    // TODO: Implement actual Supabase insert
    $booking_id = uniqid('booking_');
    
    echo json_encode([
        'success' => true,
        'message' => 'Booking created',
        'booking_id' => $booking_id,
        'booking' => [
            'id' => $booking_id,
            'coach_id' => $input['coach_id'],
            'scheduled_at' => $input['scheduled_at'],
            'duration' => $input['duration'],
            'status' => 'pending',
            'price' => $input['price']
        ]
    ]);
}

function updateBooking($id, $input) {
    // TODO: Implement actual Supabase update
    echo json_encode([
        'success' => true,
        'message' => 'Booking updated',
        'booking_id' => $id
    ]);
}

function cancelBooking($id) {
    // TODO: Implement actual Supabase update (soft delete)
    echo json_encode([
        'success' => true,
        'message' => 'Booking cancelled',
        'booking_id' => $id
    ]);
}
