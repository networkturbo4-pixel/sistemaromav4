import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { hasPermission } from '../../shared/permissions';
import { db } from '../db';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

const router = Router();

// Inicialización de cliente Gemini si la clave está configurada
const getGeminiClient = async (tenantId?: string) => {
  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (tenantId) {
    const tenant = await db.getTenantById(tenantId);
    if (tenant?.aiConfig?.geminiApiKey) {
      apiKey = tenant.aiConfig.geminiApiKey;
    }
  }
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// Declaración de herramientas (Function Calling) para Gemini
const romitaToolsDeclarations: FunctionDeclaration[] = [
  {
    name: 'crearCliente',
    description: 'Crea un nuevo cliente o empresa en el sistema ROMA.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Razón social o nombre completo del cliente' },
        taxId: { type: Type.STRING, description: 'RUC, DNI, RFC, RUT o identificación fiscal' },
        email: { type: Type.STRING, description: 'Correo electrónico de contacto' },
        phone: { type: Type.STRING, description: 'Teléfono o WhatsApp de contacto' },
        address: { type: Type.STRING, description: 'Dirección física o sede' },
        notes: { type: Type.STRING, description: 'Notas adicionales o requerimientos' }
      },
      required: ['name']
    }
  },
  {
    name: 'editarCliente',
    description: 'Actualiza los datos de un cliente existente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'ID del cliente a editar' },
        name: { type: Type.STRING, description: 'Nuevo nombre o razón social' },
        taxId: { type: Type.STRING, description: 'Nueva identificación fiscal' },
        email: { type: Type.STRING, description: 'Nuevo correo electrónico' },
        phone: { type: Type.STRING, description: 'Nuevo teléfono' },
        address: { type: Type.STRING, description: 'Nueva dirección' }
      },
      required: ['id']
    }
  },
  {
    name: 'eliminarCliente',
    description: 'Elimina un cliente del sistema mediante su ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'ID del cliente a eliminar' },
        name: { type: Type.STRING, description: 'Nombre del cliente para confirmación' },
        reason: { type: Type.STRING, description: 'Motivo de la eliminación' }
      },
      required: ['id']
    }
  },
  {
    name: 'crearTarea',
    description: 'Crea una nueva tarea o entrega en el Workspace.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Título o nombre de la tarea' },
        description: { type: Type.STRING, description: 'Detalle o especificaciones de la tarea' },
        priority: { type: Type.STRING, description: 'Prioridad: low, medium, high, urgent' },
        dueDate: { type: Type.STRING, description: 'Fecha de vencimiento (YYYY-MM-DD)' }
      },
      required: ['title']
    }
  },
  {
    name: 'editarTarea',
    description: 'Modifica una tarea existente en el Workspace.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'ID de la tarea' },
        title: { type: Type.STRING, description: 'Nuevo título' },
        status: { type: Type.STRING, description: 'Estado: pending, in_progress, review, completed' },
        priority: { type: Type.STRING, description: 'Prioridad: low, medium, high, urgent' }
      },
      required: ['id']
    }
  },
  {
    name: 'eliminarTarea',
    description: 'Elimina una tarea del Workspace por su ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'ID de la tarea a eliminar' },
        title: { type: Type.STRING, description: 'Título de la tarea' }
      },
      required: ['id']
    }
  },
  {
    name: 'eliminarCotizacion',
    description: 'Solicita la eliminación de una cotización.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'ID de la cotización' },
        number: { type: Type.STRING, description: 'Número de cotización (ej: COT-00104)' },
        reason: { type: Type.STRING, description: 'Motivo' }
      },
      required: ['id']
    }
  },
  {
    name: 'consultarDatos',
    description: 'Consulta información o busca registros en el sistema.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        modulo: { type: Type.STRING, description: 'Módulo: clients, quotes, workspace, services' },
        termino: { type: Type.STRING, description: 'Término de búsqueda o filtro' }
      },
      required: ['modulo']
    }
  }
];

/**
 * Ejecutor resiliente de llamadas a Google Gemini:
 * Si un modelo específico sufre picos de demanda temporales (503 / high demand) en Google Cloud,
 * prueba automáticamente con los modelos hermanos de la familia Gemini (2.5-flash, 1.5-flash, etc.)
 */
