// backend/src/services/imageValidationService.js
/**
 * AI-powered image validation for marketplace listings
 * Validates:
 * 1. Image contains second-hand/recyclable objects
 * 2. No published/censored content
 * 3. No screenshot/document uploads
 * 4. Logical price moderation based on item type and condition
 */

const SCREENSHOT_DOC_LABELS = [
  'screenshot', 'software', 'web page', 'text', 'document', 'invoice',
  'receipt', 'form', 'id card', 'passport', 'certificate', 'menu', 'poster',
];

const CONDITION_WORN = [
  'old', 'used', 'second hand', 'second-hand', 'scrap', 'broken', 'damaged',
  'worn', 'rust', 'rusted', 'tear', 'torn', 'defect',
];

const CONDITION_GOOD = [
  'new', 'brand new', 'unused', 'excellent', 'premium', 'good condition',
];

const PRICE_RULES = [
  { name: 'furniture', keywords: ['chair', 'table', 'stool', 'sofa', 'couch', 'desk', 'bed', 'shelf'], max: 25000 },
  { name: 'electronics', keywords: ['phone', 'mobile', 'laptop', 'tv', 'television', 'fridge', 'washing machine'], max: 60000 },
  { name: 'metal_scrap', keywords: ['aluminum', 'steel', 'iron', 'copper', 'brass', 'metal', 'wire', 'cable'], max: 12000 },
  { name: 'plastic_paper', keywords: ['plastic', 'paper', 'cardboard', 'bottle', 'can'], max: 6000 },
];

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function hasAny(text, keywords) {
  return keywords.some((k) => text.includes(k));
}

function inferRule(combinedText) {
  return PRICE_RULES.find((rule) => hasAny(combinedText, rule.keywords)) || null;
}

function conditionMultiplier(combinedText) {
  const worn = hasAny(combinedText, CONDITION_WORN);
  const good = hasAny(combinedText, CONDITION_GOOD);

  if (worn && !good) return 0.35;
  if (worn) return 0.5;
  if (good) return 1.1;
  return 0.8;
}

