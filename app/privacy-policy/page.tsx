import { HeroHeader } from '@/components/header'
import BookDemo from '@/components/book-demo'
import Footer from '@/components/footer'

export default function PrivacyPolicyPage() {
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
                            Privacy Policy
                        </h1>
                        <p className="mt-4 max-w-xl text-muted-foreground text-lg">
                            Last updated: March 2026
                        </p>
                    </div>
                </div>

                {/* Content card */}
                <div className="mx-auto max-w-3xl px-6">
                    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-8 py-10 md:px-12 md:py-12 space-y-10 text-base leading-relaxed text-gray-600 md:text-lg">

                        {/* 1. Introduction */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
                            <p>
                                Welcome to Acadify. We are committed to protecting the privacy of the schools,
                                administrators, teachers, students, and parents who use our platform. This Privacy
                                Policy explains what information we collect, how we use it, and what rights you have
                                in relation to it.
                            </p>
                            <p>
                                By accessing or using Acadify, you agree to the practices described in this policy.
                                If you do not agree, please discontinue use of the platform.
                            </p>
                        </div>

                        {/* 2. Information We Collect */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">2. Information We Collect</h2>
                            <p>
                                We collect information that is necessary to provide and improve our services:
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-2">
                                <li>
                                    <span className="font-medium text-gray-700">Account Information:</span> School name,
                                    administrator name, email address, and credentials used to create and manage accounts.
                                </li>
                                <li>
                                    <span className="font-medium text-gray-700">User Data:</span> Student and teacher
                                    records, including names, roll numbers, class assignments, attendance logs, and
                                    performance data entered by school administrators.
                                </li>
                                <li>
                                    <span className="font-medium text-gray-700">Usage Data:</span> Pages visited, features
                                    used, timestamps of activity, and device/browser information to help us understand
                                    how the platform is being used.
                                </li>
                                <li>
                                    <span className="font-medium text-gray-700">Communication Data:</span> Any messages
                                    or inquiries you send to our support team.
                                </li>
                            </ul>
                        </div>

                        {/* 3. How We Use Your Information */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">3. How We Use Your Information</h2>
                            <p>
                                We use the information we collect for the following purposes:
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-2">
                                <li>To provide, operate, and maintain the Acadify platform</li>
                                <li>To authenticate users and manage access controls</li>
                                <li>To generate reports, credentials, and other school documents</li>
                                <li>To improve platform features and fix bugs based on usage patterns</li>
                                <li>To send important service updates, security alerts, and support responses</li>
                                <li>To detect, investigate, and prevent fraudulent or unauthorized activity</li>
                            </ul>
                            <p>
                                We do not use your data for advertising purposes, and we do not build advertising
                                profiles from user activity on Acadify.
                            </p>
                        </div>

                        {/* 4. Data Sharing */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">4. Data Sharing</h2>
                            <p>
                                We do not sell, rent, or trade your data to third parties. We may share information
                                only in the following limited circumstances:
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-2">
                                <li>
                                    <span className="font-medium text-gray-700">Infrastructure Providers:</span> We use
                                    trusted cloud service providers to host and operate the platform. These providers
                                    are bound by strict data processing agreements and are not permitted to use your
                                    data for their own purposes.
                                </li>
                                <li>
                                    <span className="font-medium text-gray-700">Legal Requirements:</span> We may disclose
                                    information if required to do so by law or in response to valid requests by public
                                    authorities.
                                </li>
                            </ul>
                        </div>

                        {/* 5. Data Security */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">5. Data Security</h2>
                            <p>
                                We take the security of your data seriously. All data transmitted between your browser
                                and our servers is encrypted using industry-standard TLS. Passwords are hashed using
                                bcrypt and are never stored in plain text. Access to production data is restricted to
                                authorized personnel only.
                            </p>
                            <p>
                                While we implement strong safeguards, no system is completely immune to security
                                threats. We encourage users to use strong, unique passwords and to report any
                                suspicious activity to our team immediately.
                            </p>
                        </div>

                        {/* 6. Data Retention */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">6. Data Retention</h2>
                            <p>
                                We retain your data for as long as your account remains active or as needed to provide
                                you with our services. If you choose to close your account, you may request deletion
                                of your data by contacting us. We will process deletion requests within 30 days of
                                account closure, except where retention is required by law.
                            </p>
                        </div>

                        {/* 7. Cookies */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">7. Cookies</h2>
                            <p>
                                Acadify uses session cookies to keep you logged in and to maintain your preferences
                                across sessions. These cookies are essential to the functioning of the platform and
                                cannot be disabled without affecting your ability to use the service.
                            </p>
                            <p>
                                We may also use analytics cookies to understand how users interact with the platform.
                                These cookies do not collect personally identifiable information and can be declined
                                through your browser settings.
                            </p>
                        </div>

                        {/* 8. Your Rights */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">8. Your Rights</h2>
                            <p>
                                Depending on your location, you may have rights with respect to the personal
                                information we hold about you, including:
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-2">
                                <li>The right to access your personal data</li>
                                <li>The right to correct inaccurate or incomplete data</li>
                                <li>The right to request deletion of your data</li>
                                <li>The right to data portability (export your data in a readable format)</li>
                            </ul>
                            <p>
                                To exercise any of these rights, please contact us at{' '}
                                <a href="mailto:acadify.tech@gmail.com" className="text-primary hover:underline font-medium">
                                    acadify.tech@gmail.com
                                </a>
                                . We will respond to all requests within a reasonable timeframe.
                            </p>
                        </div>

                        {/* 9. Changes to This Policy */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">9. Changes to This Policy</h2>
                            <p>
                                We may update this Privacy Policy from time to time to reflect changes in our
                                practices or for legal, operational, or regulatory reasons. When we make material
                                changes, we will notify registered users via email or through a prominent notice
                                within the platform. We encourage you to review this policy periodically.
                            </p>
                        </div>

                        {/* 10. Contact */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900">10. Contact Us</h2>
                            <p>
                                If you have any questions, concerns, or requests related to this Privacy Policy,
                                please reach out to us:
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