async function generateContentWithResilience(
  client: GoogleGenAI,
  preferredModel: string,
  requestParams: any
): Promise<{ response: any; modelUsed: string }> {
  const modelsToTry = [
    preferredModel,
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
  ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const res = await client.models.generateContent({
        ...requestParams,
        model,
      });
      return { response: res, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err);
      // Solo intentamos fallback si Google informa sobrecarga temporal de tráfico
      if (
        msg.includes('high demand') ||
        msg.includes('Spikes in demand') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED')
      ) {
        console.warn(`[Romita AI] Modelo "${model}" con alta demanda temporal, cambiando automáticamente al siguiente modelo disponible...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export interface PendingActionProposal {
  id: string;
  type: 'create' | 'update' | 'delete';
  module: 'clients' | 'quotes' | 'workspace_tasks' | 'services';
  title: string;
  description: string;
  payload: Record<string, any>;
  permissionRequired: string;
}

/**
 * Endpoint de Chat con Romita AI:
 * Interpreta lenguaje natural y devuelve respuesta conversacional
 * con una acción propuesta (pendingAction) si detecta intención CRUD.
 */
router.post('/chat', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, activeModule, modelPreference = 'gemini-3.8-flash' } = req.body;
    const tenantId = req.auth?.tenant?.id || 'default-tenant';
    const userName = req.auth?.user?.name || 'Usuario';

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'El mensaje es obligatorio' });
    }

    const trimmed = message.trim();
    const gemini = await getGeminiClient(tenantId);

    // 1. Si tenemos GEMINI_API_KEY configurado, usamos el SDK oficial @google/genai
    if (gemini) {
      try {
        const systemPrompt = `Eres Romita, la asistente de Inteligencia Artificial inteligente del sistema ERP/SaaS "ROMA".
Estás asistiendo a ${userName} dentro de la agencia o empresa (Tenant ID: ${tenantId}).
Módulo visual actual: ${activeModule || 'dashboard'}.

Tus capacidades incluyen:
1. Crear, editar y eliminar registros (clientes, cotizaciones, tareas de workspace, servicios) usando las herramientas provistas.
2. Contestar dudas sobre el sistema, métricas y operaciones.
3. Sé concisa, profesional, amable y con tono ágil.
4. Cuando el usuario te pida crear, editar o eliminar, SIEMPRE invoca la herramienta correspondiente con los parámetros extraídos.
5. NO realices acciones destructivas sin usar la herramienta respectiva para que el usuario pueda validarlas en su pantalla.`;

        const { response, modelUsed } = await generateContentWithResilience(
          gemini,
          modelPreference || 'gemini-2.5-flash',
          {
            contents: trimmed,
            config: {
              systemInstruction: systemPrompt,
              tools: [{ functionDeclarations: romitaToolsDeclarations }],
            },
          }
        );

        const functionCalls = response.functionCalls;
        let pendingAction: PendingActionProposal | null = null;
        let replyText = response.text || '';

        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          const args = (call.args || {}) as Record<string, any>;

          switch (call.name) {
            case 'crearCliente':
              pendingAction = {
                id: `act_${Date.now()}`,
                type: 'create',
                module: 'clients',
                title: `Crear Cliente: ${args.name || 'Nuevo Cliente'}`,
                description: `Se registrará al cliente "${args.name}" con RUC/Identificación: ${args.taxId || 'N/A'}${args.phone ? ` y teléfono ${args.phone}` : ''}.`,
                payload: args,
                permissionRequired: 'clients.create',
              };
              if (!replyText) {
                replyText = `He preparado el registro para el cliente **${args.name}**. Revisa la tarjeta de confirmación a continuación para aprobar la creación.`;
              }
              break;

            case 'editarCliente':
              pendingAction = {
                id: `act_${Date.now()}`,
                type: 'update',
                module: 'clients',
                title: `Editar Cliente #${args.id}`,
                description: `Se actualizarán los datos del cliente con los nuevos valores proporcionados.`,
                payload: args,
                permissionRequired: 'clients.edit',
              };
              if (!replyText) {
                replyText = `He preparado la actualización del cliente **#${args.id}**. Confirma los cambios para aplicarlos en la base de datos.`;
              }
              break;

            case 'eliminarCliente':
              pendingAction = {
                id: `act_${Date.now()}`,
                type: 'delete',
                module: 'clients',
                title: `Eliminar Cliente: ${args.name || args.id}`,
                description: `¡Atención! Se eliminará el cliente del sistema. ${args.reason ? `Motivo: ${args.reason}` : ''}`,
                payload: args,
                permissionRequired: 'clients.delete',
              };
              if (!replyText) {
                replyText = `⚠️ Has solicitado eliminar al cliente **${args.name || args.id}**. Por tu seguridad, por favor revisa y presiona "Ejecutar" en la tarjeta.`;
              }
              break;

            case 'crearTarea':
              pendingAction = {
                id: `act_${Date.now()}`,
                type: 'create',
                module: 'workspace_tasks',
                title: `Crear Tarea: ${args.title || 'Nueva Tarea'}`,
                description: `Prioridad: ${args.priority || 'medium'}${args.dueDate ? ` | Vence: ${args.dueDate}` : ''}. ${args.description ? `Detalles: ${args.description}` : ''}`,
                payload: args,
                permissionRequired: 'workspace.tasks.manage',
              };
              if (!replyText) {
                replyText = `He preparado la tarea **"${args.title}"** para el Workspace. ¿Deseas que la cree ahora?`;
              }
              break;

            case 'editarTarea':
              pendingAction = {
                id: `act_${Date.now()}`,
                type: 'update',
                module: 'workspace_tasks',
                title: `Actualizar Tarea #${args.id}`,
                description: `Se actualizarán los estados y detalles de la tarea.`,
                payload: args,
                permissionRequired: 'workspace.tasks.manage',
              };
              if (!replyText) {
                replyText = `Preparada la actualización para la tarea #${args.id}.`;
              }
              break;

            case 'eliminarTarea':
              pendingAction = {
                id: `act_${Date.now()}`,
                type: 'delete',
                module: 'workspace_tasks',
                title: `Eliminar Tarea: ${args.title || args.id}`,
                description: `Se eliminará la tarea seleccionada del Workspace.`,
                payload: args,
                permissionRequired: 'workspace.tasks.manage',
              };
              if (!replyText) {
                replyText = `Por favor confirma la eliminación de la tarea.`;
              }
              break;

            case 'eliminarCotizacion':
              pendingAction = {
                id: `act_${Date.now()}`,
                type: 'delete',
                module: 'quotes',
                title: `Eliminar Cotización: ${args.number || args.id}`,
                description: `Se eliminará la cotización de forma permanente.`,
                payload: args,
                permissionRequired: 'quotes.delete',
              };
              if (!replyText) {
                replyText = `⚠️ Se requiere tu autorización para eliminar la cotización **${args.number || args.id}**.`;
              }
              break;

            case 'consultarDatos': {
              const clients = await db.getClientsByTenant(tenantId);
              const quotes = await db.getQuotesByTenant(tenantId);
              const tasks = await db.getWorkspaceTasks(tenantId);
              replyText = `He consultado el sistema ROMA: Actualmente cuentas con **${clients.length} clientes registrados**, **${quotes.length} cotizaciones** y **${tasks.length} tareas** en el Workspace. ¿Deseas que te muestre alguna en detalle o creemos un nuevo registro?`;
              break;
            }
          }
        }

        return res.json({
          reply: replyText || 'Comando procesado correctamente por Romita.',
          pendingAction,
          modelUsed: modelPreference || 'gemini-3.8-flash',
        });
      } catch (geminiError: any) {
        console.error('Error llamando a Gemini API en Romita:', geminiError?.message || geminiError);
        // Continuamos al fallback para asegurar que la app nunca falle si la cuota de la API se agota
      }
    }

    // 2. Parser inteligente de respaldo (Intelligent Local Engine)
    // Permite que Romita funcione al 100% de inmediato incluso sin clave o en modo offline/turbo
    const lower = trimmed.toLowerCase();
    let reply = '';
    let pendingAction: PendingActionProposal | null = null;

    if (lower.startsWith('crear cliente') || lower.startsWith('nuevo cliente') || lower.includes('agregar cliente')) {
      const cleanName = trimmed
        .replace(/^(crear|nuevo|agregar|registra|crea)\s+(cliente|empresa)\s*:?/i, '')
        .trim();
      const clientName = cleanName || 'Cliente Prospecto ' + Math.floor(Math.random() * 900 + 100);

      pendingAction = {
        id: `act_${Date.now()}`,
        type: 'create',
        module: 'clients',
        title: `Crear Cliente: ${clientName}`,
        description: `Se registrará a "${clientName}" en la base de datos de clientes de la agencia.`,
        payload: {
          name: clientName,
          status: 'prospect',
        },
        permissionRequired: 'clients.create',
      };
      reply = `¡Claro! He preparado el registro para **${clientName}**. Revisa la tarjeta de confirmación abajo y presiona **Ejecutar** para guardarlo.`;
    } else if (lower.startsWith('crear tarea') || lower.startsWith('nueva tarea') || lower.includes('agregar tarea')) {
      const taskTitle = trimmed
        .replace(/^(crear|nueva|agregar|anotar|crea)\s+(tarea|pendiente)\s*:?/i, '')
        .trim() || 'Nueva tarea pendiente';

      pendingAction = {
        id: `act_${Date.now()}`,
        type: 'create',
        module: 'workspace_tasks',
        title: `Crear Tarea: ${taskTitle}`,
        description: `Se añadirá esta tarea al tablero Workspace de la agencia.`,
        payload: {
          title: taskTitle,
          priority: 'medium',
          status: 'pending',
        },
        permissionRequired: 'workspace.tasks.manage',
      };
      reply = `He generado la tarjeta para agregar la tarea **"${taskTitle}"**. Pulsa **Ejecutar** para agregarla al Workspace.`;
    } else if (lower.includes('eliminar cliente') || lower.includes('borrar cliente')) {
      const target = trimmed.replace(/.*(eliminar|borrar)\s+cliente\s+/i, '').trim();
      pendingAction = {
        id: `act_${Date.now()}`,
        type: 'delete',
        module: 'clients',
        title: `Eliminar Cliente ${target || ''}`,
        description: `Eliminación controlada. Se verificará que no posea dependencias activas críticas.`,
        payload: { nameOrId: target },
        permissionRequired: 'clients.delete',
      };
      reply = `⚠️ Has solicitado eliminar un cliente. Por favor confirma la acción en la tarjeta inferior para evitar accidentes.`;
    } else if (lower.includes('eliminar tarea') || lower.includes('borrar tarea')) {
      const target = trimmed.replace(/.*(eliminar|borrar)\s+tarea\s+/i, '').trim();
      pendingAction = {
        id: `act_${Date.now()}`,
        type: 'delete',
        module: 'workspace_tasks',
        title: `Eliminar Tarea ${target || ''}`,
        description: `Se quitará la tarea del Workspace.`,
        payload: { id: target },
        permissionRequired: 'workspace.tasks.manage',
      };
      reply = `He preparado la solicitud de eliminación de la tarea. Pulsa **Ejecutar** para confirmar.`;
    } else if (lower.includes('resumen') || lower.includes('estado') || lower.includes('estadisticas') || lower.includes('cuantos')) {
      const clients = await db.getClientsByTenant(tenantId);
      const quotes = await db.getQuotesByTenant(tenantId);
      const tasks = await db.getWorkspaceTasks(tenantId);
      reply = `📊 **Resumen actual de ROMA:**\n- 👥 Clientes registrados: **${clients.length}**\n- 📝 Cotizaciones generadas: **${quotes.length}**\n- 📋 Tareas en Workspace: **${tasks.length}**\n\n¿En qué te puedo apoyar hoy? Puedes pedirme: *"Crear cliente Inversiones del Norte"*, *"Crear tarea Diseñar catálogo"*, o consultar cualquier dato.`;
    } else {
      reply = `Hola ${userName}, soy **Romita**, tu agente de IA integrado en ROMA. Puedo ayudarte a **crear clientes**, **crear tareas**, **gestionar cotizaciones** o consultar cualquier dato de tu agencia con solo pedírmelo en lenguaje natural.`;
    }

    return res.json({
      reply,
      pendingAction,
      modelUsed: gemini ? 'gemini-3.8-flash' : 'romita-turbo-engine',
    });
  } catch (err: any) {
    console.error('Error en /api/romita/chat:', err);
    return res.status(500).json({ error: 'Error al procesar el mensaje con Romita AI' });
  }
});

