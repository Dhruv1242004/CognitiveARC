"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const navLinks = [
    { label: "Execution", href: "#execution-trace" },
    { label: "Architecture", href: "#architecture" },
    { label: "Metrics", href: "#metrics" },
    { label: "Demo", href: "#demo" },
    { label: "Infra", href: "#infra" },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? "border-b border-[var(--border-muted)] bg-[rgba(7,10,16,0.84)] backdrop-blur-xl"
                : "bg-transparent"
                }`}
        >
            <div className="mx-auto flex h-[4.65rem] max-w-7xl items-center justify-between px-6">
                {/* Logo */}
                <a href="#" className="group inline-flex items-center">
                    <Image
                        src="/cognitiveARC.png"
                        alt="CognitiveARC"
                        width={180}
                        height={48}
                        className="h-10 md:h-12 w-auto object-contain opacity-95 group-hover:opacity-100 transition-opacity"
                    />
                </a>

                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
                        >
                            {link.label}
                        </a>
                    ))}
                    <a
                        href="https://github.com/Dhruv1242004/CognitiveARC"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-tertiary"
                    >
                        View Source
                    </a>
                </div>

                {/* Mobile toggle */}
                <button
                    className="md:hidden text-[var(--text-secondary)]"
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="border-t border-[var(--border-muted)] bg-[rgba(7,10,16,0.94)] md:hidden">
                    <div className="flex flex-col gap-3 px-6 py-4">
                        {navLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1.5"
                                onClick={() => setMobileOpen(false)}
                            >
                                {link.label}
                            </a>
                        ))}
                        <a
                            href="https://github.com/Dhruv1242004/CognitiveARC"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-tertiary mt-1 w-fit"
                        >
                            View Source
                        </a>
                    </div>
                </div>
            )}
        </nav>
    );
}
