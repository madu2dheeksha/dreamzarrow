import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { mailLink, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: `The terms that apply to your use of the ${site.name} website.`,
  alternates: { canonical: "/terms" },
};

/* Have these terms reviewed by your legal adviser before launch. */
export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="21 November 2026">
      <p>
        This website is operated by {site.legalName}. By using it you agree to these terms. If you do not agree, please
        do not use the site.
      </p>
      <h2>Property information</h2>
      <p>
        Listings, photographs, specifications, amenities and prices are provided in good faith, based on information
        from owners, landlords and developers. They are for general information only, do not form part of any offer
        or contract, and may change or be withdrawn without notice. Please verify all details with our team and through
        your own due diligence before making any decision.
      </p>
      <h2>No investment advice guarantee</h2>
      <p>
        Any commentary on locations, demand or investment potential reflects our opinion at the time and is not a
        guarantee of future value, rental income or returns.
      </p>
      <h2>Enquiries</h2>
      <p>
        Submitting an enquiry does not create an agency or advisory agreement. Any engagement, including fees, will be
        agreed with you separately and in writing.
      </p>
      <h2>Intellectual property</h2>
      <p>
        The content of this website, including text, photographs and branding, belongs to {site.name} or its licensors
        and may not be reproduced without permission.
      </p>
      <h2>External links</h2>
      <p>
        This site links to services such as WhatsApp, YouTube, Google Maps and social networks. We are not responsible
        for their content or practices.
      </p>
      <h2>Liability</h2>
      <p>
        To the extent permitted by law, we are not liable for any loss arising from reliance on information on this
        website.
      </p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India, and the courts of Hyderabad, Telangana have jurisdiction.</p>
      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent to <a href={mailLink}>{site.email}</a>. See also our{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>
    </LegalPage>
  );
}
