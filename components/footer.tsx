'use client'

const footerLinks = {
    Product: [
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
    ],
    Company: [
        { label: 'Contact', href: '#contact' },
        { label: 'About Us', href: '#about' },
    ],
    Legal: [
        { label: 'Privacy Policy', href: '#privacy' },
        { label: 'Terms of Use', href: '#terms' },
    ],
}

function handleSmoothScroll(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (href.startsWith('#')) {
        e.preventDefault()
        const el = document.querySelector(href)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' })
        }
    }
}

export default function Footer() {
    return (
        <footer className="border-t border-white/10 bg-[#0d1117] text-white">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Brand */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold tracking-tight">
                            ACADIFY
                        </h2>
                        <p className="max-w-xs text-sm leading-relaxed text-gray-400">
                            A modern digital platform for schools. Simplifying academic operations and communication for everyone.
                        </p>
                    </div>

                    {/* Link columns */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                                {title}
                            </h3>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        <a
                                            href={link.href}
                                            onClick={(e) => handleSmoothScroll(e, link.href)}
                                            className="text-sm text-gray-400 transition-colors duration-200 hover:text-white">
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-white/10">
                <div className="mx-auto max-w-7xl px-6 py-5">
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} Acadify. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}