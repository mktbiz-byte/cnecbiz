/**
 * Guide JSON Parser & Normalizer
 *
 * Handles 6 guide formats safely:
 * 1. AI scene guide (shooting_scenes key) — Korea
 * 2. AI scene guide (scenes key) — Japan/US
 * 3. External PDF: {type: "external_pdf", fileUrl: "..."}
 * 4. External URL: {type: "external_url", url: "..."}
 * 5. Plain text (non-JSON Korean text) — Korea
 * 6. 4-week guide: {type: "4week_ai", weeklyGuides: "..."} — possibly double-stringified
 */

/**
 * Safely parse any guide data format. Never throws.
 * @param {null|string|object} raw - Raw guide data from DB
 * @returns {object|null} Parsed guide object, or null if empty
 */
export function parseGuide(raw) {
  if (raw == null) return null
  if (typeof raw === 'object') return normalizeGuide(raw)
  if (typeof raw !== 'string') return null

  const trimmed = raw.trim()
  if (!trimmed || trimmed === '``' || trimmed === '```') return null

  try {
    let parsed = JSON.parse(trimmed)
    // Handle double-stringified JSON
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed)
      } catch (_) {
        // Single-stringified string value, wrap as rawText
        return { rawText: parsed }
      }
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return normalizeGuide(parsed)
    }
    return parsed
  } catch (_) {
    // Not valid JSON — treat as plain text
    return { rawText: trimmed }
  }
}

/**
 * Ensure both scenes and shooting_scenes keys exist if either is present.
 * @param {object} obj - Guide object
 * @returns {object} Guide with both keys guaranteed
 */
export function normalizeGuide(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj

  if (obj.scenes && !obj.shooting_scenes) {
    obj.shooting_scenes = obj.scenes
  }
  if (obj.shooting_scenes && !obj.scenes) {
    obj.scenes = obj.shooting_scenes
  }

  // Handle double-stringified weeklyGuides in 4week guides
  if (obj.type === '4week_ai' && typeof obj.weeklyGuides === 'string') {
    try {
      obj.weeklyGuides = JSON.parse(obj.weeklyGuides)
    } catch (_) {
      // keep as-is
    }
  }

  return obj
}

/**
 * Check if guide has scene-based AI content
 * @param {object} guide - Parsed guide object
 * @returns {boolean}
 */
export function isSceneGuide(guide) {
  if (!guide || typeof guide !== 'object') return false
  return (Array.isArray(guide.shooting_scenes) && guide.shooting_scenes.length > 0) ||
         (Array.isArray(guide.scenes) && guide.scenes.length > 0)
}

/**
 * Check if guide is plain text (non-JSON)
 * @param {object} guide - Parsed guide object
 * @returns {boolean}
 */
export function isTextGuide(guide) {
  if (!guide || typeof guide !== 'object') return false
  return typeof guide.rawText === 'string'
}

/**
 * Check if guide is external PDF or URL
 * @param {object} guide - Parsed guide object
 * @returns {boolean}
 */
export function isExternalGuide(guide) {
  if (!guide || typeof guide !== 'object') return false
  return guide.type === 'external_pdf' || guide.type === 'external_url'
}

/**
 * Prepare guide for saving to region-specific DB.
 * - Japan (JSONB): returns object
 * - Korea/US (TEXT): returns JSON string
 * Always ensures both scenes and shooting_scenes keys.
 * @param {object|string|null} guide - Guide data to save
 * @param {string} region - 'korea'|'japan'|'us'
 * @returns {object|string|null} Region-appropriate format
 */
export function prepareGuideForSave(guide, region) {
  if (guide == null) return null

  // Parse if string
  let obj = guide
  if (typeof guide === 'string') {
    try {
      obj = JSON.parse(guide)
    } catch (_) {
      // Plain text — wrap and save
      obj = { rawText: guide }
    }
  }

  if (typeof obj === 'object' && obj !== null) {
    // Ensure bidirectional scene keys
    if (obj.scenes && !obj.shooting_scenes) {
      obj.shooting_scenes = obj.scenes
    }
    if (obj.shooting_scenes && !obj.scenes) {
      obj.scenes = obj.shooting_scenes
    }
  }

  if (region === 'japan') {
    // JSONB column — return object
    return obj
  }
  // TEXT column (korea, us) — return JSON string
  return typeof obj === 'string' ? obj : JSON.stringify(obj)
}