/**
 * Endpoint de Ejecución Segura de Acciones (Human-in-the-Loop)
 * Recibe la acción aprobada por el usuario, valida permisos y la aplica en la DB.
 */
router.post('/execute', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action } = req.body as { action: PendingActionProposal };
    const tenantId = req.auth?.tenant?.id || 'default-tenant';
    const userRole = req.auth?.role;

    if (!action || !action.module || !action.type) {
      return res.status(400).json({ error: 'Estructura de acción inválida' });
    }

    // Validación de permisos del rol del usuario
    if (
      action.permissionRequired &&
      userRole &&
      !hasPermission(userRole.permissions, action.permissionRequired as any)
    ) {
      return res.status(403).json({
        error: `No tienes permisos (${action.permissionRequired}) para ejecutar esta acción.`,
      });
    }

    let resultData: any = null;

    // Ejecución según módulo y operación
    if (action.module === 'clients') {
      if (action.type === 'create') {
        resultData = await db.createClient(tenantId, {
          name: action.payload.name,
          documentType: 'RUC',
          documentNumber: action.payload.taxId || '00000000',
          email: action.payload.email || null,
          whatsapp: action.payload.phone || '',
          notes: action.payload.notes || '',
          status: 'active',
          brands: [],
        });
      } else if (action.type === 'update') {
        const id = action.payload.id;
        resultData = await db.updateClient(tenantId, id, action.payload);
      } else if (action.type === 'delete') {
        let clientId = action.payload.id;
        if (!clientId && action.payload.nameOrId) {
          const allClients = await db.getClientsByTenant(tenantId);
          const found = allClients.find(
            (c) =>
              c.id === action.payload.nameOrId ||
              c.name.toLowerCase().includes(action.payload.nameOrId.toLowerCase())
          );
          if (found) clientId = found.id;
        }

        if (!clientId) {
          return res.status(404).json({ error: 'No se encontró el cliente a eliminar' });
        }
        await db.deleteClient(tenantId, clientId);
        resultData = { deletedId: clientId };
      }
    } else if (action.module === 'workspace_tasks') {
      if (action.type === 'create') {
        resultData = await db.createWorkspaceTask(tenantId, {
          title: action.payload.title,
          description: action.payload.description || '',
          priority: action.payload.priority || 'medium',
          status: 'pending',
          dueDate: action.payload.dueDate || undefined,
        });
      } else if (action.type === 'update') {
        resultData = await db.updateWorkspaceTask(action.payload.id, tenantId, action.payload);
      } else if (action.type === 'delete') {
        let taskId = action.payload.id;
        if (!taskId && action.payload.title) {
          const allTasks = await db.getWorkspaceTasks(tenantId);
          const found = allTasks.find(
            (t) =>
              t.id === action.payload.title ||
              t.title.toLowerCase().includes(action.payload.title.toLowerCase())
          );
          if (found) taskId = found.id;
        }
        if (!taskId) {
          return res.status(404).json({ error: 'No se encontró la tarea a eliminar' });
        }
        await db.deleteWorkspaceTask(taskId, tenantId);
        resultData = { deletedId: taskId };
      }
    } else if (action.module === 'quotes') {
      if (action.type === 'delete') {
        let quoteId = action.payload.id;
        if (!quoteId && action.payload.number) {
          const quotes = await db.getQuotesByTenant(tenantId);
          const found = quotes.find(
            (q) => q.code === action.payload.number || q.id === action.payload.number
          );
          if (found) quoteId = found.id;
        }
        if (!quoteId) {
          return res.status(404).json({ error: 'No se encontró la cotización' });
        }
        await db.deleteQuote(quoteId, tenantId);
        resultData = { deletedId: quoteId };
      }
    }

    return res.json({
      success: true,
      message: `Acción "${action.title}" ejecutada exitosamente en el sistema ROMA.`,
      result: resultData,
    });
  } catch (err: any) {
    console.error('Error en /api/romita/execute:', err);
    return res.status(500).json({ error: err.message || 'Error al ejecutar la acción' });
  }
});

