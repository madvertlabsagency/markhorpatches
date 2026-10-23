/**
 * Policy drafts. These are written to describe how the software actually behaves, but they are
 * NOT legal advice and have not been reviewed by counsel. Each page displays a review notice.
 */
export interface LegalDoc {
  slug: string;
  title: string;
  summary: string;
  body: React.ReactNode;
}

const Updated = "Draft v0.1 — October 2026";

export const LEGAL: Record<string, LegalDoc> = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "What we collect, why, who we share it with and your choices.",
    body: (
      <>
        <h2>Who we are</h2>
        <p>PatchMatch AI (“we”) operates a sourcing marketplace that connects buyers of custom patches with independent manufacturers. The operating entity, registered address and data-protection contact will be inserted here once confirmed.</p>
        <h2>Information we collect</h2>
        <ul>
          <li><strong>Buyer requests:</strong> patch specifications, artwork files, delivery region and postal code, deadline, budget and notes.</li>
          <li><strong>Contact details:</strong> name, company, email, phone, website and preferred contact method.</li>
          <li><strong>Accounts:</strong> login email, hashed password, optional two-factor settings, organization membership.</li>
          <li><strong>Manufacturers:</strong> business details, verification documents, factory photos, portfolio, capabilities and billing records.</li>
          <li><strong>Technical data:</strong> IP address, user agent, security logs and first-party analytics events; marketing attribution parameters (UTM, click IDs).</li>
        </ul>
        <h2>How we use it</h2>
        <ul>
          <li>To verify, review, qualify and match requests with manufacturers.</li>
          <li>To share request information with manufacturers <strong>only as described in the Data Sharing Policy and the consent you give for each request</strong>.</li>
          <li>To operate accounts, messaging, notifications, billing, fraud prevention and support.</li>
          <li>To send marketing only if you opt in (unchecked by default).</li>
        </ul>
        <h2>Automated processing</h2>
        <p>We use rules and, where configured, AI services to summarise requests, flag missing details and rank manufacturers. Buyer contact details and original artwork are not sent to AI providers. People review qualification and verification decisions.</p>
        <h2>Cross-border processing</h2>
        <p>Our team and many manufacturers are located outside the United States (including Pakistan). Information you approve for sharing may be transferred to and processed in those countries. Safeguards for such transfers are pending legal review.</p>
        <h2>Retention</h2>
        <p>Requests and associated files are retained for the period needed to provide the service and meet legal obligations; specific retention periods will be published after review. You can request deletion subject to records we must keep (for example financial records).</p>
        <h2>Your rights</h2>
        <p>Depending on where you live you may have rights to access, correct, delete or object to processing of your data. Contact us via the contact page and mention “privacy request”.</p>
        <h2>Security</h2>
        <p>Private file storage, expiring signed download links, role-based access, audit logs and encryption in transit. No system is perfectly secure.</p>
      </>
    ),
  },
  terms: {
    slug: "terms",
    title: "Terms of Service",
    summary: "General terms for using PatchMatch AI.",
    body: (
      <>
        <h2>The service</h2>
        <p>PatchMatch AI provides a platform for buyers to submit requests for quotation (RFQs) and for verified manufacturers to access qualified RFQs. We do not manufacture products, are not a party to agreements between buyers and manufacturers, and do not process payments for manufacturing orders.</p>
        <h2>Accounts</h2>
        <p>You must provide accurate information and keep your credentials secure. Staff accounts require two-factor authentication.</p>
        <h2>Acceptable use</h2>
        <ul>
          <li>No false, fraudulent, spam or duplicate requests.</li>
          <li>No harvesting of contact details or circumventing disclosure controls.</li>
          <li>No uploading of content you do not have rights to, or that infringes others' trademarks or copyrights.</li>
        </ul>
        <h2>Disclaimers</h2>
        <p>Manufacturer verification reduces risk but is not a guarantee of quality, delivery or conduct. Lead times and prices are provided by manufacturers. AI-generated content is advisory.</p>
        <h2>Liability</h2>
        <p>Limitations of liability, governing law and dispute resolution terms are pending legal review.</p>
      </>
    ),
  },
  "buyer-terms": {
    slug: "buyer-terms",
    title: "Buyer Terms",
    summary: "Terms for submitting RFQs.",
    body: (
      <>
        <h2>Free for buyers</h2>
        <p>Submitting requests, receiving quotations and messaging manufacturers is free. You are never obliged to accept a quotation.</p>
        <h2>Your request</h2>
        <p>You confirm the request is genuine and that you have the right to share the artwork. You must verify your email before a request is reviewed.</p>
        <h2>Sharing with manufacturers</h2>
        <p>Before purchase, manufacturers see only an anonymised summary. Your contact details and original artwork are released only to verified manufacturers that purchase access, within the recipient limit and disclosure mode you choose. See the Data Sharing Policy.</p>
        <h2>Agreements with manufacturers</h2>
        <p>Any order, payment, shipping or warranty is agreed directly between you and the manufacturer. Report problems to us — we may restrict manufacturers who breach our standards.</p>
      </>
    ),
  },
  "seller-terms": {
    slug: "seller-terms",
    title: "Seller Terms",
    summary: "Terms for manufacturers purchasing RFQ access.",
    body: (
      <>
        <h2>Pay per qualified RFQ</h2>
        <p>Manufacturers pay the unlock fee displayed on an opportunity to access that RFQ. There is no subscription and no commission on orders. Prices are fixed at publication and shown before purchase.</p>
        <h2>No guaranteed order</h2>
        <p>An RFQ is a buying opportunity, not a guaranteed sale, customer or profit. Buyers may choose other suppliers or not proceed.</p>
        <h2>Use of buyer information</h2>
        <ul>
          <li>Use buyer details only to respond to that RFQ.</li>
          <li>Do not resell, share or add buyers to marketing lists without their separate consent.</li>
          <li>Respect platform-messaging-only requests: do not attempt to obtain direct contact details.</li>
        </ul>
        <h2>Verification and conduct</h2>
        <p>Information you provide must be accurate. We may suspend accounts for misrepresentation, misuse of buyer data, or repeated upheld complaints.</p>
        <h2>Payments, credits and claims</h2>
        <p>Purchases are charged through the payment method shown at checkout or deducted from prepaid credits. Quality claims are handled under the RFQ Quality Policy.</p>
      </>
    ),
  },
  "rfq-quality-policy": {
    slug: "rfq-quality-policy",
    title: "RFQ Quality Policy",
    summary: "What a qualified RFQ is, and when sellers receive credits or refunds.",
    body: (
      <>
        <h2>Qualification tiers</h2>
        <ul>
          <li><strong>Tier A — Production ready:</strong> clear requirements, verified email, credible intent and enough detail to quote.</li>
          <li><strong>Tier B — Qualified, needs clarification:</strong> legitimate buyer with some missing details.</li>
          <li><strong>Tier C — Research stage:</strong> exploring options. <em>Not sold.</em></li>
          <li><strong>Tier D — Invalid:</strong> spam, fraudulent, duplicate or unusable. <em>Never sold.</em></li>
        </ul>
        <p>Only Tier A and Tier B RFQs with a verified buyer email and buyer consent are offered to manufacturers. Small businesses and free email providers are not penalised.</p>
        <h2>Eligible claims (within 7 days of purchase)</h2>
        <ul>
          <li>Invalid contact details (bounced email and unreachable phone).</li>
          <li>Duplicate of an RFQ you already purchased.</li>
          <li>Spam or fraudulent request.</li>
          <li>Request materially different from the description shown before purchase.</li>
        </ul>
        <h2>Not eligible</h2>
        <ul>
          <li>The buyer chose another supplier, didn't reply after valid contact, or rejected your price.</li>
          <li>Information disclosed in the preview that you could have assessed before purchasing.</li>
        </ul>
        <h2>Outcomes</h2>
        <p>Our team reviews evidence and records a decision: credit to your prepaid balance, refund to the original payment method where supported, or claim not upheld with a reason.</p>
      </>
    ),
  },
  "data-sharing-policy": {
    slug: "data-sharing-policy",
    title: "Data Sharing Policy",
    summary: "Exactly which buyer information manufacturers can see, and when.",
    body: (
      <>
        <h2>Before purchase (anonymised preview)</h2>
        <ul>
          <li>Shared: patch type, intended use, size, quantity, backing, colours, finishes, destination country and state/region, deadline, budget if disclosed, an automated summary, and a blurred low-resolution artwork preview with metadata removed.</li>
          <li>Never shared: name, company, email, phone, website, postal code, original artwork, or contact details written in notes (automatically masked).</li>
        </ul>
        <h2>After a verified purchase</h2>
        <ul>
          <li><strong>“Share my contact details”</strong>: name, company, email, phone, website, postal code, full notes and original artwork.</li>
          <li><strong>“PatchMatch messaging only”</strong>: name, company, full specifications and original artwork. Email, phone and website are withheld, and contact details typed in messages are masked.</li>
        </ul>
        <h2>Recipient limit</h2>
        <p>By default only one manufacturer can purchase access to your request (exclusive). Any higher limit requires your explicit consent at submission.</p>
        <h2>Records</h2>
        <p>Every disclosure is logged with the manufacturer, fields released and time. A payment attempt alone never releases information — only a payment confirmed by the payment provider or a completed credit purchase.</p>
        <h2>Advertising platforms</h2>
        <p>We never send artwork or buyer contact details to advertising platforms. Conversion events contain only event names and non-identifying parameters.</p>
      </>
    ),
  },
};

export const LEGAL_UPDATED = Updated;
