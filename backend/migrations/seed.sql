-- Utilisateurs de test
-- Mot de passe pour tous : "password" (hash bcrypt)
INSERT INTO users (id, email, password_hash, role, department, is_active) VALUES
    ('00000000-0000-0000-0000-000000000001', 'superadmin@digifemmes.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', NULL, TRUE),
    ('00000000-0000-0000-0000-000000000002', 'admin@digifemmes.com',      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL, TRUE),
    ('00000000-0000-0000-0000-000000000003', 'adminit@digifemmes.com',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin_it', NULL, TRUE),
    ('00000000-0000-0000-0000-000000000004', 'alice@digifemmes.com',      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'collaborateur_digifemmes', 'Formation', TRUE),
    ('00000000-0000-0000-0000-000000000005', 'bob@digifemmes.com',        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'collaborateur_digifemmes', 'Tech', TRUE),
    ('00000000-0000-0000-0000-000000000006', 'partenaire@externe.com',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'collaborateur_partenaire', NULL, TRUE);

-- Espaces de test
INSERT INTO spaces (id, name, type, capacity, seats, equipment_fixed, is_active) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Salle Afrique',    'salle_programme',  30, 30, ARRAY['TV 65"', 'Projecteur'],  TRUE),
    ('10000000-0000-0000-0000-000000000002', 'Salle Innovation', 'salle_programme',  15, 15, ARRAY['TV 55"'],                TRUE),
    ('10000000-0000-0000-0000-000000000003', 'Salle Confluence', 'salle_programme',   8,  8, ARRAY[]::TEXT[],               TRUE),
    ('10000000-0000-0000-0000-000000000004', 'Bureau Direktion', 'bureau_individuel',  1,  1, ARRAY[]::TEXT[],               TRUE),
    ('10000000-0000-0000-0000-000000000005', 'Open Space',       'bureau_partage',    0, 10, ARRAY[]::TEXT[],               TRUE);

-- Matériel informatique de test
INSERT INTO equipment (id, type, name, status) VALUES
    ('20000000-0000-0000-0000-000000000001', 'laptop', 'MacBook Pro 14" #1', 'disponible'),
    ('20000000-0000-0000-0000-000000000002', 'laptop', 'MacBook Pro 14" #2', 'disponible'),
    ('20000000-0000-0000-0000-000000000003', 'laptop', 'Dell XPS 15 #1',     'disponible'),
    ('20000000-0000-0000-0000-000000000004', 'laptop', 'Dell XPS 15 #2',     'attribue');