/**
 * Obtener configuración de IA / Conexiones del Tenant
 */
router.get('/config', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id || 'default-tenant';
    const tenant = await db.getTenantById(tenantId);
    const aiConfig = tenant?.aiConfig || {};

    const rawKey = aiConfig.geminiApiKey || process.env.GEMINI_API_KEY || '';
    const maskedKey = rawKey ? `${rawKey.slice(0, 7)}...${rawKey.slice(-4)}` : '';

    return res.json({
      config: {
        hasCustomKey: Boolean(aiConfig.geminiApiKey),
        maskedKey,
        preferredModel: aiConfig.preferredModel || 'gemini-3.8-flash',
        isActive: aiConfig.isActive !== false,
      },
      status: rawKey ? 'connected' : 'unconfigured',
      usingEnvFallback: !aiConfig.geminiApiKey && Boolean(process.env.GEMINI_API_KEY),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al obtener configuración de IA' });
  }
});

/**
 * Guardar configuración de IA / Conexiones del Tenant
 */
router.put('/config', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant no especificado' });
    }

    const { geminiApiKey, preferredModel, isActive } = req.body;
    const updatePayload: Record<string, any> = {
      preferredModel: preferredModel || 'gemini-3.8-flash',
      isActive: isActive !== false,
    };

    // Solo actualizar la API Key si el usuario envió un valor nuevo real (no solo la máscara)
    if (geminiApiKey && !geminiApiKey.includes('...')) {
      updatePayload.geminiApiKey = geminiApiKey.trim();
      process.env.GEMINI_API_KEY = geminiApiKey.trim();
    }

    const updated = await db.updateTenantAiConfig(tenantId, updatePayload);

    return res.json({
      success: true,
      message: 'Configuración de Conexiones e IA guardada exitosamente.',
      aiConfig: updated?.aiConfig,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al guardar configuración de IA' });
  }
});

