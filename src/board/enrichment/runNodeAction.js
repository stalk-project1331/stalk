import { getActionById } from './actions.js';
import { runPhoneAction } from './phoneEnricher.js';
import { runDomainAction } from './domainEnricher.js';
import { runIpAction } from './ipEnricher.js';

export async function runNodeAction(node, actionId, context = {}) {
  if (!node || !node.type) {
    throw new Error('Node is required');
  }

  const action = getActionById(node.type, actionId);
  if (!action) {
    throw new Error(`Unknown action "${actionId}" for node type "${node.type}"`);
  }

  if (action.mode === 'internet' && !context.hasInternet) {
    return {
      ok: false,
      actionId,
      nodeType: node.type,
      error: 'Internet access is required',
      result: null
    };
  }

  switch (node.type) {
    case 'phone':
      return runPhoneAction(node, actionId, context);

    case 'domain':
      return runDomainAction(node, actionId, context);

    case 'ip':
      return runIpAction(node, actionId, context);

    default:
      return {
        ok: false,
        actionId,
        nodeType: node.type,
        error: `Unsupported node type "${node.type}"`,
        result: null
      };
  }
}

export function buildEnrichmentPatch(previousEnrichment, actionResponse) {
  const now = Date.now();

  if (!actionResponse?.ok) {
    return {
      ...(previousEnrichment || {}),
      status: 'error',
      lastRunAt: now,
      lastActionId: actionResponse?.actionId || null,
      data: previousEnrichment?.data || {},
      suggestions: previousEnrichment?.suggestions || [],
      errors: [
        ...(previousEnrichment?.errors || []),
        {
          actionId: actionResponse?.actionId || null,
          message: actionResponse?.error || 'Unknown error',
          at: now
        }
      ]
    };
  }

  return {
    ...(previousEnrichment || {}),
    status: 'ready',
    lastRunAt: now,
    lastActionId: actionResponse.actionId,
    data: {
      ...(actionResponse.result?.data || {})
    },
    suggestions: [...(actionResponse.result?.suggestions || [])],
    errors: []
  };
}

export function applyNodeActionResult(node, actionResponse) {
  if (!node) return node;

  const enrichment = buildEnrichmentPatch(node.enrichment, actionResponse);

  const nextNode = {
    ...node,
    enrichment,
    updatedAt: Date.now()
  };

  if (actionResponse?.ok && typeof actionResponse?.result?.tags === 'string') {
    nextNode.tags = actionResponse.result.tags;
  }

  return nextNode;
}