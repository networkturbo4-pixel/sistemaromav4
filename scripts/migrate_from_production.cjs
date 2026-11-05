const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

const SQL_FILE = 'C:/Users/CESAR/Downloads/iqxalgre_saasroma.sql';
const DB_FILE = path.resolve(__dirname, '../data/roma-saas-db.json');
const TENANT_ID = 'tenant-roma-01';

function parseSqlValues(line) {
  const rows = [];
  let inString = false;
  let escape = false;
  let currentVal = '';
  let currentRow = [];
  let insideTuple = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (escape) {
      currentVal += ch;
      escape = false;
      continue;
    }

    if (ch === '\\') {
      escape = true;
      continue;
    }

    if (ch === "'") {
      inString = !inString;
      continue;
    }

    if (inString) {
      currentVal += ch;
      continue;
    }

    if (ch === '(' && !insideTuple) {
      insideTuple = true;
      currentRow = [];
      currentVal = '';
      continue;
    }

    if (ch === ')' && insideTuple) {
      currentRow.push(cleanVal(currentVal));
      rows.push(currentRow);
      currentRow = [];
      currentVal = '';
      insideTuple = false;
      continue;
    }

    if (ch === ',' && insideTuple) {
      currentRow.push(cleanVal(currentVal));
      currentVal = '';
      continue;
    }

    if (insideTuple) {
      currentVal += ch;
    }
  }

  return rows;
}

function cleanVal(val) {
  const trimmed = val.trim();
  if (trimmed === 'NULL') return null;
  if (trimmed === 'TRUE' || trimmed === 'true') return true;
  if (trimmed === 'FALSE' || trimmed === 'false') return false;
  if (!isNaN(trimmed) && trimmed !== '') {
    if (trimmed.includes('.')) return parseFloat(trimmed);
    return parseInt(trimmed, 10);
  }
  return trimmed;
}

function tryParseJson(str, defaultVal = null) {
  if (!str) return defaultVal;
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultVal;
  }
}

function normalizeUrl(url) {
  if (!url) return undefined;
  if (Array.isArray(url)) {
    url = url[0];
  }
  if (typeof url !== 'string') return undefined;
  let parsed = tryParseJson(url);
  if (Array.isArray(parsed) && parsed.length > 0) {
    url = parsed[0];
  }
  if (!url || typeof url !== 'string') return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (!url.startsWith('/')) {
    return '/' + url;
  }
  return url;
}

function mapPlatform(str) {
  if (!str) return ['instagram', 'facebook'];
  const lower = str.toLowerCase();
  const platforms = [];
  if (lower.includes('insta')) platforms.push('instagram');
  if (lower.includes('face')) platforms.push('facebook');
  if (lower.includes('tik')) platforms.push('tiktok');
  if (lower.includes('link')) platforms.push('linkedin');
  if (lower.includes('you')) platforms.push('youtube');
  if (lower.includes('x') || lower.includes('twit')) platforms.push('x');
  return platforms.length ? platforms : ['instagram'];
}

function mapStatus(str) {
  if (!str) return 'idea';
  const lower = str.toLowerCase();
  if (lower.includes('aprob') || lower.includes('approved')) return 'approved';
  if (lower.includes('publi') || lower.includes('published')) return 'published';
  if (lower.includes('revis') || lower.includes('review')) return 'review';
  if (lower.includes('dise') || lower.includes('design')) return 'design';
  if (lower.includes('redac') || lower.includes('writing')) return 'writing';
  return 'idea';
}

function mapFormat(str) {
  if (!str) return 'post';
  const lower = str.toLowerCase();
  if (lower.includes('reel') || lower.includes('video') || lower.includes('tiktok')) return 'reel';
  if (lower.includes('carrusel') || lower.includes('carousel')) return 'carousel';
  if (lower.includes('historia') || lower.includes('story')) return 'story';
  if (lower.includes('ad') || lower.includes('pauta')) return 'ad';
  return 'post';
}