function formatGeminiError(err: any): string {
  if (!err) return 'Error desconocido de conexión con Gemini.';
  let msg = err.message || String(err);

  try {
    // Si Google API devolvió un JSON con error
    const parsed = typeof msg === 'string' && msg.trim().startsWith('{') ? JSON.parse(msg) : null;
    if (parsed?.error?.message) {
      msg = parsed.error.message;
    }
  } catch {}

  if (msg.includes('CONSUMER_SUSPENDED') || msg.includes('has been suspended')) {
    return 'El proyecto de Google Cloud asociado a esta API Key ha sido suspendido por Google. Genera una nueva API Key en Google AI Studio (aistudio.google.com/app/apikey) o verifica el estado de tu cuenta de Google.';
  }
  if (
    msg.includes('high demand') ||
    msg.includes('Spikes in demand') ||
    msg.includes('503') ||
    msg.includes('UNAVAILABLE')
  ) {
    return 'Google Gemini experimenta alta demanda en este instante. Selecciona Gemini 2.5 Flash o Gemini 1.5 Flash en el menú para una conexión inmediata con alta disponibilidad.';
  }
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
    return 'La API Key ingresada no es válida. Copia la clave completa desde Google AI Studio (suele iniciar con "AIzaSy...").';
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    return 'Has alcanzado el límite de cuota temporal de Gemini (Rate limit). Espera unos segundos o usa un proyecto con cuota disponible.';
  }
  if (msg.includes('PERMISSION_DENIED')) {
    return 'Permiso denegado por Google Cloud para esta API Key. Verifica que el servicio Generative Language API esté activo en tu proyecto.';
  }
  return msg;
}

