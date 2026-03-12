import { HeroHeader } from '@/components/header'
import BookDemo from '@/components/book-demo'
import Footer from '@/components/footer'

export default function TermsOfServicePage() {
    return (
        <>
            <BookDemo />
            <HeroHeader />
            <main className="relative min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-24 pb-24">

                {/* Hero banner */}
                <div className="mx-auto max-w-3xl px-6 mb-8">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 px-10 py-8">
                        <p className="text-sm font-semibold uppercase tracking-widest text-primary/60 mb-3">
                            Legal
                        </p>
                        <h1 className="text-4xl font-bold text-primary md:text-5xl">
                            Terms of Service
                        </h1>
                        <p className="mt-4 max-w-xl text-muted-foreground text-lg">
                            Last updated: March 2026
                        </p>
                    </div>
                </div>

                {/* Content card */}
                <div className="mx-auto max-w-3xl px-6">
                    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-8 py-10 md:px-12 md:py-12 space-y-10 text-base leading-relaxed text-gray-600 md:text-lg">

                        {/* 1. Acceptance of Terms */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using the Acadify platform, you confirm that you have read,
                                understood, and agree to be bound by these Terms of Service. If you are using
                                Acadify on behalf of a school or organization, you represent that you have the
                                authority to bind that organization to these terms.
                            </p>
                            <p>
                                If you do not agree to these terms, you must not access or use the platform.
                            </p>
                        </div>

                        {/* 2. Description of Service */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">2. Description of Service</h2>
                            <p>
                                Acadify is a cloud-based school management platform that provides tools for
                                managing student and teacher records, attendance, fee tracking, academic results,
                                and internal communication — all within a single unified system.
                            </p>
                            <p>
                                We reserve the right to modify, suspend, or discontinue any aspect of the service
                                at any time. We will provide reasonable notice to active users before making
                                material changes.
                            </p>
                        </div>

                        {/* 3. Accounts & Access */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">3. Accounts &amp; Access</h2>
                            <p>
                                To use Acadify, an account must be created by an authorized school administrator.
                                You agree to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-2">
                                <li>Provide accurate and up-to-date information when registering</li>
                                <li>Keep your login credentials confidential and not share them with others</li>
                                <li>Notify us immediately of any unauthorized access to your account</li>
                                <li>Take responsibility for all activity that occurs under your account</li>
                            </ul>
                        </div>

                        {/* 4. Permitted Use */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">4. Permitted Use</h2>
                            <p>
                                Acadify is intended exclusively for use by educational institutions, including
                                schools, academies, and tutoring centers. You may use the platform only for
                                lawful purposes and in accordance with these terms. You agree not to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-2">
                                <li>Reverse engineer, decompile, or attempt to access the source code of the platform</li>
                                <li>Use automated tools to scrape, extract, or index content from the platform</li>
                                <li>Resell or sublicense access to Acadify without our written permission</li>
                                <li>Use the platform in any way that could damage, overload, or impair our infrastructure</li>
                            </ul>
                        </div>

                        {/* 5. Prohibited Activities */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">5. Prohibited Activities</h2>
                            <p>
                                The following activities are strictly prohibited on the Acadify platform:
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-2">
                                <li>Uploading or transmitting malicious code, viruses, or harmful content</li>
                                <li>Attempting to gain unauthorized access to other accounts or our systems</li>
                                <li>Entering false, misleading, or fraudulent data into the platform</li>
                                <li>Harassing, threatening, or abusing other users of the platform</li>
                                <li>Using the platform for any purpose that violates applicable laws or regulations</li>
                                <li>Interfering with the security or integrity of the platform or its data</li>
                            </ul>
                            <p>
                                Violations may result in immediate suspension or termination of your account.
                            </p>
                        </div>

                        {/* 6. Intellectual Property */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">6. Intellectual Property</h2>
                            <p>
                                All software, design, branding, trademarks, and content that form part of the
                                Acadify platform are the exclusive intellectual property of Acadify and its
                                developers. Nothing in these terms grants you any right to use our trademarks,
                                logos, or proprietary materials without our prior written consent.
                            </p>
                        </div>

                        {/* 7. Data Ownership */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">7. Data Ownership</h2>
                            <p>
                                All data you upload to Acadify — including student records, academic data, and
                                institutional information — remains the property of your school or organization.
                                Acadify does not claim any ownership over your data.
                            </p>
                            <p>
                                By using the platform, you grant Acadify a limited license to store, process, and
                                display your data solely for the purpose of providing the service to you.
                            </p>
                        </div>

                        {/* 8. Limitation of Liability */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">8. Limitation of Liability</h2>
                            <p>
                                The Acadify platform is provided &ldquo;as is&rdquo; without warranties of any kind, either
                                express or implied, including but not limited to warranties of merchantability,
                                fitness for a particular purpose, or non-infringement.
                            </p>
                            <p>
                                To the maximum extent permitted by applicable law, Acadify shall not be liable
                                for any indirect, incidental, special, consequential, or punitive damages arising
                                from your use of or inability to use the platform, even if we have been advised
                                of the possibility of such damages.
                            </p>
                        </div>

                        {/* 9. Termination */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">9. Termination</h2>
                            <p>
                                Either party may terminate the use of Acadify at any time. You may stop using
                                the platform and request account closure by contacting our support team.
                            </p>
                            <p>
                                We reserve the right to suspend or terminate your access without notice if we
                                determine that you have violated these Terms of Service. Upon termination, you
                                will have a 30-day window to request an export of your data before it is
                                permanently deleted from our systems.
                            </p>
                        </div>

                        {/* 10. Governing Law */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">10. Governing Law</h2>
                            <p>
                                These Terms of Service are governed by and construed in accordance with the
                                laws of India. Any disputes arising under or in connection with these terms
                                shall be subject to the exclusive jurisdiction of the courts located in India.
                            </p>
                        </div>

                        {/* 11. Changes to Terms */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">11. Changes to These Terms</h2>
                            <p>
                                We may revise these Terms of Service from time to time. When we make material
                                changes, we will notify active users via email or through a notice displayed
                                within the platform. Continued use of Acadify after the effective date of the
                                revised terms constitutes your acceptance of the changes.
                            </p>
                        </div>

                        {/* 12. Contact */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">12. Contact Us</h2>
                            <p>
                                If you have any questions about these Terms of Service or need clarification
                                on any of the above, please reach out to us:
                            </p>
                            <p>
                                <span className="font-medium text-gray-700">Email:</span>{' '}
                                <a href="mailto:acadify.tech@gmail.com" className="text-primary hover:underline font-medium">
                                    acadify.tech@gmail.com
                                </a>
                            </p>
                        </div>

                    </div>
                </div>

            </main>
            <Footer />
        </>
    )
}
