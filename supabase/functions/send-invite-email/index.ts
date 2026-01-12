import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  displayName?: string;
  role: string;
  createEmployee: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is an admin/manager
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin or manager
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdminOrManager = roles?.some(r => r.role === "admin" || r.role === "manager");
    if (!isAdminOrManager) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin or Manager role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, displayName, role, createEmployee }: InviteRequest = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || supabaseUrl;
    
    // Generate invite link with actual token
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
          invited_role: role,
        },
        redirectTo: `${origin}/redirect`,
      },
    });

    if (linkError) {
      console.error("Invite error:", linkError);
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = linkData.user?.id;
    const inviteLink = linkData.properties?.action_link;

    // Assign role to the new user
    if (newUserId) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: newUserId, role }, { onConflict: "user_id,role" });

      if (roleError) {
        console.error("Role assignment error:", roleError);
      }

      // Create employee record if requested and role is staff-type
      if (createEmployee && role !== "client") {
        const category = role === "shovel_crew" ? "shovel" : "plow";
        const employeeRole = role === "admin" ? "admin" : role === "manager" ? "manager" : "driver";
        
        const { error: employeeError } = await supabase
          .from("employees")
          .insert({
            name: displayName || email.split("@")[0],
            email,
            user_id: newUserId,
            category,
            role: employeeRole,
            status: "active",
          });

        if (employeeError) {
          console.error("Employee creation error:", employeeError);
        }
      }
    }

    // Send custom invite email via Resend
    const appName = "WinterWatch-Pro";
    const senderEmail = Deno.env.get("SENDER_EMAIL") || "onboarding@resend.dev";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!inviteLink) {
      return new Response(JSON.stringify({ error: "Failed to generate invite link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resendApiKey) {
      // Don't fail the whole invite flow if email isn't configured.
      // Return the invite link so an admin can share it manually.
      return new Response(
        JSON.stringify({
          error: "Email provider is not configured (missing RESEND_API_KEY)",
          inviteLink,
          userId: newUserId,
          emailSent: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${appName} <${senderEmail}>`,
        to: [email],
        subject: `You've been invited to join ${appName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">❄️ ${appName}</h1>
              </div>
              
              <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
                <h2 style="color: #1e293b; margin-top: 0;">Welcome to the team!</h2>
                
                <p>Hi ${displayName || email.split("@")[0]},</p>
                
                <p>You've been invited to join <strong>${appName}</strong> as a <strong style="color: #7c3aed;">${role.replace("_", " ").toUpperCase()}</strong>.</p>
                
                <p>Click the button below to set up your account and get started:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteLink}" 
                     style="background: linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                    Accept Invitation
                  </a>
                </div>
                
                <p style="color: #64748b; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                  © ${new Date().getFullYear()} ${appName}. All rights reserved.
                </p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    const emailResponseText = await emailResponse.text();
    let emailResponseJson: any = null;
    try {
      emailResponseJson = JSON.parse(emailResponseText);
    } catch {
      // ignore
    }

    if (!emailResponse.ok) {
      console.error("Resend error:", emailResponse.status, emailResponseJson ?? emailResponseText);

      // Resend can reject sends until a domain is verified. In that case, we still want the
      // invitation flow to succeed by returning the generated link for manual sharing.
      return new Response(
        JSON.stringify({
          error: `Email provider rejected the request (${emailResponse.status})`,
          details: emailResponseJson ?? emailResponseText,
          inviteLink,
          userId: newUserId,
          emailSent: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`,
        userId: newUserId,
        inviteLink,
        emailSent: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
