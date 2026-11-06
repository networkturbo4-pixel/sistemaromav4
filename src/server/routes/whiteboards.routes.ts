import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  AuthenticatedRequest,
  requireAuth,
} from '../middleware/auth';
import { db } from '../db';
import { googleDriveService } from '../services/googleDriveService';
import { WhiteboardAccessType, WhiteboardPublicRole } from '../../shared/types';

const router = Router();

// Multer storage for whiteboard media uploads
const whiteboardUploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve(process.cwd(), 'uploads', 'whiteboards');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `wb-${unique}${ext}`);
  },
});

const upload = multer({
  storage: whiteboardUploadStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// =============================================================================
// CARPETAS DE PIZARRAS
// =============================================================================

// GET /api/workspace/whiteboards/folders
router.get('/folders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }
    const folders = await db.getWhiteboardFolders(tenantId);
    return res.json({ success: true, folders });
  } catch (error: any) {
    console.error('Error fetching whiteboard folders:', error);
    return res.status(500).json({ error: error.message || 'Error al listar carpetas' });
  }
});

// POST /api/workspace/whiteboards/folders
router.post('/folders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const userId = req.auth?.user?.id || 'usr-system';
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }
    const { name, color } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'El nombre de la carpeta es requerido' });
    }
    const folder = await db.createWhiteboardFolder(tenantId, { name, color }, userId);
    return res.status(201).json({ success: true, folder });
  } catch (error: any) {
    console.error('Error creating whiteboard folder:', error);
    return res.status(500).json({ error: error.message || 'Error al crear carpeta' });
  }
});

// PUT /api/workspace/whiteboards/folders/:folderId
router.put('/folders/:folderId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }
    const folderId = req.params.folderId as string;
    const { name, color } = req.body;
    const folder = await db.updateWhiteboardFolder(folderId, tenantId, { name, color });
    if (!folder) {
      return res.status(404).json({ error: 'Carpeta no encontrada' });
    }
    return res.json({ success: true, folder });
  } catch (error: any) {
    console.error('Error updating whiteboard folder:', error);
    return res.status(500).json({ error: error.message || 'Error al actualizar carpeta' });
  }
});

// DELETE /api/workspace/whiteboards/folders/:folderId
router.delete('/folders/:folderId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }
    const folderId = req.params.folderId as string;
    const ok = await db.deleteWhiteboardFolder(folderId, tenantId);
    return res.json({ success: ok });
  } catch (error: any) {
    console.error('Error deleting whiteboard folder:', error);
    return res.status(500).json({ error: error.message || 'Error al eliminar carpeta' });
  }
});

// =============================================================================
// LISTAR Y GESTIONAR PIZARRAS (CRUD)
// =============================================================================

// GET /api/workspace/whiteboards
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const userId = req.auth?.user?.id;
    const isAdmin = req.auth?.user?.roleId === 'role-admin';

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }

    const { folderId, search, tag } = req.query;

    const list = await db.getWhiteboards(
      tenantId,
      {
        folderId: typeof folderId === 'string' ? folderId : undefined,
        search: typeof search === 'string' ? search : undefined,
        tag: typeof tag === 'string' ? tag : undefined,
      },
      userId,
      isAdmin
    );

    return res.json({ success: true, whiteboards: list });
  } catch (error: any) {
    console.error('Error fetching whiteboards:', error);
    return res.status(500).json({ error: error.message || 'Error al obtener pizarras' });
  }
});

// POST /api/workspace/whiteboards
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const user = req.auth?.user;
    if (!tenantId || !user) {
      return res.status(401).json({ error: 'Usuario o tenant no especificado' });
    }

    const { title, folderId, tags, profilePic, accessType, publicRole, initialInvites } = req.body;

    const board = await db.createWhiteboard(
      tenantId,
      {
        title: title || 'Pizarra Creativa',
        folderId,
        tags,
        profilePic,
        accessType,
        publicRole,
        initialInvites,
      },
      user.id,
      user.name,
      (user as any).avatar || ''
    );

    return res.status(201).json({ success: true, whiteboard: board });
  } catch (error: any) {
    console.error('Error creating whiteboard:', error);
    return res.status(500).json({ error: error.message || 'Error al crear pizarra' });
  }
});

// GET /api/workspace/whiteboards/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const id = req.params.id as string;
    const board = await db.getWhiteboardById(id, tenantId);
    if (!board) {
      return res.status(404).json({ error: 'Pizarra no encontrada' });
    }
    return res.json({ success: true, whiteboard: board });
  } catch (error: any) {
    console.error('Error getting whiteboard by id:', error);
    return res.status(500).json({ error: error.message || 'Error al obtener pizarra' });
  }
});

// PUT /api/workspace/whiteboards/:id
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const id = req.params.id as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }

    const updated = await db.updateWhiteboard(id, tenantId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Pizarra no encontrada' });
    }
    return res.json({ success: true, whiteboard: updated });
  } catch (error: any) {
    console.error('Error updating whiteboard:', error);
    return res.status(500).json({ error: error.message || 'Error al actualizar pizarra' });
  }
});

