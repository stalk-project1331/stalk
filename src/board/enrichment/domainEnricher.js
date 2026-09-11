function normalizeDomainValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .trim();
}

function isIpv4Like(value) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
}

function isValidDomain(value) {
  if (!value || value.length > 253) return false;
  if (isIpv4Like(value)) return false;

  const labels = value.split('.');
  if (labels.length < 2) return false;

  return labels.every((label) => {
    if (!label || label.length > 63) return false;
    if (label.startsWith('-') || label.endsWith('-')) return false;
    return /^[a-z0-9-]+$/i.test(label);
  });
}

function parseDomainParts(domain) {
  const labels = domain.split('.');

  if (labels.length < 2) {
    return {
      host: domain,
      rootDomain: domain,
      subdomain: '',
      tld: ''
    };
  }

  const tld = labels[labels.length - 1];
  const secondLevel = labels[labels.length - 2];
  const rootDomain = `${secondLevel}.${tld}`;
  const subdomain = labels.slice(0, -2).join('.');

  return {
    host: domain,
    rootDomain,
    subdomain,
    tld
  };
}

function buildDomainSuggestions(parsed) {
  const suggestions = [];

  if (parsed.rootDomain && parsed.rootDomain !== parsed.host) {
    suggestions.push({
      type: 'create-node',
      nodeType: 'domain',
      value: parsed.rootDomain,
      label: `Create root domain: ${parsed.rootDomain}`
    });
  }

  if (parsed.tld) {
    suggestions.push({
      type: 'set-metadata',
      key: 'tld',
      value: parsed.tld,
      label: `Save TLD: .${parsed.tld}`
    });
  }

  return suggestions;
}

function parseDomainNode(node) {
  const raw = String(node.title || node.description || '').trim();
  const normalized = normalizeDomainValue(raw);
  const valid = isValidDomain(normalized);

  const parts = valid
    ? parseDomainParts(normalized)
    : {
        host: normalized,
        rootDomain: null,
        subdomain: null,
        tld: null
      };

  const data = {
    raw,
    normalized,
    isValid: valid,
    host: parts.host,
    rootDomain: parts.rootDomain,
    subdomain: parts.subdomain,
    tld: parts.tld
  };

  return {
    ok: true,
    actionId: 'parse-domain',
    nodeType: 'domain',
    result: {
      data,
      suggestions: buildDomainSuggestions(data)
    }
  };
}

async function resolveDns(node, context = {}) {
  const raw = String(node.title || node.description || '').trim();
  const normalized = normalizeDomainValue(raw);

  if (!isValidDomain(normalized)) {
    return {
      ok: false,
      actionId: 'resolve-dns',
      nodeType: 'domain',
      error: 'Invalid domain',
      result: null
    };
  }

  try {
    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(normalized)}&type=A`,
      {
        method: 'GET'
      }
    );

    if (!response.ok) {
      throw new Error(`DNS request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const answers = Array.isArray(payload.Answer) ? payload.Answer : [];

    const ips = answers
      .filter((item) => item.type === 1 && typeof item.data === 'string')
      .map((item) => item.data);

    return {
      ok: true,
      actionId: 'resolve-dns',
      nodeType: 'domain',
      result: {
        data: {
          dnsHost: normalized,
          resolvedIps: ips
        },
        suggestions: ips.map((ip) => ({
          type: 'create-node',
          nodeType: 'ip',
          value: ip,
          label: `Create IP node: ${ip}`
        }))
      }
    };
  } catch (error) {
    return {
      ok: false,
      actionId: 'resolve-dns',
      nodeType: 'domain',
      error: error.message || 'DNS lookup failed',
      result: null
    };
  }
}

export async function runDomainAction(node, actionId, context = {}) {
  switch (actionId) {
    case 'parse-domain':
      return parseDomainNode(node);

    case 'resolve-dns':
      return resolveDns(node, context);

    default:
      return {
        ok: false,
        actionId,
        nodeType: 'domain',
        error: `Unsupported domain action "${actionId}"`,
        result: null
      };
  }
}