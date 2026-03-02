import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@ineedadrnote.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

function isEmailConfigured(): boolean {
  return !!SENDGRID_API_KEY;
}

interface DoctorApprovalEmailData {
  doctorEmail: string;
  doctorName: string;
  patientName: string;
  patientEmail: string;
  packageName: string;
  formData: Record<string, any>;
  reviewUrl: string;
  applicationId: string;
}

interface AdminNotificationEmailData {
  adminEmail: string;
  doctorName: string;
  patientName: string;
  patientEmail: string;
  packageName: string;
  formData: Record<string, any>;
  reviewUrl: string;
  applicationId: string;
}

interface PatientDocumentEmailData {
  patientEmail: string;
  patientName: string;
  packageName: string;
  applicationId: string;
  dashboardUrl: string;
}

const SUMMARY_KEYS = [
  "disabilityCondition", "disability_condition",
  "medicalCondition", "medical_condition",
  "state",
  "duration", "duration_requested", "durationRequested",
  "permitType", "permit_type",
  "reason",
];

function formatFormDataSummary(formData: Record<string, any>): string {
  if (!formData || Object.keys(formData).length === 0) return "";

  const lowerSummaryKeys = SUMMARY_KEYS.map(k => k.toLowerCase());
  const entries: [string, any][] = [];

  for (const [key, value] of Object.entries(formData)) {
    if (value === undefined || value === null || value === "") continue;
    if (lowerSummaryKeys.includes(key.toLowerCase())) {
      entries.push([key, value]);
    }
  }

  if (entries.length === 0) return "";

  let html = '<table style="width:100%;border-collapse:collapse;margin:16px 0;">';
  for (const [key, value] of entries) {
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).replace(/_/g, " ");
    html += `<tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px 12px;font-weight:600;color:#374151;white-space:nowrap;">${label}</td>
      <td style="padding:8px 12px;color:#4b5563;">${value ?? "—"}</td>
    </tr>`;
  }
  html += "</table>";
  return html;
}

function formatFormDataFull(formData: Record<string, any>): string {
  if (!formData || Object.keys(formData).length === 0) return "<p>No additional details provided.</p>";

  const skipKeys = new Set(["autoSendToDoctor", "packageId"]);
  let html = '<table style="width:100%;border-collapse:collapse;margin:16px 0;">';
  for (const [key, value] of Object.entries(formData)) {
    if (skipKeys.has(key) || value === undefined || value === null || value === "") continue;
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).replace(/_/g, " ");
    html += `<tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px 12px;font-weight:600;color:#374151;white-space:nowrap;">${label}</td>
      <td style="padding:8px 12px;color:#4b5563;">${value ?? "—"}</td>
    </tr>`;
  }
  html += "</table>";
  return html;
}

export async function sendDoctorApprovalEmail(data: DoctorApprovalEmailData): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("SendGrid not configured — skipping doctor approval email");
    return false;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#1e40af;padding:24px 32px;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;">I Need A Dr Note</h1>
        <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px;">New Application Review Request</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;">
          Hello Dr. ${data.doctorName},
        </p>
        <p style="color:#374151;font-size:16px;line-height:1.6;">
          A new application has been submitted and requires your review.
        </p>
        <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #e5e7eb;">
          <h3 style="color:#1e40af;margin:0 0 12px;font-size:16px;">Patient Information</h3>
          <p style="margin:4px 0;color:#4b5563;"><strong>Name:</strong> ${data.patientName}</p>
          <p style="margin:4px 0;color:#4b5563;"><strong>Email:</strong> ${data.patientEmail}</p>
          <p style="margin:4px 0;color:#4b5563;"><strong>Package:</strong> ${data.packageName}</p>
          <p style="margin:4px 0;color:#4b5563;"><strong>Application ID:</strong> ${data.applicationId}</p>
        </div>
        ${(() => {
          const summary = formatFormDataSummary(data.formData);
          return summary ? `<div style="margin:20px 0;">
            <h3 style="color:#1e40af;margin:0 0 12px;font-size:16px;">Application Details</h3>
            ${summary}
          </div>` : "";
        })()}
        <div style="text-align:center;margin:32px 0;">
          <a href="${data.reviewUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 40px;text-decoration:none;border-radius:8px;font-size:18px;font-weight:600;">
            Review &amp; Approve
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;text-align:center;">
          This link will take you to the secure review portal. No login required.
        </p>
      </div>
      <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">
          I Need A Dr Note &bull; Secure Review System
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: data.doctorEmail,
      from: { email: FROM_EMAIL, name: "I Need A Dr Note" },
      subject: `Review Request: ${data.patientName} — ${data.packageName}`,
      html,
    });
    console.log(`Doctor approval email sent to ${data.doctorEmail}`);
    return true;
  } catch (error: any) {
    console.error("Failed to send doctor approval email:", error?.response?.body || error.message);
    return false;
  }
}

