UPDATE users SET role = 'collaborateur' WHERE role = 'collaborateur_digifemmes';
UPDATE users SET role = 'partenaire'    WHERE role = 'collaborateur_partenaire';
UPDATE users SET role = 'admin'         WHERE role = 'admin_it';