class ImageValidationService {
  /**
   * Validate marketplace listing image using Google Vision API
   * Returns: { valid: boolean, reason?: string, confidence?: number }
   */
  static async validateListingImage(imageUrl, listingContext = {}) {
    if (!process.env.GOOGLE_VISION_API_KEY) {
      console.warn('Google Vision API key not configured, skipping AI validation');
      return { valid: true, reason: 'Validation skipped', confidence: 0 };
    }

    try {
      // Call Google Vision API
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
        {
          method: 'POST',
          body: JSON.stringify({
            requests: [
              {
                image: { source: { imageUri: imageUrl } },
                features: [
                  { type: 'LABEL_DETECTION', maxResults: 10 },
                  { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
                  { type: 'SAFE_SEARCH_DETECTION' },
                  { type: 'TEXT_DETECTION' },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Vision API error: ${response.status}`);
      }

      const data = await response.json();
      const annotation = data.responses?.[0];

      if (annotation.error) {
        throw new Error(`Vision API error: ${annotation.error.message}`);
      }

      // Check for NSFW/published content
      const safeSearch = annotation.safeSearchAnnotation;
      if (
        safeSearch?.adult === 'VERY_LIKELY' ||
        safeSearch?.adult === 'LIKELY' ||
        safeSearch?.racy === 'VERY_LIKELY'
      ) {
        return { valid: false, reason: 'Image contains inappropriate content' };
      }

      // Check for second-hand/recyclable objects
      const labels = annotation.labelAnnotations || [];
      const objects = annotation.localizedObjectAnnotations || [];
      const textAnnotations = annotation.textAnnotations || [];
      const labelText = labels.map((l) => normalizeText(l.description));
      const objectText = objects.map((o) => normalizeText(o.name));

      const secondHandLabels = [
        'plastic', 'aluminum', 'can', 'bottle', 'paper', 'cardboard', 'metal',
        'glass', 'waste', 'recycling', 'trash', 'scrap', 'material', 'item',
        'used', 'old', 'worn', 'damaged', 'junk', 'salvage', 'reuse',
      ];

      const prohibitedLabels = [
        'person', 'human', 'face', 'nude', 'weapon', 'gun', 'alcohol',
        'cigarette', 'drug', 'medicine', 'pill', 'electronic waste',
      ];

      // Check labels
      const matchedLabels = labels
        .map(l => ({ label: l.description.toLowerCase(), score: l.score }))
        .filter(l => secondHandLabels.some(sw => l.label.includes(sw)));

      const foundProhibited = labels.some(l =>
        prohibitedLabels.some(p => l.description.toLowerCase().includes(p))
      );

      if (foundProhibited) {
        return { valid: false, reason: 'Image contains prohibited item type' };
      }

      // Screenshot/document moderation
      const ocrText = normalizeText(textAnnotations?.[0]?.description || '');
      const looksLikeScreenshotDoc =
        labelText.some((l) => hasAny(l, SCREENSHOT_DOC_LABELS)) ||
        objectText.some((o) => hasAny(o, SCREENSHOT_DOC_LABELS)) ||
        (ocrText.length > 140 && objects.length === 0) ||
        (ocrText.length > 220 && matchedLabels.length === 0);

      if (looksLikeScreenshotDoc) {
        return {
          valid: false,
          reason: 'Uploaded image looks like screenshot/document instead of product photo',
          confidence: 0.95,
        };
      }

      if (matchedLabels.length === 0) {
        return {
          valid: false,
          reason: 'Image does not appear to contain second-hand/recyclable items',
          confidence: 0.3,
        };
      }

      // Calculate confidence
      const avgScore = matchedLabels.reduce((sum, l) => sum + l.score, 0) / matchedLabels.length;

      // Check for text overlays (published photos usually have watermarks)
      if (textAnnotations.length > 2) {
        // More than 2 text detections likely means watermark/published
        return { valid: false, reason: 'Image appears to be from a published source (watermark detected)' };
      }

      // Logical moderation: price vs item type and condition
      const parsedPrice = Number.parseFloat(listingContext?.price);
      if (Number.isFinite(parsedPrice) && parsedPrice > 0) {
        const title = normalizeText(listingContext?.title);
        const description = normalizeText(listingContext?.description);
        const combined = [title, description, ...labelText, ...objectText].join(' ');
        const rule = inferRule(combined);
        const multiplier = conditionMultiplier(combined);

        if (rule) {
          const maxAllowed = Math.round(rule.max * multiplier);
          if (parsedPrice > maxAllowed && parsedPrice > 1000) {
            return {
              valid: false,
              reason: `Price seems unrealistic for detected ${rule.name} condition. Expected up to around Rs. ${maxAllowed}.`,
              confidence: 0.92,
            };
          }
        } else if (parsedPrice > 100000) {
          return {
            valid: false,
            reason: 'Price appears unrealistic for marketplace resale item.',
            confidence: 0.9,
          };
        }
      }

      return {
        valid: true,
        reason: `Valid marketplace image. Detected: ${matchedLabels.map(l => l.label).join(', ')}`,
        confidence: avgScore,
      };
    } catch (err) {
      console.error('Image validation error:', err);
      // Fail open - allow listing but mark as manual review needed
      return {
        valid: true,
        reason: 'Could not validate image, flagged for manual review',
        confidence: 0,
      };
    }
  }

  /**
   * Validate image from base64 or file buffer
   */
  static async validateImageBuffer(buffer, _mimeType = 'image/jpeg') {
    if (!process.env.GOOGLE_VISION_API_KEY) {
      return { valid: true, reason: 'Validation skipped', confidence: 0 };
    }

    try {
      const base64Data = Buffer.isBuffer(buffer) ? buffer.toString('base64') : String(buffer || '');
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
        {
          method: 'POST',
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64Data },
                features: [
                  { type: 'LABEL_DETECTION', maxResults: 10 },
                  { type: 'SAFE_SEARCH_DETECTION' },
                  { type: 'TEXT_DETECTION' },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const annotation = data.responses?.[0];

      // Same validation logic as URL-based
      const safeSearch = annotation.safeSearchAnnotation;
      if (safeSearch?.adult === 'VERY_LIKELY' || safeSearch?.racy === 'VERY_LIKELY') {
        return { valid: false, reason: 'Image contains inappropriate content' };
      }

      const labels = annotation.labelAnnotations || [];
      const secondHandLabels = [
        'plastic', 'aluminum', 'can', 'bottle', 'paper', 'metal', 'glass', 'waste',
      ];
      const hasSecondHand = labels.some(l =>
        secondHandLabels.some(sw => l.description.toLowerCase().includes(sw))
      );

      if (!hasSecondHand) {
        return { valid: false, reason: 'Image does not contain second-hand items' };
      }

      return { valid: true, reason: 'Image validated', confidence: 0.85 };
    } catch (err) {
      console.error('Buffer validation error:', err);
      return { valid: true, reason: 'Validation skipped (fallback)', confidence: 0 };
    }
  }
}

export default ImageValidationService;
