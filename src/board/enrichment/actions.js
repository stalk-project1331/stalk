export const NODE_ACTIONS = {
  phone: [
    {
      id: 'parse-phone',
      labelKey: 'board.intelligence.actions.items.parsePhone.label',
      descriptionKey: 'board.intelligence.actions.items.parsePhone.description',
      mode: 'local'
    }
  ],

  domain: [
    {
      id: 'parse-domain',
      labelKey: 'board.intelligence.actions.items.parseDomain.label',
      descriptionKey: 'board.intelligence.actions.items.parseDomain.description',
      mode: 'local'
    },
    {
      id: 'resolve-dns',
      labelKey: 'board.intelligence.actions.items.resolveDns.label',
      descriptionKey: 'board.intelligence.actions.items.resolveDns.description',
      mode: 'internet'
    }
  ],

  ip: [
    {
      id: 'ip-geo',
      labelKey: 'board.intelligence.actions.items.ipLookup.label',
      descriptionKey: 'board.intelligence.actions.items.ipLookup.description',
      mode: 'internet'
    }
  ]
};

export function getNodeActions(nodeType) {
  return NODE_ACTIONS[nodeType] || [];
}

export function getActionById(nodeType, actionId) {
  const actions = NODE_ACTIONS[nodeType] || [];
  return actions.find((action) => action.id === actionId) || null;
}