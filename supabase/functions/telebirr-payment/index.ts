import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, phoneNumber, courseId } = await req.json();
    
    const TELEBIRR_APP_ID = Deno.env.get("TELEBIRR_APP_ID");
    const TELEBIRR_APP_KEY = Deno.env.get("TELEBIRR_APP_KEY");
    const TELEBIRR_PUBLIC_KEY = Deno.env.get("TELEBIRR_PUBLIC_KEY");
    
    if (!TELEBIRR_APP_ID || !TELEBIRR_APP_KEY || !TELEBIRR_PUBLIC_KEY) {
      throw new Error("Telebirr credentials not configured");
    }

    console.log("Creating Telebirr payment for course:", courseId, "Amount:", amount, "ETB");

    // Generate unique transaction reference
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Prepare Telebirr payment request
    const paymentData = {
      appId: TELEBIRR_APP_ID,
      transactionId,
      amount: amount.toString(),
      currency: "ETB",
      subject: `Course Payment - ${courseId}`,
      body: `Payment for course ${courseId}`,
      phoneNumber,
      notifyUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/telebirr-payment-notify`,
      returnUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/telebirr-payment-return`,
      timestamp,
    };

    // Generate signature (simplified - in production, implement proper signing)
    const signString = Object.entries(paymentData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    
    console.log("Payment request created:", transactionId);

    // In production, you would call the actual Telebirr API
    // For now, returning a mock response structure
    return new Response(
      JSON.stringify({
        transactionId,
        status: "PENDING",
        paymentUrl: `https://telebirr.et/pay?ref=${transactionId}`,
        message: "Payment initiated successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Telebirr payment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Payment processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
