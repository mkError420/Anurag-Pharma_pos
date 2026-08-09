<?php
require_once __DIR__ . '/../config/db.php';

class WebsiteContentController {
    private $db;

    public function __construct() {
        $this->db = DB::getConnection();
    }

    // ============================================
    // CONTACT INFORMATION CRUD OPERATIONS
    // ============================================

    public function getContactInformation() {
        try {
            $stmt = $this->db->query("SELECT * FROM contact_information LIMIT 1");
            $contactInfo = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$contactInfo) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Contact information not found']);
                return;
            }
            
            // Parse JSON fields
            $contactInfo['email_addresses'] = json_decode($contactInfo['email_addresses'], true) ?? [];
            $contactInfo['phone_numbers'] = json_decode($contactInfo['phone_numbers'], true) ?? [];
            $businessHours = json_decode($contactInfo['business_hours'], true) ?? [];
            
            // Ensure business hours has the new structure
            if (!isset($businessHours['saturday_thursday'])) {
                $businessHours['saturday_thursday'] = $businessHours['monday_friday'] ?? '';
            }
            if (!isset($businessHours['friday'])) {
                $businessHours['friday'] = $businessHours['sunday'] ?? '';
            }
            
            // Remove old fields if they exist
            unset($businessHours['monday_friday'], $businessHours['saturday'], $businessHours['sunday']);
            
            $contactInfo['business_hours'] = $businessHours;
            