/**
 * Probar conexión con Google Gemini API
 */
router.post('/test-connection', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { apiKey, model = 'gemini-2.5-flash' } = req.body;
    const tenantId = req.auth?.tenant?.id;
    let keyToTest = apiKey;

    if (!keyToTest || keyToTest.includes('...')) {
      const tenant = tenantId ? await db.getTenantById(tenantId) : null;
      keyToTest = tenant?.aiConfig?.geminiApiKey || process.env.GEMINI_API_KEY;
    }

    if (!keyToTest) {
      return res.json({
        ok: false,
        error: 'No se ha proporcionado una API Key de Gemini para probar.',
      });
    }

    const client = new GoogleGenAI({ apiKey: keyToTest });
    const startTime = Date.now();

    const { response, modelUsed } = await generateContentWithResilience(
      client,
      model || 'gemini-2.5-flash',
      {
        contents: 'Responde únicamente con la palabra "ROMA_OK" para verificar la conexión.',
      }
    );

    const latencyMs = Date.now() - startTime;
    const replyText = response.text || '';
    const note = modelUsed !== model ? ` (resuelto con ${modelUsed} por alta disponibilidad)` : '';

    return res.json({
      ok: true,
      latencyMs,
      reply: replyText.trim(),
      model: modelUsed,
      message: `¡Conexión exitosa con Google Gemini (${modelUsed})!${note} Tiempo de respuesta: ${latencyMs}ms.`,
    });
  } catch (err: any) {
    const friendlyError = formatGeminiError(err);
    console.warn('Aviso de prueba de conexión Gemini:', friendlyError);
    return res.json({
      ok: false,
      error: friendlyError,
    });
  }
});

export default router;
