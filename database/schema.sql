-- =============================================================================
-- SISTEMA ROMA V4 - SAAS MULTITENANT PARA AGENCIA DE PUBLICIDAD Y DISEÑO
-- Compatible 100% con PostgreSQL en cPanel de BanaHosting (sin requerir SUPERUSER)
-- =============================================================================

-- 1. TABLA DE TENANTS (ESPACIOS DE TRABAJO / AGENCIAS)
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    -- Configuración de Personalización (Pestaña 1)
    customization JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Datos de la Empresa y Redes (Pestaña 2)
    company_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Credenciales y Configuración de Google Drive (Pestaña Cloud)
    drive_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA DE ROLES Y PERMISOS GRANULARES (Pestaña 4 - Multitenant)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    badge_color VARCHAR(32) NOT NULL DEFAULT '#7c3aed',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);

-- 3. TABLA DE USUARIOS CON ACCESO POR PIN DE 8 DÍGITOS (Pestaña 3 - Multitenant)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id VARCHAR(64) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    name VARCHAR(180) NOT NULL,
    job_title VARCHAR(150) NOT NULL DEFAULT 'Especialista Creativo',
    email VARCHAR(180) NOT NULL DEFAULT '',
    whatsapp VARCHAR(50) NOT NULL DEFAULT '',
    pin VARCHAR(8) NOT NULL,
    avatar_url TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pin_8_digits CHECK (pin ~ '^[0-9]{8}$')
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin);

-- 4. TABLA DE CLIENTES (Primer Módulo - Multitenant)
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    document_type VARCHAR(20) NOT NULL DEFAULT 'RUC',
    document_number VARCHAR(30) NOT NULL,
    whatsapp VARCHAR(50) NOT NULL,
    email VARCHAR(180), -- No obligatorio según requerimiento
    notes TEXT NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_document ON clients(tenant_id, document_number);

