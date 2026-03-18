import { Card } from "@components/ui";

export function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-[#2D0F35] sm:text-5xl tracking-tight">
            Terms and Conditions
          </h1>
          <p className="mt-4 text-lg text-neutral-600">Last updated: March 18, 2026</p>
        </div>

        <Card padding="none" className="bg-white shadow-xl rounded-3xl overflow-hidden">
          <div className="p-8 sm:p-12 space-y-8 text-neutral-800 leading-relaxed">
            <section>
              <p className="text-lg">
                Welcome to the SeekKrr Creator Portal! These Terms and Conditions ("Terms") govern
                your access to and use of the SeekKrr Creator Portal. By registering as a Creator
                and submitting content, you agree to be bound by these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-indigo-900 mb-4">1. The Creator Role</h2>
              <p>
                As a contributor to the SeekKrr platform, you are granted access to our Creator
                Portal to design, upload, and publish self-guided quests, including clues, location
                data, and associated media ("Creator Content"). Your primary objective is to develop
                engaging, gamified travel experiences optimized for solo travelers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-indigo-900 mb-4">
                2. Content Guidelines & Safety
              </h2>
              <p className="mb-4">
                All Creator Content must adhere to SeekKrr’s quality and safety standards. By
                submitting a quest, you represent and warrant that:
              </p>
              <ul className="list-disc pl-6 space-y-4">
                <li>
                  <span className="font-semibold">Accuracy:</span> All location coordinates,
                  descriptions, and clues are accurate, operational, and verifiable.
                </li>
                <li>
                  <span className="font-semibold">Safety:</span> Quests must not direct users into
                  hazardous areas, private property (trespassing), restricted zones, or legally
                  questionable locations. Particular attention must be paid to terrain and
                  environmental conditions (e.g., seasonal accessibility).
                </li>
                <li>
                  <span className="font-semibold">Appropriateness:</span> Content must be suitable
                  for our core demographic (young adults, ages 17–50) and must not contain any
                  illegal, hateful, explicit, or discriminatory material.
                </li>
                <li>
                  <span className="font-semibold">Feasibility:</span> All challenges and clues must
                  be solvable within the context of the quest without requiring specialized,
                  undisclosed equipment.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-indigo-900 mb-4">
                3. Intellectual Property and Licensing
              </h2>
              <ul className="list-disc pl-6 space-y-4">
                <li>
                  <span className="font-semibold">Ownership:</span> You retain all ownership rights
                  to the original text, imagery, and concepts you create.
                </li>
                <li>
                  <span className="font-semibold">License Grant:</span> By publishing Creator
                  Content on the portal, you grant SeekKrr a worldwide, royalty-free,
                  non-exclusive, sub-licensable license to use, reproduce, modify, adapt, publish,
                  and distribute your quests across our mobile applications and marketing channels.
                </li>
                <li>
                  <span className="font-semibold">Non-Infringement:</span> You warrant that your
                  content does not infringe upon the intellectual property rights of any third
                  party. You must possess the necessary rights for all media uploaded.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-indigo-900 mb-4">
                4. Review and Approval Process
              </h2>
              <p className="mb-4">
                SeekKrr reserves the right to review and moderate all submissions. We may:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Request revisions to improve gameplay flow or clarity.</li>
                <li>Reject or remove content that fails to meet safety or quality benchmarks.</li>
                <li>
                  Temporarily suspend quests in response to reported hazards or environmental
                  changes.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-indigo-900 mb-4">
                5. Compensation and Monetization
              </h2>
              <p>
                During the current MVP (Minimum Viable Product) phase, participation in the Creator
                Portal is voluntary. Creators will receive prominent platform attribution for their
                published work.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-indigo-900 mb-4">
                6. Liability and Indemnification
              </h2>
              <ul className="list-disc pl-6 space-y-4">
                <li>
                  <span className="font-semibold">Inherent Risk:</span> You acknowledge that outdoor
                  travel and exploration involve inherent risks.
                </li>
                <li>
                  <span className="font-semibold">Indemnity:</span> You agree to indemnify and hold
                  SeekKrr, its affiliates, and employees harmless from any claims or damages arising
                  from users participating in quests you have designed.
                </li>
                <li>
                  <span className="font-semibold">Disclaimer:</span> SeekKrr is not liable for any
                  injuries, property damage, or legal disputes encountered by travelers interacting
                  with your Creator Content.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-indigo-900 mb-4">7. Account Termination</h2>
              <p>
                SeekKrr may suspend or terminate access to the Creator Portal at its discretion for
                violations of these Terms, actions that jeopardize user safety, or conduct that may
                harm the platform’s reputation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-indigo-900 mb-4">8. Amendments</h2>
              <p>
                These Terms may be updated as the platform evolves. Significant changes will be
                communicated via your registered email. Continued use of the Portal following such
                updates constitutes acceptance of the revised Terms.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </div>
  );
}
