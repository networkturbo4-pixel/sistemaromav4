const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/roma-saas-db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Sanitize Clients
if (Array.isArray(db.clients)) {
  db.clients = db.clients.map((c) => ({
    ...c,
    name: String(c.name || 'Sin Nombre'),
    companyName: String(c.companyName || c.name || ''),
    documentType: c.documentType || 'DNI',
    documentNumber: String(c.documentNumber || ''),
    whatsapp: String(c.whatsapp || ''),
    email: c.email ? String(c.email) : null,
    notes: String(c.notes || ''),
    status: c.status === 'inactive' ? 'inactive' : 'active',
  }));
}

// Sanitize Brands
if (Array.isArray(db.clientBrands)) {
  db.clientBrands = db.clientBrands.map((b) => ({
    ...b,
    name: String(b.name || 'Marca'),
    whatsappGroup: b.whatsappGroup ? String(b.whatsappGroup) : undefined,
    industry: String(b.industry || ''),
    socialHandle: String(b.socialHandle || ''),
    logoUrl: b.logoUrl ? String(b.logoUrl) : undefined,
    colors: Array.isArray(b.colors) ? b.colors : [],
    isActive: Boolean(b.isActive),
  }));
}

// Sanitize Projects
if (Array.isArray(db.workspaceProjects)) {
  db.workspaceProjects = db.workspaceProjects.map((p) => ({
    ...p,
    name: String(p.name || 'Proyecto'),
    clientName: String(p.clientName || 'Cliente'),
    brandName: String(p.brandName || ''),
    serviceOrderCode: p.serviceOrderCode ? String(p.serviceOrderCode) : undefined,
  }));
}

// Sanitize Months
if (Array.isArray(db.workspaceMonths)) {
  db.workspaceMonths = db.workspaceMonths.map((m) => ({
    ...m,
    name: String(m.name || 'Mes'),
    month: Number(m.month) || 1,
    year: Number(m.year) || 2026,
    startDate: String(m.startDate || '2026-01-01'),
    endDate: String(m.endDate || '2026-01-31'),
    status: m.status || 'in_progress',
  }));
}

// Sanitize Posts
if (Array.isArray(db.workspacePosts)) {
  db.workspacePosts = db.workspacePosts.map((p) => ({
    ...p,
    title: String(p.title || 'Publicación'),
    copy: String(p.copy || ''),
    platforms: Array.isArray(p.platforms) ? p.platforms : ['instagram'],
    format: p.format || 'post',
    status: p.status || 'idea',
    contentPillar: String(p.contentPillar || 'Educación'),
    scheduledDate: String(p.scheduledDate || '2026-11-01'),
  }));
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('✅ Base de datos sanitizada correctamente con tipos estrictos garantizados.');