// PUT /api/workspace/whiteboards/:id/canvas (AUTOSAVE & MANUAL SAVE)
router.put('/:id/canvas', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const id = req.params.id as string;
    const { content, thumbnail } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }

    const ok = await db.saveWhiteboardCanvas(id, tenantId, content, thumbnail);
    if (!ok) {
      return res.status(404).json({ error: 'No se pudo guardar el canvas' });
    }
    return res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error saving whiteboard canvas:', error);
    return res.status(500).json({ error: error.message || 'Error al guardar canvas' });
  }
});

// DELETE /api/workspace/whiteboards/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const id = req.params.id as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }
    const ok = await db.deleteWhiteboard(id, tenantId);
    return res.json({ success: ok });
  } catch (error: any) {
    console.error('Error deleting whiteboard:', error);
    return res.status(500).json({ error: error.message || 'Error al eliminar pizarra' });
  }
});

// POST /api/workspace/whiteboards/:id/duplicate
router.post('/:id/duplicate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const user = req.auth?.user;
    const id = req.params.id as string;
    if (!tenantId || !user) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const copy = await db.duplicateWhiteboard(id, tenantId, user.id, user.name);
    if (!copy) {
      return res.status(404).json({ error: 'Pizarra original no encontrada' });
    }
    return res.status(201).json({ success: true, whiteboard: copy });
  } catch (error: any) {
    console.error('Error duplicating whiteboard:', error);
    return res.status(500).json({ error: error.message || 'Error al duplicar pizarra' });
  }
});

// =============================================================================
// COMPARTIR Y ACCESOS
// =============================================================================

// GET /api/workspace/whiteboards/:id/share
router.get('/:id/share', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const id = req.params.id as string;
    const board = await db.getWhiteboardById(id, tenantId);
    if (!board) {
      return res.status(404).json({ error: 'Pizarra no encontrada' });
    }

    // Listar usuarios del tenant para selector
    const users = (await db.getUsersByTenant(tenantId || '')) || [];

    return res.json({
      success: true,
      data: {
        id: board.id,
        title: board.title,
        accessType: board.accessType,
        publicRole: board.publicRole,
        shareToken: board.shareToken,
        assignedUsers: board.assignedUsers || [],
        invitations: board.invitations || [],
        availableUsers: users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: (u as any).avatar || '',
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching share info:', error);
    return res.status(500).json({ error: error.message || 'Error al obtener datos para compartir' });
  }
});

// PUT /api/workspace/whiteboards/:id/share
router.put('/:id/share', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const id = req.params.id as string;
    const { accessType, publicRole, assignedUsers, invitations } = req.body;

    const board = await db.getWhiteboardById(id, tenantId);
    if (!board) {
      return res.status(404).json({ error: 'Pizarra no encontrada' });
    }

    const updated = await db.updateWhiteboard(id, tenantId || '', {
      accessType: (accessType as WhiteboardAccessType) || board.accessType,
      publicRole: (publicRole as WhiteboardPublicRole) || board.publicRole,
      assignedUsers: assignedUsers || board.assignedUsers,
      invitations: invitations || board.invitations,
    });

    return res.json({ success: true, whiteboard: updated });
  } catch (error: any) {
    console.error('Error updating share configuration:', error);
    return res.status(500).json({ error: error.message || 'Error al actualizar configuración compartida' });
  }
});

// =============================================================================
// SUBIDA DE ARCHIVOS / ASSETS PARA EL LIENZO (IMAGEN, STICKY, MEDIA)
// =============================================================================

// POST /api/workspace/whiteboards/upload-asset
router.post(
  '/upload-asset',
  requireAuth,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
      }

      const relativeUrl = `/uploads/whiteboards/${req.file.filename}`;
      let driveId: string | undefined = undefined;

      // Subida opcional a Google Drive en segundo plano si está disponible
      if (googleDriveService.isReady()) {
        try {
          const rootFolderId = googleDriveService.getRootFolderId();
          const stream = fs.createReadStream(req.file.path);
          const driveUpload = await googleDriveService.uploadStream({
            fileName: req.file.filename,
            mimeType: req.file.mimetype,
            stream,
            parentFolderId: rootFolderId,
          });
          if (driveUpload && driveUpload.id) {
            driveId = driveUpload.id;
          }
        } catch (driveErr) {
          console.warn('Drive upload failed, using local asset:', driveErr);
        }
      }

      return res.json({
        success: true,
        url: relativeUrl,
        driveId,
        fileName: req.file.originalname,
        size: req.file.size,
      });
    } catch (error: any) {
      console.error('Error uploading whiteboard asset:', error);
      return res.status(500).json({ error: error.message || 'Error al subir asset de pizarra' });
    }
  }
);

export default router;
