function normalizeIpValue(value) {
  return String(value || '').trim();
}

function isValidIpv4(value) {
  const parts = value.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

function isValidIpv6(value) {
  return /^[0-9a-f:]+$/i.test(value) && value.includes(':');
}

function isValidIp(value) {
  return isValidIpv4(value) || isValidIpv6(value);
}

function buildIpSuggestions(data) {
  const suggestions = [];

  if (data.country) {
    suggestions.push({
      type: 'create-node',
      nodeType: 'location',
      value: data.country,
      label: `Create location: ${data.country}`
    });
  }

  if (data.regionName) {
    suggestions.push({
      type: 'set-metadata',
      key: 'region',
      value: data.regionName,
      label: `Save region: ${data.regionName}`
    });
  }

  if (data.isp) {
    suggestions.push({
      type: 'create-node',
      nodeType: 'company',
      value: data.isp,
      label: `Create company: ${data.isp}`
    });
  }

  if (data.timezone) {
    suggestions.push({
      type: 'set-metadata',
      key: 'timezone',
      value: data.timezone,
      label: `Add timezone: ${data.timezone}`
    });
  }

  return suggestions;
}

async function lookupIp(node, context = {}) {
  const raw = String(node.title || node.description || '').trim();
  const normalized = normalizeIpValue(raw);

  if (!isValidIp(normalized)) {
    return {
      ok: false,
      actionId: 'ip-geo',
      nodeType: 'ip',
      error: 'Invalid IP address',
      result: null
    };
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(normalized)}?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone,isp,org,as,query`,
      {
        method: 'GET'
      }
    );

    if (!response.ok) {
      throw new Error(`IP lookup failed with status ${response.status}`);
    }

    const payload = await response.json();

    if (payload.status !== 'success') {
      return {
        ok: false,
        actionId: 'ip-geo',
        nodeType: 'ip',
        error: payload.message || 'IP lookup failed',
        result: null
      };
    }

    const data = {
      query: payload.query || normalized,
      country: payload.country || null,
      countryCode: payload.countryCode || null,
      regionName: payload.regionName || null,
      city: payload.city || null,
      latitude: typeof payload.lat === 'number' ? payload.lat : null,
      longitude: typeof payload.lon === 'number' ? payload.lon : null,
      timezone: payload.timezone || null,
      isp: payload.isp || null,
      org: payload.org || null,
      as: payload.as || null
    };

    return {
      ok: true,
      actionId: 'ip-geo',
      nodeType: 'ip',
      result: {
        data,
        suggestions: buildIpSuggestions(data)
      }
    };
  } catch (error) {
    return {
      ok: false,
      actionId: 'ip-geo',
      nodeType: 'ip',
      error: error.message || 'IP lookup failed',
      result: null
    };
  }
}

export async function runIpAction(node, actionId, context = {}) {
  switch (actionId) {
    case 'ip-geo':
      return lookupIp(node, context);

    default:
      return {
        ok: false,
        actionId,
        nodeType: 'ip',
        error: `Unsupported IP action "${actionId}"`,
        result: null
      };
  }
}