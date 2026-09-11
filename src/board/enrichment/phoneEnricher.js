import parsePhoneNumberFromString from 'libphonenumber-js';
import { findRuRange, findRuFallbackOperator } from './phoneCarrierDb.ru.js';

function normalizePhoneValue(value) {
  if (!value) return null;

  const cleaned = String(value).replace(/[^\d+]/g, '');

  if (!cleaned) return null;

  if (cleaned.startsWith('+')) return cleaned;

  // РФ fallback
  if (cleaned.startsWith('8')) {
    return '+7' + cleaned.slice(1);
  }

  if (cleaned.startsWith('7')) {
    return '+' + cleaned;
  }

  return '+' + cleaned;
}

function extractRuData(phoneNumber) {
  if (!phoneNumber?.isValid()) return null;

  if (phoneNumber.country !== 'RU') return null;

  const national = phoneNumber.nationalNumber.toString();

  if (national.length < 10) return null;

  const def = national.slice(0, 3); // 915
  const rest = parseInt(national.slice(3), 10); // 9223364

  // 1. точный поиск
  const range = findRuRange(def, rest);

  if (range) {
    return {
      operator: range.operator,
      region: range.region,
      source: 'range'
    };
  }

  // 2. fallback
  const fallbackOperator = findRuFallbackOperator(def);

  if (fallbackOperator) {
    return {
      operator: fallbackOperator,
      region: null,
      source: 'fallback'
    };
  }

  return null;
}

export async function runPhoneAction(node, actionId) {
  try {
    const rawValue = node?.title || node?.value;

    const normalized = normalizePhoneValue(rawValue);
    if (!normalized) {
      return {
        ok: false,
        actionId,
        nodeType: 'phone',
        error: 'Invalid phone number',
        result: null
      };
    }

    const phoneNumber = parsePhoneNumberFromString(normalized);

    if (!phoneNumber || !phoneNumber.isValid()) {
      return {
        ok: false,
        actionId,
        nodeType: 'phone',
        error: 'Invalid phone number',
        result: null
      };
    }

    const country = phoneNumber.country || null;

    let operator = null;
    let region = null;

    // RU логика
    if (country === 'RU') {
      const ruData = extractRuData(phoneNumber);

      if (ruData) {
        operator = ruData.operator;
        region = ruData.region;
      }
    }

    // сбор тегов
    const tagsParts = [];

    if (country) {
      tagsParts.push(`country:${country}`);
    }

    if (operator) {
      tagsParts.push(`operator:${operator}`);
    }

    if (region) {
      tagsParts.push(`region:${region}`);
    }

    const tags = tagsParts.join(', ');

    return {
      ok: true,
      actionId,
      nodeType: 'phone',
      result: {
        data: {
          phone: phoneNumber.number,
          country,
          operator,
          region
        },
        tags
      }
    };
  } catch (error) {
    return {
      ok: false,
      actionId,
      nodeType: 'phone',
      error: error.message || 'Phone parsing failed',
      result: null
    };
  }
}