            header('Content-Type: application/json');
            echo json_encode($contactInfo);
        } catch (PDOException $e) {
            error_log('Get contact information error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to fetch contact information']);
        }
    }

    public function updateContactInformation() {
        try {
            // Get the first contact information record
            $stmt = $this->db->query("SELECT id FROM contact_information LIMIT 1");
            $contactInfo = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$contactInfo) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Contact information not found']);
                return;
            }
            
            $id = $contactInfo['id'];
            
            // Get JSON input
            $input = json_decode(file_get_contents('php://input'), true);
            
            $emailAddresses = json_encode($input['email_addresses'] ?? []);
            $phoneNumbers = json_encode($input['phone_numbers'] ?? []);
            $address = $input['address'] ?? '';
            
            // Handle business hours with new structure
            $businessHours = $input['business_hours'] ?? [];
            
            // Ensure new structure exists
            if (!isset($businessHours['saturday_thursday'])) {
                $businessHours['saturday_thursday'] = $businessHours['monday_friday'] ?? '';
            }
            if (!isset($businessHours['friday'])) {
                $businessHours['friday'] = $businessHours['sunday'] ?? '';
            }
            
            // Remove old fields
            unset($businessHours['monday_friday'], $businessHours['saturday'], $businessHours['sunday']);
            
            $businessHoursJson = json_encode($businessHours);
            
            $stmt = $this->db->prepare("
                UPDATE contact_information 
                SET email_addresses = ?, phone_numbers = ?, address = ?, business_hours = ?
                WHERE id = ?
            ");
            $stmt->execute([$emailAddresses, $phoneNumbers, $address, $businessHoursJson, $id]);
            
            header('Content-Type: application/json');
            echo json_encode([
                'id' => (int)$id,
                'email_addresses' => json_decode($emailAddresses, true),
                'phone_numbers' => json_decode($phoneNumbers, true),
                'address' => $address,
                'business_hours' => $businessHours
            ]);
        } catch (PDOException $e) {
            error_log('Update contact information error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to update contact information']);
        }
    }

    // ============================================
    // HERO SLIDES CRUD OPERATIONS
    // ============================================

    public function getAllHeroSlides() {
        try {
            $stmt = $this->db->query("
                SELECT id, title, subtitle, description, button_text, button_link, image_url, display_order, status, created_at, updated_at 
                FROM hero_slides 
                WHERE status = 'active' 
                ORDER BY display_order ASC
            ");
            $slides = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            header('Content-Type: application/json');
            echo json_encode($slides);
        } catch (PDOException $e) {
            error_log('Get all hero slides error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to fetch hero slides']);
        }
    }

    public function getHeroSlideById($id) {
        try {
            $stmt = $this->db->prepare("
                SELECT id, title, subtitle, description, button_text, button_link, image_url, display_order, status, created_at, updated_at 
                FROM hero_slides 
                WHERE id = ?
            ");
            $stmt->execute([$id]);
            $slide = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$slide) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Hero slide not found']);
                return;
            }
            
            header('Content-Type: application/json');
            echo json_encode($slide);
        } catch (PDOException $e) {
            error_log('Get hero slide error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to fetch hero slide']);
        }
    }

    public function createHeroSlide() {
        try {
            // Handle file upload
            $imageUrl = '';
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = '../uploads/hero/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                
                $fileExtension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $fileName = time() . '_' . uniqid() . '.' . $fileExtension;
                $uploadPath = $uploadDir . $fileName;
                
                if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath)) {
                    $imageUrl = 'uploads/hero/' . $fileName;
                } else {
                    http_response_code(400);
                    header('Content-Type: application/json');
                    echo json_encode(['error' => 'Failed to upload image']);
                    return;
                }
            } else {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Image is required']);
                return;
            }

            $title = $_POST['title'] ?? '';
            $subtitle = $_POST['subtitle'] ?? '';
            $description = $_POST['description'] ?? '';
            $buttonText = $_POST['button_text'] ?? '';
            $buttonLink = $_POST['button_link'] ?? '';
            $displayOrder = $_POST['order'] ?? 0;

            if (empty($title)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Title is required']);
                return;
            }

            $stmt = $this->db->prepare("
                INSERT INTO hero_slides (title, subtitle, description, button_text, button_link, image_url, display_order, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
            ");
            $stmt->execute([$title, $subtitle, $description, $buttonText, $buttonLink, $imageUrl, $displayOrder]);
            
            http_response_code(201);
            header('Content-Type: application/json');
            echo json_encode([
                'id' => $this->db->lastInsertId(),
                'title' => $title,
                'subtitle' => $subtitle,
                'description' => $description,
                'button_text' => $buttonText,
                'button_link' => $buttonLink,
                'image_url' => $imageUrl,
                'order' => (int)$displayOrder
            ]);
        } catch (PDOException $e) {
            error_log('Create hero slide error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to create hero slide']);
        }
    }

    public function updateHeroSlide($id) {
        try {
            // Check if slide exists
            $stmt = $this->db->prepare("SELECT image_url FROM hero_slides WHERE id = ?");
            $stmt->execute([$id]);
            $existingSlide = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$existingSlide) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Hero slide not found']);
                return;
            }

            $imageUrl = $existingSlide['image_url'];
            
            // Handle file upload if new image provided
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = '../uploads/hero/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                
                $fileExtension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $fileName = time() . '_' . uniqid() . '.' . $fileExtension;
                $uploadPath = $uploadDir . $fileName;
                
                if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath)) {
                    // Delete old image if exists
                    if (!empty($existingSlide['image_url']) && file_exists('../' . $existingSlide['image_url'])) {
                        unlink('../' . $existingSlide['image_url']);
                    }
                    $imageUrl = 'uploads/hero/' . $fileName;
                }
            }

            $title = $_POST['title'] ?? '';
            $subtitle = $_POST['subtitle'] ?? '';
            $description = $_POST['description'] ?? '';
            $buttonText = $_POST['button_text'] ?? '';
            $buttonLink = $_POST['button_link'] ?? '';
            $displayOrder = $_POST['order'] ?? 0;

            if (empty($title)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Title is required']);
                return;
            }

            $stmt = $this->db->prepare("
                UPDATE hero_slides 
                SET title = ?, subtitle = ?, description = ?, button_text = ?, button_link = ?, image_url = ?, display_order = ?
                WHERE id = ?
            ");
            $stmt->execute([$title, $subtitle, $description, $buttonText, $buttonLink, $imageUrl, $displayOrder, $id]);
            
            header('Content-Type: application/json');
            echo json_encode([
                'id' => (int)$id,
                'title' => $title,
                'subtitle' => $subtitle,
                'description' => $description,
                'button_text' => $buttonText,
                'button_link' => $buttonLink,
                'image_url' => $imageUrl,
                'order' => (int)$displayOrder
            ]);
        } catch (PDOException $e) {
            error_log('Update hero slide error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to update hero slide']);
        }
    }

    public function deleteHeroSlide($id) {
        try {
            // Get slide info for image deletion
            $stmt = $this->db->prepare("SELECT image_url FROM hero_slides WHERE id = ?");
            $stmt->execute([$id]);
            $slide = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$slide) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Hero slide not found']);
                return;
            }

            // Delete image file
            if (!empty($slide['image_url']) && file_exists('../' . $slide['image_url'])) {
                unlink('../' . $slide['image_url']);
            }

            // Delete from database
            $stmt = $this->db->prepare("DELETE FROM hero_slides WHERE id = ?");
            $stmt->execute([$id]);
            
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Hero slide deleted successfully']);
        } catch (PDOException $e) {
            error_log('Delete hero slide error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to delete hero slide']);
        }
    }

    // ============================================
    // CONTACT MESSAGES CRUD OPERATIONS
    // ============================================

    public function getAllContactMessages() {
        try {
            $stmt = $this->db->query("
                SELECT id, name, phone, message, status, created_at 
                FROM contact_messages 
                ORDER BY created_at DESC
            ");
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            header('Content-Type: application/json');
            echo json_encode($messages);
        } catch (PDOException $e) {
            error_log('Get all contact messages error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to fetch contact messages']);
        }
    }

    public function getContactMessageById($id) {
        try {
            $stmt = $this->db->prepare("
                SELECT id, name, phone, message, status, created_at 
                FROM contact_messages 
                WHERE id = ?
            ");
            $stmt->execute([$id]);
            $message = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$message) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Contact message not found']);
                return;
            }
            
            header('Content-Type: application/json');
            echo json_encode($message);
        } catch (PDOException $e) {
            error_log('Get contact message error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to fetch contact message']);
        }
    }

    public function createContactMessage() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $name = $input['name'] ?? '';
            $phone = $input['phone'] ?? '';
            $message = $input['message'] ?? '';
            
            if (empty($name) || empty($phone) || empty($message)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'All fields are required']);
                return;
            }
            
            $stmt = $this->db->prepare("
                INSERT INTO contact_messages (name, phone, message, status)
                VALUES (?, ?, ?, 'new')
            ");
            $stmt->execute([$name, $phone, $message]);
            
            http_response_code(201);
            header('Content-Type: application/json');
            echo json_encode([
                'id' => $this->db->lastInsertId(),
                'name' => $name,
                'phone' => $phone,
                'message' => $message,
                'status' => 'new'
            ]);
        } catch (PDOException $e) {
            error_log('Create contact message error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to create contact message']);
        }
    }

    public function updateContactMessageStatus($id) {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $status = $input['status'] ?? 'read';
            
            if (!in_array($status, ['new', 'read', 'replied'])) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Invalid status']);
                return;
            }
            
            $stmt = $this->db->prepare("
                UPDATE contact_messages 
                SET status = ?
                WHERE id = ?
            ");
            $stmt->execute([$status, $id]);
            
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Contact message not found']);
                return;
            }
            
            header('Content-Type: application/json');
            echo json_encode([
                'id' => (int)$id,
                'status' => $status
            ]);
        } catch (PDOException $e) {
            error_log('Update contact message status error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to update contact message status']);
        }
    }

    public function deleteContactMessage($id) {
        try {
            $stmt = $this->db->prepare("DELETE FROM contact_messages WHERE id = ?");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Contact message not found']);
                return;
            }
            
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Contact message deleted successfully']);
        } catch (PDOException $e) {
            error_log('Delete contact message error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to delete contact message']);
        }
    }

    // ============================================
    // TEAM MEMBERS CRUD OPERATIONS
    // ============================================

    public function getAllTeamMembers() {
        try {
            $stmt = $this->db->query("
                SELECT id, name, role, bio, image_url, display_order, status, created_at, updated_at 
                FROM team_members 
                WHERE status = 'active' 
                ORDER BY display_order ASC
            ");
            $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            header('Content-Type: application/json');
            echo json_encode($members);
        } catch (PDOException $e) {
            error_log('Get all team members error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to fetch team members']);
        }
    }

    public function getTeamMemberById($id) {
        try {
            $stmt = $this->db->prepare("
                SELECT id, name, role, bio, image_url, display_order, status, created_at, updated_at 
                FROM team_members 
                WHERE id = ?
            ");
            $stmt->execute([$id]);
            $member = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$member) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Team member not found']);
                return;
            }
            
            header('Content-Type: application/json');
            echo json_encode($member);
        } catch (PDOException $e) {
            error_log('Get team member error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to fetch team member']);
        }
    }

    public function createTeamMember() {
        try {
            // Parse request data
            $postData = [];
            $fileData = [];
            
            // Check content type to determine how to parse
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($contentType, 'application/json') !== false) {
                // JSON request
                $rawInput = file_get_contents('php://input');
                $postData = json_decode($rawInput, true) ?? [];
                $fileData = [];
                
                // Handle image_url from JSON request
                $imageUrl = $postData['image_url'] ?? '';
            } else {
                // FormData request
                $postData = $_POST;
                $fileData = $_FILES;
                
                // Handle file upload
                $imageUrl = '';
                if (isset($fileData['image']) && $fileData['image']['error'] === UPLOAD_ERR_OK) {
                    $uploadDir = '../uploads/team/';
                    if (!is_dir($uploadDir)) {
                        mkdir($uploadDir, 0755, true);
                    }
                    
                    $fileExtension = pathinfo($fileData['image']['name'], PATHINFO_EXTENSION);
                    $fileName = time() . '_' . uniqid() . '.' . $fileExtension;
                    $uploadPath = $uploadDir . $fileName;
                    
                    if (move_uploaded_file($fileData['image']['tmp_name'], $uploadPath)) {
                        $imageUrl = 'uploads/team/' . $fileName;
                    }
                }
            }

            $name = $postData['name'] ?? '';
            $role = $postData['role'] ?? '';
            $bio = $postData['bio'] ?? '';
            $displayOrder = $postData['order'] ?? 0;

            if (empty($name) || empty($role)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode([
                    'error' => 'Name and role are required',
                    'debug' => [
                        'received_post' => $postData,
                        'received_files' => isset($fileData['image']) ? 'image present' : 'no image',
                        'name_value' => $name,
                        'role_value' => $role,
                        'name_empty' => empty($name),
                        'role_empty' => empty($role)
                    ]
                ]);
                return;
            }

            $stmt = $this->db->prepare("
                INSERT INTO team_members (name, role, bio, image_url, display_order, status)
                VALUES (?, ?, ?, ?, ?, 'active')
            ");
            $stmt->execute([$name, $role, $bio, $imageUrl, $displayOrder]);
            
            http_response_code(201);
            header('Content-Type: application/json');
            echo json_encode([
                'id' => $this->db->lastInsertId(),
                'name' => $name,
                'role' => $role,
                'bio' => $bio,
                'image_url' => $imageUrl,
                'order' => (int)$displayOrder
            ]);
        } catch (PDOException $e) {
            error_log('Create team member error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to create team member']);
        }
    }

    public function updateTeamMember($id) {
        try {
            // Check if member exists
            $stmt = $this->db->prepare("SELECT image_url FROM team_members WHERE id = ?");
            $stmt->execute([$id]);
            $existingMember = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$existingMember) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Team member not found']);
                return;
            }

            $imageUrl = $existingMember['image_url'];
            
            // Parse request data
            $postData = [];
            $fileData = [];
            
            // Check content type to determine how to parse
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($contentType, 'application/json') !== false) {
                // JSON request
                $rawInput = file_get_contents('php://input');
                $postData = json_decode($rawInput, true) ?? [];
                $fileData = [];
                
                // Handle image_url from JSON request
                if (isset($postData['image_url'])) {
                    $imageUrl = $postData['image_url'];
                }
            } else {
                // FormData request (POST only, since we use JSON for PUT now)
                $postData = $_POST;
                $fileData = $_FILES;
                
                // Handle file upload if new image provided
                if (isset($fileData['image']) && $fileData['image']['error'] === UPLOAD_ERR_OK) {
                    $uploadDir = '../uploads/team/';
                    if (!is_dir($uploadDir)) {
                        mkdir($uploadDir, 0755, true);
                    }
                    
                    $fileExtension = pathinfo($fileData['image']['name'], PATHINFO_EXTENSION);
                    $fileName = time() . '_' . uniqid() . '.' . $fileExtension;
                    $uploadPath = $uploadDir . $fileName;
                    
                    if (move_uploaded_file($fileData['image']['tmp_name'], $uploadPath)) {
                        // Delete old image if exists
                        if (!empty($existingMember['image_url']) && file_exists('../' . $existingMember['image_url'])) {
                            unlink('../' . $existingMember['image_url']);
                        }
                        $imageUrl = 'uploads/team/' . $fileName;
                    }
                }
            }

            // Debug logging
            error_log('POST data in update: ' . print_r($postData, true));
            error_log('FILES data in update: ' . print_r($fileData, true));

            $name = $postData['name'] ?? '';
            $role = $postData['role'] ?? '';
            $bio = $postData['bio'] ?? '';
            $displayOrder = $postData['order'] ?? 0;

            if (empty($name) || empty($role)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Name and role are required']);
                return;
            }

            $stmt = $this->db->prepare("
                UPDATE team_members 
                SET name = ?, role = ?, bio = ?, image_url = ?, display_order = ?
                WHERE id = ?
            ");
            $stmt->execute([$name, $role, $bio, $imageUrl, $displayOrder, $id]);
            
            header('Content-Type: application/json');
            echo json_encode([
                'id' => (int)$id,
                'name' => $name,
                'role' => $role,
                'bio' => $bio,
                'image_url' => $imageUrl,
                'order' => (int)$displayOrder
            ]);
        } catch (PDOException $e) {
            error_log('Update team member error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to update team member']);
        }
    }

    public function deleteTeamMember($id) {
        try {
            $stmt = $this->db->prepare("DELETE FROM team_members WHERE id = ?");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Team member not found']);
                return;
            }
            
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Team member deleted successfully']);
        } catch (PDOException $e) {
            error_log('Delete team member error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to delete team member']);
        }
    }

    // ============================================
    // PRICING PLANS CRUD OPERATIONS
    // ============================================

    public function getAllPricingPlans() {
        try {
            $stmt = $this->db->query("
                SELECT id, name, description, price, currency, billing_period, features, is_popular, is_active, sort_order, button_text, created_at, updated_at 
                FROM pricing_plans 
                WHERE is_active = 1 
                ORDER BY sort_order ASC
            ");
            $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON features field
            foreach ($plans as &$plan) {
                $plan['features'] = json_decode($plan['features'], true) ?? [];
                $plan['is_popular'] = (bool)$plan['is_popular'];
                $plan['is_active'] = (bool)$plan['is_active'];
            }
            
            header('Content-Type: application/json');
            echo json_encode($plans);
        } catch (PDOException $e) {
            error_log('Get all pricing plans error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to fetch pricing plans']);
        }
    }

    public function getPricingPlanById($id) {
        try {
            $stmt = $this->db->prepare("
                SELECT id, name, description, price, currency, billing_period, features, is_popular, is_active, sort_order, button_text, created_at, updated_at 
                FROM pricing_plans 
                WHERE id = ?
            ");
            $stmt->execute([$id]);
            $plan = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$plan) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Pricing plan not found']);
                return;
            }
            
            // Parse JSON features field
            $plan['features'] = json_decode($plan['features'], true) ?? [];
            $plan['is_popular'] = (bool)$plan['is_popular'];
            $plan['is_active'] = (bool)$plan['is_active'];
            
            header('Content-Type: application/json');
            echo json_encode($plan);
        } catch (PDOException $e) {
            error_log('Get pricing plan error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to fetch pricing plan']);
        }
    }

    public function createPricingPlan() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $name = $input['name'] ?? '';
            $description = $input['description'] ?? '';
            $price = $input['price'] ?? 0;
            $currency = $input['currency'] ?? 'BDT';
            $billingPeriod = $input['billing_period'] ?? 'month';
            $features = json_encode($input['features'] ?? []);
            $isPopular = isset($input['is_popular']) ? (int)$input['is_popular'] : 0;
            $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 1;
            $sortOrder = $input['sort_order'] ?? 0;
            $buttonText = $input['button_text'] ?? 'Get Started';
            
            if (empty($name)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Plan name is required']);
                return;
            }
            
            $stmt = $this->db->prepare("
                INSERT INTO pricing_plans (name, description, price, currency, billing_period, features, is_popular, is_active, sort_order, button_text)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$name, $description, $price, $currency, $billingPeriod, $features, $isPopular, $isActive, $sortOrder, $buttonText]);
            
            $planId = $this->db->lastInsertId();
            
            header('Content-Type: application/json');
            echo json_encode([
                'id' => (int)$planId,
                'name' => $name,
                'description' => $description,
                'price' => (float)$price,
                'currency' => $currency,
                'billing_period' => $billingPeriod,
                'features' => json_decode($features, true),
                'is_popular' => (bool)$isPopular,
                'is_active' => (bool)$isActive,
                'sort_order' => (int)$sortOrder,
                'button_text' => $buttonText
            ]);
        } catch (PDOException $e) {
            error_log('Create pricing plan error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to create pricing plan']);
        }
    }

    public function updatePricingPlan($id) {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $name = $input['name'] ?? '';
            $description = $input['description'] ?? '';
            $price = $input['price'] ?? 0;
            $currency = $input['currency'] ?? 'BDT';
            $billingPeriod = $input['billing_period'] ?? 'month';
            $features = json_encode($input['features'] ?? []);
            $isPopular = isset($input['is_popular']) ? (int)$input['is_popular'] : 0;
            $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 1;
            $sortOrder = $input['sort_order'] ?? 0;
            $buttonText = $input['button_text'] ?? 'Get Started';
            
            if (empty($name)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Plan name is required']);
                return;
            }
            
            $stmt = $this->db->prepare("
                UPDATE pricing_plans 
                SET name = ?, description = ?, price = ?, currency = ?, billing_period = ?, features = ?, is_popular = ?, is_active = ?, sort_order = ?, button_text = ?
                WHERE id = ?
            ");
            $stmt->execute([$name, $description, $price, $currency, $billingPeriod, $features, $isPopular, $isActive, $sortOrder, $buttonText, $id]);
            
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Pricing plan not found']);
                return;
            }
            
            header('Content-Type: application/json');
            echo json_encode([
                'id' => (int)$id,
                'name' => $name,
                'description' => $description,
                'price' => (float)$price,
                'currency' => $currency,
                'billing_period' => $billingPeriod,
                'features' => json_decode($features, true),
                'is_popular' => (bool)$isPopular,
                'is_active' => (bool)$isActive,
                'sort_order' => (int)$sortOrder,
                'button_text' => $buttonText
            ]);
        } catch (PDOException $e) {
            error_log('Update pricing plan error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to update pricing plan']);
        }
    }

    public function deletePricingPlan($id) {
        try {
            $stmt = $this->db->prepare("DELETE FROM pricing_plans WHERE id = ?");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Pricing plan not found']);
                return;
            }
            
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Pricing plan deleted successfully']);
        } catch (PDOException $e) {
            error_log('Delete pricing plan error: ' . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Failed to delete pricing plan']);
        }
    }
}
