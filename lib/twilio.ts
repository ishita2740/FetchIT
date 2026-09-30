import twilio from "twilio";

let clientInstance: twilio.Twilio | null = null;

/**
 * Returns a singleton Twilio client instance using server-side environment variables.
 * Never expose credentials or client to the browser.
 */
export function getTwilioClient(): twilio.Twilio {
  if (!clientInstance) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error("Missing Twilio credentials in environment variables.");
    }

    clientInstance = twilio(accountSid, authToken);
  }

  return clientInstance;
}

/**
 * Retrieves the Twilio Verify Service SID from environment variables.
 */
export function getVerifyServiceSid(): string {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!serviceSid) {
    throw new Error("Missing TWILIO_VERIFY_SERVICE_SID in environment variables.");
  }

  return serviceSid;
}
