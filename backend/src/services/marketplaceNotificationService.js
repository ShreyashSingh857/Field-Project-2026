/**
 * Marketplace Notification Service
 * Handles notifications for listing approval/rejection/AI validation
 */
import { createNotification } from './notificationService.js';

class MarketplaceNotificationService {
  /**
   * Create a notification for a user
   */
  static async createNotification(userId, type, data) {
    try {
      return await createNotification({
        actorType: 'user',
        actorId: userId,
        kind: `marketplace_${type}`,
        title: this.getTitle(type, data),
        body: this.getMessage(type, data),
        link: '/my-listings',
        data,
      });
    } catch (err) {
      console.error('Create notification error:', err);
      // Don't fail the listing operation if notification fails
      return null;
    }
  }

  /**
   * Notify user about AI validation result
   */
  static async notifyAIValidation(userId, listingId, result) {
    return this.createNotification(userId, 'ai_validation', {
      listingId,
      title: result.title,
      status: result.valid ? 'passed' : 'failed',
      reason: result.reason,
      confidence: result.confidence,
    });
  }

  /**
   * Notify user about listing approval
   */
  static async notifyApproval(userId, listingId, title, moderatorNotes) {
    return this.createNotification(userId, 'approved', {
      listingId,
      title,
      notes: moderatorNotes,
    });
  }

  /**
   * Notify user about listing rejection
   */
  static async notifyRejection(userId, listingId, title, reason) {
    return this.createNotification(userId, 'rejected', {
      listingId,
      title,
      reason,
    });
  }

  /**
   * Notify user about listing flagged
   */
  static async notifyFlagged(userId, listingId, title, reason) {
    return this.createNotification(userId, 'flagged', {
      listingId,
      title,
      reason,
    });
  }

  /**
   * Get notification title by type
   */
  static getTitle(type, data) {
    switch (type) {
      case 'ai_validation':
        return data.status === 'passed'
          ? '✅ Listing Passed AI Validation'
          : '⚠️ Listing Failed AI Validation';
      case 'approved':
        return '✅ Your listing has been approved!';
      case 'rejected':
        return '❌ Your listing was rejected';
      case 'flagged':
        return '🚩 Your listing was flagged';
      default:
        return 'Marketplace Update';
    }
  }

  /**
   * Get notification message by type
   */
  static getMessage(type, data) {
    switch (type) {
      case 'ai_validation':
        if (data.status === 'passed') {
          return `${data.title ? `Your listing "${data.title}"` : 'Your listing'} passed AI validation. It will now go to moderator review.`;
        }
        return `AI validation failed: ${data.reason}. Please upload a different photo.`;
      
      case 'approved':
        return `Your listing "${data.title}" is now live on the marketplace!`;
      
      case 'rejected':
        return `Your listing "${data.title}" was rejected. Reason: ${data.reason}`;
      
      case 'flagged':
        return `Your listing "${data.title}" was flagged for review. Reason: ${data.reason}`;
      
      default:
        return 'An update about your marketplace listing';
    }
  }
}

export default MarketplaceNotificationService;
