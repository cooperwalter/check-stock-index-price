/**
 * Class representing a notification trigger.
 */
class Notifier {
  /**
   * Create a Notifier instance.
   * @param {string} notificationEndpoint - The endpoint URL for the notification.
   */
  constructor(notificationEndpoint) {
    this.notificationEndpoint = notificationEndpoint;
  }

  /**
   * Notify with the given price data.
   * @param {number} originalPrice - The original price of the item.
   * @param {number} currentPrice - The current price of the item.
   * @param {number} percentageChange - The percentage change in price.
   * @throws Will throw an error if the notification fails.
   */
  async notify(originalPrice, currentPrice, percentageChange) {
    console.log("Notifying with originalPrice: " + originalPrice + ", currentPrice: " + currentPrice + ", percentageChange: " + percentageChange);
    const response = await fetch(this.notificationEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        value1: originalPrice,
        value2: currentPrice,
        value3: percentageChange,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to notify: ${response.statusText}`);
    }

    return response;
  }
}

module.exports = Notifier;