export async function sendAdminNotificationEmail(data: AdminNotificationEmailData): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("SendGrid not configured — skipping admin notification email");
    return false;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#7c3aed;padding:24px 32px;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;">I Need A Dr Note</h1>
        <p style="color:#ddd6fe;margin:4px 0 0;font-size:14px;">Admin Notification — New Review Request</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;">
          A new application has been sent for doctor review.
        </p>
        <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #e5e7eb;">
          <h3 style="color:#7c3aed;margin:0 0 12px;font-size:16px;">Assignment Details</h3>
          <p style="margin:4px 0;color:#4b5563;"><strong>Patient:</strong> ${data.patientName}</p>
          <p style="margin:4px 0;color:#4b5563;"><strong>Patient Email:</strong> ${data.patientEmail}</p>
          <p style="margin:4px 0;color:#4b5563;"><strong>Package:</strong> ${data.packageName}</p>
          <p style="margin:4px 0;color:#4b5563;"><strong>Assigned Doctor:</strong> Dr. ${data.doctorName}</p>
          <p style="margin:4px 0;color:#4b5563;"><strong>Application ID:</strong> ${data.applicationId}</p>
        </div>
        ${(() => {
          const summary = formatFormDataSummary(data.formData);
          return summary ? `<div style="margin:20px 0;">
            <h3 style="color:#7c3aed;margin:0 0 12px;font-size:16px;">Application Details</h3>
            ${summary}
          </div>` : "";
        })()}
        <div style="text-align:center;margin:32px 0;">
          <a href="${data.reviewUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 40px;text-decoration:none;border-radius:8px;font-size:18px;font-weight:600;">
            Review &amp; Approve
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;text-align:center;">
          You can also approve this application using the button above.
        </p>
      </div>
      <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">
          I Need A Dr Note &bull; Admin Notification
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: data.adminEmail,
      from: { email: FROM_EMAIL, name: "I Need A Dr Note" },
      subject: `[Admin] New Review: ${data.patientName} — ${data.packageName} (Assigned: Dr. ${data.doctorName})`,
      html,
    });
    console.log(`Admin notification email sent to ${data.adminEmail}`);
    return true;
  } catch (error: any) {
    console.error("Failed to send admin notification email:", error?.response?.body || error.message);
    return false;
  }
}

interface DoctorCompletionCopyData {
  doctorEmail: string;
  doctorName: string;
  patientName: string;
  patientEmail: string;
  packageName: string;
  applicationId: string;
  formData: Record<string, any>;
}

export async function sendDoctorCompletionCopyEmail(data: DoctorCompletionCopyData): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("SendGrid not configured — skipping doctor completion copy email");
    return false;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#0d9488;padding:24px 32px;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;">I Need A Dr Note</h1>
        <p style="color:#ccfbf1;margin:4px 0 0;font-size:14px;">Application Auto-Completed — Doctor Copy</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;">
          Hello Dr. ${data.doctorName},
        </p>
        <p style="color:#374151;font-size:16px;line-height:1.6;">
          The following application has been <strong style="color:#0d9488;">auto-completed</strong> and the patient has been sent their permit document. This email is for your records.
        </p>
        <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #e5e7eb;">
          <h3 style="color:#0d9488;margin:0 0 12px;font-size:16px;">Patient Information</h3>
          <p style="margin:4px 0;color:#4b5563;"><strong>Name:</strong> ${data.patientName}</p>
          <p style="margin:4px 0;color:#4b5563;"><strong>Email:</strong> ${data.patientEmail}</p>
          <p style="margin:4px 0;color:#4b5563;"><strong>Package:</strong> ${data.packageName}</p>
          <p style="margin:4px 0;color:#4b5563;"><strong>Application ID:</strong> ${data.applicationId}</p>
        </div>
        ${(() => {
          const summary = formatFormDataSummary(data.formData);
          return summary ? `<div style="margin:20px 0;">
            <h3 style="color:#0d9488;margin:0 0 12px;font-size:16px;">Application Details</h3>
            ${summary}
          </div>` : "";
        })()}
        <p style="color:#6b7280;font-size:13px;text-align:center;">
          No action is required from you. This is a copy for your records.
        </p>
      </div>
      <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">
          I Need A Dr Note &bull; Doctor Records Copy
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: data.doctorEmail,
      from: { email: FROM_EMAIL, name: "I Need A Dr Note" },
      subject: `[Records] Auto-Completed: ${data.patientName} — ${data.packageName}`,
      html,
    });
    console.log(`Doctor completion copy email sent to ${data.doctorEmail}`);
    return true;
  } catch (error: any) {
    console.error("Failed to send doctor completion copy email:", error?.response?.body || error.message);
    return false;
  }
}

export async function sendPatientApprovalEmail(data: PatientDocumentEmailData): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("SendGrid not configured — skipping patient document email");
    return false;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#16a34a;padding:24px 32px;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;">I Need A Dr Note</h1>
        <p style="color:#bbf7d0;margin:4px 0 0;font-size:14px;">Your Application Has Been Approved!</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;">
          Hello ${data.patientName},
        </p>
        <p style="color:#374151;font-size:16px;line-height:1.6;">
          Great news! Your <strong>${data.packageName}</strong> application has been reviewed and <strong style="color:#16a34a;">approved</strong> by a licensed medical professional.
        </p>
        <div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #bbf7d0;">
          <h3 style="color:#16a34a;margin:0 0 8px;font-size:16px;">What's Next?</h3>
          <p style="margin:4px 0;color:#4b5563;">Your document has been prepared and is ready for download. Log in to your dashboard to access it.</p>
        </div>
        <div style="text-align:center;margin:32px 0;">
          <a href="${data.dashboardUrl}" style="display:inline-block;background:#1e40af;color:#ffffff;padding:14px 40px;text-decoration:none;border-radius:8px;font-size:18px;font-weight:600;">
            View My Dashboard
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;text-align:center;">
          Application ID: ${data.applicationId}
        </p>
      </div>
      <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">
          I Need A Dr Note &bull; Thank you for choosing us
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      to: data.patientEmail,
      from: { email: FROM_EMAIL, name: "I Need A Dr Note" },
      subject: `Your ${data.packageName} Has Been Approved!`,
      html,
    });
    console.log(`Patient approval email sent to ${data.patientEmail}`);
    return true;
  } catch (error: any) {
    console.error("Failed to send patient approval email:", error?.response?.body || error.message);
    return false;
  }
}
