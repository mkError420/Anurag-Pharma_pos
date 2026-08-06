<?php
require_once __DIR__ . '/../config/db.php';

class WebsiteContentController {
    private $db;

    public function __construct() {
        $this->db = DB::getConnection();
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
            // Handle file upload
            $imageUrl = '';
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = '../uploads/team/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                
                $fileExtension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $fileName = time() . '_' . uniqid() . '.' . $fileExtension;
                $uploadPath = $uploadDir . $fileName;
                
                if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath)) {
                    $imageUrl = 'uploads/team/' . $fileName;
                }
            }

            $name = $_POST['name'] ?? '';
            $role = $_POST['role'] ?? '';
            $bio = $_POST['bio'] ?? '';
            $displayOrder = $_POST['order'] ?? 0;

            if (empty($name) || empty($role)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Name and role are required']);
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
            
            // Handle file upload if new image provided
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = '../uploads/team/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                
                $fileExtension = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $fileName = time() . '_' . uniqid() . '.' . $fileExtension;
                $uploadPath = $uploadDir . $fileName;
                
                if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath)) {
                    // Delete old image if exists
                    if (!empty($existingMember['image_url']) && file_exists('../' . $existingMember['image_url'])) {
                        unlink('../' . $existingMember['image_url']);
                    }
                    $imageUrl = 'uploads/team/' . $fileName;
                }
            }

            $name = $_POST['name'] ?? '';
            $role = $_POST['role'] ?? '';
            $bio = $_POST['bio'] ?? '';
            $displayOrder = $_POST['order'] ?? 0;

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
}