async function migrate() {
  console.log('🚀 Iniciando proceso de migración desde producción (romaagencia.lat)...');

  if (!fs.existsSync(SQL_FILE)) {
    console.error('❌ Archivo SQL no encontrado en:', SQL_FILE);
    process.exit(1);
  }

  // Backup current DB
  if (fs.existsSync(DB_FILE)) {
    const backupPath = DB_FILE.replace('.json', `.backup-${Date.now()}.json`);
    fs.copyFileSync(DB_FILE, backupPath);
    console.log('💾 Backup de base actual guardado en:', backupPath);
  }

  const rawDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  // Parse SQL
  console.log('📖 Leyendo y analizando archivo SQL:', SQL_FILE);
  const rl = readline.createInterface({
    input: fs.createReadStream(SQL_FILE),
    crlfDelay: Infinity
  });

  const tableData = {};
  let currentTable = null;
  let columns = [];

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO')) {
      const match = line.match(/^INSERT INTO `([^`]+)` \(([^)]+)\) VALUES/);
      if (match) {
        currentTable = match[1];
        columns = match[2].split(',').map(c => c.trim().replace(/`/g, ''));
        tableData[currentTable] = tableData[currentTable] || { columns, rows: [] };
      }
    } else if (currentTable) {
      const parsedRows = parseSqlValues(line);
      for (const row of parsedRows) {
        const rowObj = {};
        columns.forEach((col, idx) => {
          rowObj[col] = row[idx];
        });
        tableData[currentTable].rows.push(rowObj);
      }
      if (line.trim().endsWith(';')) {
        currentTable = null;
      }
    }
  }

  console.log('✅ Archivo SQL parseado con éxito!');

  // 1. Mapear Clientes
  const clientsMap = new Map();
  const clientsList = [];
  if (tableData.clients?.rows) {
    for (const r of tableData.clients.rows) {
      const id = `client-${r.id}`;
      const c = {
        id,
        tenantId: TENANT_ID,
        name: r.name || 'Sin Nombre',
        companyName: r.name || '',
        whatsapp: r.whatsapp || '',
        email: r.email || '',
        status: r.status === 0 ? 'inactive' : 'active',
        notes: r.notes || '',
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.created_at || new Date().toISOString(),
      };
      clientsMap.set(String(r.id), c);
      clientsList.push(c);
    }
  }
  console.log(`📦 Clientes transformados: ${clientsList.length}`);

  // 2. Mapear Marcas
  const brandsMap = new Map();
  const brandsList = [];
  if (tableData.client_brands?.rows) {
    for (const r of tableData.client_brands.rows) {
      const id = `brand-${r.id}`;
      const client = clientsMap.get(String(r.client_id));
      const b = {
        id,
        tenantId: TENANT_ID,
        clientId: client ? client.id : `client-${r.client_id}`,
        name: r.name || '',
        logoUrl: normalizeUrl(r.logo),
        whatsappGroup: r.whatsapp_group || undefined,
        colors: tryParseJson(r.colors, []),
        isActive: r.is_active !== 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      brandsMap.set(String(r.id), b);
      brandsList.push(b);
    }
  }
  console.log(`📦 Marcas transformadas: ${brandsList.length}`);

  // 3. Mapear Órdenes de Servicio
  const ordersMap = new Map();
  const ordersList = [];
  if (tableData.work_orders?.rows) {
    for (const r of tableData.work_orders.rows) {
      const id = `order-${r.id}`;
      const parsedData = tryParseJson(r.data, {});
      const o = {
        id,
        tenantId: TENANT_ID,
        code: r.correlativo || `OS-2026-${String(r.id).padStart(3, '0')}`,
        title: r.brand_name ? `Campaña ${r.brand_name}` : `Orden ${r.correlativo}`,
        brandName: r.brand_name || '',
        clientId: parsedData.client_id ? `client-${parsedData.client_id}` : undefined,
        clientName: parsedData.client_name || r.brand_name || 'Cliente',
        companyName: parsedData.company_name || r.brand_name || '',
        publicToken: r.public_token || crypto.randomBytes(16).toString('hex'),
        status: r.status || 'active',
        totalAmount: Number(parsedData.total_amount || 0),
        currency: parsedData.currency || 'PEN',
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.created_at || new Date().toISOString(),
      };
      ordersMap.set(String(r.id), o);
      ordersList.push(o);
    }
  }
  console.log(`📦 Órdenes de Servicio transformadas: ${ordersList.length}`);

  // 4. Mapear Proyectos
  const projectsMap = new Map();
  const projectsList = [];
  if (tableData.projects?.rows) {
    for (const r of tableData.projects.rows) {
      const id = `proj-${r.id}`;
      const matchingOrder = ordersMap.get(String(r.work_order_id));
      const brandName = matchingOrder?.brandName || `Proyecto ${r.id}`;
      const p = {
        id,
        tenantId: TENANT_ID,
        serviceOrderId: matchingOrder ? matchingOrder.id : undefined,
        serviceOrderCode: matchingOrder ? matchingOrder.code : undefined,
        serviceOrderToken: matchingOrder ? matchingOrder.publicToken : undefined,
        name: brandName,
        clientId: matchingOrder?.clientId || 'client-general',
        clientName: matchingOrder?.clientName || brandName,
        companyName: matchingOrder?.companyName || brandName,
        brandName: brandName,
        status: r.status === 'archived' ? 'archived' : 'active',
        driveFolderId: r.drive_folder_id || undefined,
        driveFolderLink: r.drive_folder_link || undefined,
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.created_at || new Date().toISOString(),
      };
      projectsMap.set(String(r.id), p);
      projectsList.push(p);
    }
  }
  console.log(`📦 Proyectos transformados: ${projectsList.length}`);

  // 5. Mapear Meses de Campaña
  const monthsMap = new Map();
  const monthsList = [];
  if (tableData.project_months?.rows) {
    for (const r of tableData.project_months.rows) {
      const id = `month-${r.id}`;
      const project = projectsMap.get(String(r.project_id));
      const m = {
        id,
        tenantId: TENANT_ID,
        projectId: project ? project.id : `proj-${r.project_id}`,
        name: r.name || `Mes ${r.month} ${r.year}`,
        month: Number(r.month) || 1,
        year: Number(r.year) || 2026,
        startDate: r.start_date ? String(r.start_date).substring(0, 10) : '2026-01-01',
        endDate: r.end_date ? String(r.end_date).substring(0, 10) : '2026-01-31',
        status: r.status === 'completed' ? 'completed' : 'in_progress',
        driveFolderId: r.drive_folder_id || undefined,
        driveFolderLink: r.drive_folder_link || undefined,
        publicToken: r.public_token || crypto.randomBytes(16).toString('hex'),
        requirePin: Boolean(r.require_pin),
        publicPin: r.public_pin || undefined,
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.created_at || new Date().toISOString(),
      };
      monthsMap.set(String(r.id), m);
      monthsList.push(m);
    }
  }
  console.log(`📦 Meses transformados: ${monthsList.length}`);

  // 6. Mapear Publicaciones (Grilla)
  const postsList = [];
  if (tableData.month_posts?.rows) {
    for (const r of tableData.month_posts.rows) {
      const id = `post-${r.id}`;
      const month = monthsMap.get(String(r.month_id));
      const project = month ? projectsMap.get(month.projectId.replace('proj-', '')) : null;

      // QA Checklist
      const rawQa = tryParseJson(r.qa_checklist, {});
      const qaChecklist = {
        spelling: Boolean(rawQa.spelling),
        logoIdentity: Boolean(rawQa.brand || rawQa.logoIdentity),
        formatResolution: Boolean(rawQa.format || rawQa.formatResolution),
        ctaLinks: Boolean(rawQa.cta || rawQa.ctaLinks),
      };

      // Hitos / Milestones
      const rawVariations = tryParseJson(r.variations, []);
      const milestones = Array.isArray(rawVariations)
        ? rawVariations.map((v, idx) => ({
            id: v.id || `m-${idx + 1}`,
            stepNumber: idx + 1,
            title: v.title || `Avance #${idx + 1}`,
            completed: Boolean(v.completed),
            description: v.description || '',
            attachments: Array.isArray(v.attachments)
              ? v.attachments.map((att) => ({
                  name: att.name || 'archivo',
                  url: normalizeUrl(att.url) || att.url,
                  driveFileId: att.driveFileId,
                }))
              : [],
          }))
        : [];

      const post = {
        id,
        tenantId: TENANT_ID,
        projectId: month ? month.projectId : undefined,
        monthId: month ? month.id : `month-${r.month_id}`,
        clientId: project?.clientId || 'client-general',
        clientName: project?.clientName || 'Cliente',
        brandName: project?.brandName || '',
        title: r.concept || 'Publicación',
        platforms: mapPlatform(r.platform),
        format: mapFormat(r.post_type),
        copy: r.copy_text || '',
        status: mapStatus(r.status),
        contentPillar: r.content_pillar || 'Educación',
        scheduledDate: r.post_date ? String(r.post_date).substring(0, 10) : (r.created_at ? String(r.created_at).substring(0, 10) : '2026-11-01'),
        initialDate: r.post_date ? String(r.post_date).substring(0, 10) : undefined,
        deliveryDate: r.end_date ? String(r.end_date).substring(0, 10) : undefined,
        referenceMediaUrl: normalizeUrl(r.reference_image_link || r.visual_references),
        finalArtMediaUrl: normalizeUrl(r.image_link),
        mediaUrl: normalizeUrl(r.image_link) || normalizeUrl(r.reference_image_link),
        designerBrief: r.design_brief || undefined,
        paintData: r.paint_data || r.drawing_data || undefined,
        presenterNotes: r.presenter_notes || undefined,
        qaChecklist,
        milestones,
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString(),
      };

      postsList.push(post);
    }
  }
  console.log(`📦 Publicaciones transformadas: ${postsList.length}`);

  // Fusionar con la base de datos de v4
  rawDb.clients = clientsList;
  rawDb.clientBrands = brandsList;
  rawDb.serviceOrders = ordersList;
  rawDb.workspaceProjects = projectsList;
  rawDb.workspaceMonths = monthsList;
  rawDb.workspacePosts = postsList;

  fs.writeFileSync(DB_FILE, JSON.stringify(rawDb, null, 2), 'utf8');
  console.log(`\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE EN: ${DB_FILE}`);
  console.log('----------------------------------------------------');
  console.log(`✨ Total Clientes: ${clientsList.length}`);
  console.log(`✨ Total Marcas: ${brandsList.length}`);
  console.log(`✨ Total Órdenes de Servicio: ${ordersList.length}`);
  console.log(`✨ Total Proyectos en Workspace: ${projectsList.length}`);
  console.log(`✨ Total Meses de Campaña: ${monthsList.length}`);
  console.log(`✨ Total Publicaciones en Grilla: ${postsList.length}`);
  console.log('----------------------------------------------------\n');
}

migrate().catch(console.error);
