const CHRONIC_BRANDS_API_KEY = process.env.PROMO_API_KEY || "";
const WEBHOOK_URL = "https://chronicbrandsusa.com/api/webhooks/promo-redemption";

const BRAND_NAME = "I Need A Dr Note";
const PLATFORM = "I Need A Dr Note Website";

export async function trackPromoRedemption(params: {
  code: string;
  orderNumber: string;
  orderValue: number;
  discountAmount?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!CHRONIC_BRANDS_API_KEY) {
    console.warn("PROMO_API_KEY not configured — skipping promo tracking");
    return { success: false, message: "Promo API key not configured" };
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CHRONIC_BRANDS_API_KEY,
      },
      body: JSON.stringify({
        code: params.code,
        brandName: BRAND_NAME,
        platform: PLATFORM,
        orderNumber: params.orderNumber,
        orderValue: String((params.orderValue / 100).toFixed(2)),
        discountAmount: String(((params.discountAmount || 0) / 100).toFixed(2)),
        customerName: params.customerName || undefined,
        customerEmail: params.customerEmail || undefined,
        customerPhone: params.customerPhone || undefined,
        notes: params.notes || `Order completed at ${new Date().toISOString()}`,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.valid) {
      const msg = result.message || "Promo code could not be applied";
      console.warn(`Promo tracking failed for code "${params.code}": ${msg}`);
      return { success: false, message: msg };
    }

    console.log(`Promo code "${params.code}" tracked successfully (redemption ID: ${result.redemption?.id})`);
    return { success: true };
  } catch (error: any) {
    console.error("Chronic Brands webhook error:", error.message);
    return { success: false, message: error.message };
  }
}