-- 5. TABLA DE MARCAS ASIGNADAS AL CLIENTE (Multitenant)
CREATE TABLE IF NOT EXISTS client_brands (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(180) NOT NULL,
    industry VARCHAR(120) NOT NULL DEFAULT 'Publicidad & Diseño',
    brand_color VARCHAR(30) NOT NULL DEFAULT '#8b5cf6',
    logo_url TEXT NOT NULL DEFAULT '',
    social_handle VARCHAR(150) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_brands_tenant_id ON client_brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_brands_client_id ON client_brands(client_id);

-- 6. TABLA DE COTIZACIONES Y PROPUESTAS COMERCIALES (Multitenant)
CREATE TABLE IF NOT EXISTS quotes (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    client_id VARCHAR(64) REFERENCES clients(id) ON DELETE SET NULL,
    client_name VARCHAR(200) NOT NULL,
    company_name VARCHAR(200) NOT NULL DEFAULT '',
    document_type VARCHAR(20) NOT NULL DEFAULT 'RUC',
    document_number VARCHAR(30) NOT NULL DEFAULT '',
    whatsapp VARCHAR(50) NOT NULL DEFAULT '',
    email VARCHAR(180) NOT NULL DEFAULT '',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'PEN',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT 'S/',
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    theme VARCHAR(50) NOT NULL DEFAULT 'modern-violet',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    include_tax BOOLEAN NOT NULL DEFAULT FALSE,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    show_gantt BOOLEAN NOT NULL DEFAULT TRUE,
    gantt_phases JSONB NOT NULL DEFAULT '[]'::jsonb,
    additional_notes TEXT NOT NULL DEFAULT '',
    terms_and_conditions TEXT NOT NULL DEFAULT '',
    show_payment_methods BOOLEAN NOT NULL DEFAULT TRUE,
    payment_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
    public_token VARCHAR(100) NOT NULL UNIQUE,
    short_code VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_tenant_id ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_public_token ON quotes(public_token);
CREATE INDEX IF NOT EXISTS idx_quotes_short_code ON quotes(short_code);
CREATE INDEX IF NOT EXISTS idx_quotes_code ON quotes(tenant_id, code);

-- 7. TABLA DE CATEGORÍAS DE SERVICIOS (Multitenant)
CREATE TABLE IF NOT EXISTS service_categories (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    badge_color VARCHAR(32) NOT NULL DEFAULT '#7c3aed',
    icon VARCHAR(64) NOT NULL DEFAULT 'Sparkles',
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_categories_tenant_id ON service_categories(tenant_id);

-- 8. TABLA DE SERVICIOS DE AGENCIA (Multitenant)
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(250) NOT NULL,
    category_id VARCHAR(64) REFERENCES service_categories(id) ON DELETE SET NULL,
    cover_image TEXT NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    icon VARCHAR(64) NOT NULL DEFAULT 'Sparkles',
    pricing_type VARCHAR(30) NOT NULL DEFAULT 'fixed',
    currency VARCHAR(10) NOT NULL DEFAULT 'PEN',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT 'S/',
    visibility VARCHAR(20) NOT NULL DEFAULT 'public',
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    annual_discount NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    delivery_time VARCHAR(100) NOT NULL DEFAULT '',
    inventory INT,
    inventory_unlimited BOOLEAN NOT NULL DEFAULT TRUE,
    urgency JSONB NOT NULL DEFAULT '{"enabled":false,"endDate":"","badgeText":""}'::jsonb,
    video JSONB NOT NULL DEFAULT '{"enabled":false,"url":"","platform":"youtube"}'::jsonb,
    brief_description TEXT NOT NULL DEFAULT '',
    full_description TEXT NOT NULL DEFAULT '',
    packages JSONB NOT NULL DEFAULT '[]'::jsonb,
    gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
    extras JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo JSONB NOT NULL DEFAULT '{"slug":"","metaTitle":"","metaDescription":"","ogImageUrl":""}'::jsonb,
    related_service_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(tenant_id, status);

-- -----------------------------------------------------------------------------
-- 9. TABLA DE NOTAS DE PAGO (RECIBOS, COMPROBANTES DE COBRO INTERNOS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_notes (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    quote_id VARCHAR(64),
    quote_code VARCHAR(64),
    client_id VARCHAR(64) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(32) NOT NULL DEFAULT 'RUC',
    document_number VARCHAR(64) NOT NULL,
    whatsapp VARCHAR(64) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    issue_date VARCHAR(32) NOT NULL,
    due_date VARCHAR(32) NOT NULL,
    payment_date VARCHAR(32),
    payment_method VARCHAR(64),
    operation_number VARCHAR(128),
    currency VARCHAR(16) NOT NULL DEFAULT 'PEN',
    currency_symbol VARCHAR(16) NOT NULL DEFAULT 'S/',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    include_tax BOOLEAN NOT NULL DEFAULT FALSE,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    notes TEXT DEFAULT '',
    bank_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
    public_token VARCHAR(64) NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_notes_tenant ON payment_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_notes_token ON payment_notes(public_token);
CREATE INDEX IF NOT EXISTS idx_payment_notes_client ON payment_notes(client_id);

-- -----------------------------------------------------------------------------
-- 10. TABLA DE PUBLICACIONES DE REDES SOCIALES (WORKSPACE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_posts (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    brand_id VARCHAR(64),
    brand_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    platforms JSONB NOT NULL DEFAULT '["instagram"]'::jsonb,
    format VARCHAR(32) NOT NULL DEFAULT 'post',
    copy TEXT DEFAULT '',
    hashtags TEXT DEFAULT '',
    media_url TEXT DEFAULT '',
    scheduled_date VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'idea',
    assigned_user_id VARCHAR(64),
    assigned_user_name VARCHAR(255),
    assigned_user_role VARCHAR(255),
    assigned_user_avatar TEXT DEFAULT '',
    budget NUMERIC(12,2) DEFAULT 0.00,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_posts_tenant ON workspace_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspace_posts_client ON workspace_posts(client_id);
CREATE INDEX IF NOT EXISTS idx_workspace_posts_date ON workspace_posts(scheduled_date);

-- -----------------------------------------------------------------------------
-- 11. TABLA DE TAREAS OPERATIVAS (WORKSPACE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_tasks (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    priority VARCHAR(32) NOT NULL DEFAULT 'medium',
    category VARCHAR(64) NOT NULL DEFAULT 'General',
    client_id VARCHAR(64),
    client_name VARCHAR(255),
    assigned_user_id VARCHAR(64),
    assigned_user_name VARCHAR(255),
    assigned_user_avatar TEXT DEFAULT '',
    due_date VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_tasks_tenant ON workspace_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspace_tasks_status ON workspace_tasks(tenant_id, status);

-- -----------------------------------------------------------------------------
-- 12. TABLA DE ÓRDENES DE SERVICIO (OS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_orders (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL DEFAULT '',
    brand_name VARCHAR(255) NOT NULL DEFAULT '',
    document_type VARCHAR(32) NOT NULL DEFAULT 'RUC',
    document_number VARCHAR(64) NOT NULL DEFAULT '',
    whatsapp VARCHAR(64) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    quote_id VARCHAR(64),
    quote_code VARCHAR(64),
    start_date VARCHAR(32) NOT NULL,
    delivery_date VARCHAR(32) NOT NULL,
    project_manager_id VARCHAR(64),
    project_manager_name VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    total_progress NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    social_media JSONB NOT NULL DEFAULT '{"enabled":false}'::jsonb,
    branding JSONB NOT NULL DEFAULT '{"enabled":false}'::jsonb,
    audiovisual JSONB NOT NULL DEFAULT '{"enabled":false}'::jsonb,
    web JSONB NOT NULL DEFAULT '{"enabled":false}'::jsonb,
    deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
    public_token VARCHAR(64) NOT NULL UNIQUE,
    notes TEXT DEFAULT '',
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_orders_tenant ON service_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_token ON service_orders(public_token);
CREATE INDEX IF NOT EXISTS idx_service_orders_client ON service_orders(client_id);

-- -----------------------------------------------------------------------------
-- 13. TABLAS DE GESTIÓN DE GOOGLE DRIVE Y ARCHIVOS CLOUD
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drive_files (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    google_file_id VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    web_view_link TEXT NOT NULL DEFAULT '',
    web_content_link TEXT NOT NULL DEFAULT '',
    thumbnail_link TEXT NOT NULL DEFAULT '',
    parent_folder_id VARCHAR(128),
    parent_folder_name VARCHAR(255) NOT NULL DEFAULT '',
    client_id VARCHAR(64) REFERENCES clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL DEFAULT '',
    service_order_id VARCHAR(64) REFERENCES service_orders(id) ON DELETE SET NULL,
    service_order_code VARCHAR(64) NOT NULL DEFAULT '',
    category VARCHAR(64) NOT NULL DEFAULT 'general',
    created_by VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drive_files_tenant ON drive_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_google_id ON drive_files(google_file_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_client ON drive_files(client_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_order ON drive_files(service_order_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_parent ON drive_files(parent_folder_id);

CREATE TABLE IF NOT EXISTS drive_folders (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    google_folder_id VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_google_folder_id VARCHAR(128),
    client_id VARCHAR(64) REFERENCES clients(id) ON DELETE SET NULL,
    service_order_id VARCHAR(64) REFERENCES service_orders(id) ON DELETE SET NULL,
    folder_type VARCHAR(64) NOT NULL DEFAULT 'custom',
    web_view_link TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drive_folders_tenant ON drive_folders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drive_folders_google_id ON drive_folders(google_folder_id);
CREATE INDEX IF NOT EXISTS idx_drive_folders_client ON drive_folders(client_id);
CREATE INDEX IF NOT EXISTS idx_drive_folders_order ON drive_folders(service_order_id);

CREATE TABLE IF NOT EXISTS drive_folder_blueprints (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    module VARCHAR(64) NOT NULL DEFAULT 'general',
    structure JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drive_blueprints_tenant ON drive_folder_blueprints(tenant_id);

-- =============================================================================
-- 18. TABLA DE NOTIFICACIONES MULTITENANT
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'info',
    module VARCHAR(64) NOT NULL DEFAULT 'general',
    entity_id VARCHAR(64),
    action VARCHAR(64),
    link TEXT,
    actor_user_id VARCHAR(64),
    actor_user_name VARCHAR(180),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_read ON notifications(tenant_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(tenant_id, created_at DESC);

-- =============================================================================
-- 19. TABLA DE SUSCRIPCIONES PUSH WEB / PWA
-- =============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_sub_tenant ON push_subscriptions(tenant_id);





