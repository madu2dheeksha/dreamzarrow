import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { mailLink, site, telLink } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${site.name} collects, uses and protects the personal information you share with us.`,
  alternates: { canonical: "/privacy" },
};

/* Drafted for India's Digital Personal Data Protection Act, 2023. Have it reviewed by your legal adviser before launch. */
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="21 November 2026">
      <p>
        {site.legalName} (&ldquo;{site.name}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your privacy. This
        policy explains what personal information we collect through this website, why we collect it, and the choices
        you have.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Details you give us</strong> when you send an enquiry, request a site visit, call us or message us on
          WhatsApp: your name, phone number, email address (if provided), the type of help you need, any property you
          ask about and any message you write.
        </li>
        <li>
          <strong>Basic technical information</strong> such as your IP address and browser type, which our hosting
          provider processes to deliver the site securely and to prevent abuse.
        </li>
      </ul>
      <p>This website does not use advertising cookies or tracking pixels.</p>
      <h2>How we use your information</h2>
      <ul>
        <li>To respond to your enquiry and arrange consultations or site visits.</li>
        <li>To share property information that is relevant to the requirement you described.</li>
        <li>To keep records of our conversations so that we can serve you well.</li>
        <li>To meet our legal and regulatory obligations.</li>
      </ul>
      <h2>WhatsApp messages and our virtual assistant</h2>
      <p>
        If you tick the WhatsApp box on our enquiry form, we may message you on WhatsApp about your enquiry. Replies are
        first handled by a virtual assistant (an AI system) that helps understand your requirements and suggest listings;
        a member of our team takes over whenever you ask, or when a visit, call or detailed question is needed. We keep
        the conversation so our team can follow up. Reply STOP at any time and we will not message you again.
      </p>
      <p>We do not sell your personal information.</p>
      <h2>Sharing</h2>
      <p>
        With your agreement, we may share your contact details with a property owner, developer or landlord in order to
        arrange a visit or progress a transaction. We also use service providers, such as our website host, database
        host, email provider, Meta (WhatsApp Business) and OpenAI (for the virtual assistant), who process information on
        our behalf under appropriate safeguards.
      </p>
      <h2>Third-party content</h2>
      <p>
        Videos are embedded from YouTube and maps from Google Maps. These load only when you choose to play a video or
        show a map, and are then subject to Google&rsquo;s privacy policy. Links to WhatsApp and social networks are
        subject to those services&rsquo; own policies.
      </p>
      <h2>Retention</h2>
      <p>
        We keep enquiry information only for as long as it is needed for the purposes above, or as required by law,
        after which it is deleted.
      </p>
      <h2>Your rights</h2>
      <p>
        You may ask us to access, correct or erase your personal information, or withdraw your consent to being
        contacted, at any time. Contact us at <a href={mailLink}>{site.email}</a> or{" "}
        <a href={telLink}>{site.phone.display}</a>.
      </p>
      <h2>Contact</h2>
      <p>
        {site.legalName}, {site.address.lines.join(", ")}, {site.address.city} {site.address.postalCode}.
      </p>
    </LegalPage>
  );
}
