import { requireStaff } from "@/lib/automation/admin-auth";
import { aiEnabled, openaiConfig, whatsappConfig } from "@/lib/automation/config";

/** Who is signed in, plus which integrations are configured (shown as status chips in the dashboard). */
export async function GET(request: Request) {
  const auth = await requireStaff(request);
  if ("response" in auth) return auth.response;
  const { staff } = auth;
  return Response.json({
    staff: { id: staff.id, full_name: staff.full_name, email: staff.email, role: staff.role },
    integrations: {
      whatsapp: Boolean(whatsappConfig()),
      webhookSignature: Boolean(process.env.META_APP_SECRET),
      ai: Boolean(openaiConfig()) && aiEnabled(),
      email: Boolean(process.env.RESEND_API_KEY && process.env.ENQUIRY_FROM_EMAIL),
      cron: Boolean(process.env.CRON_SECRET),
    },
  });
}
