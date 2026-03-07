"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
    { label: "Architecture", href: "#architecture" },
    { label: "Capabilities", href: "#capabilities" },
    { label: "Tech Stack", href: "#tech-stack" },
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
                ? "bg-[#08090d]/90 backdrop-blur-md border-b border-[var(--border-subtle)]"
                : "bg-transparent"
                }`}
        >
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <a href="#" className="group inline-flex items-center">
                    <img
                        src="/cognitiveARC.png"
                        alt="CognitiveARC"
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
                        href="https://github.com/Dhruv1242004"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary text-sm py-2 px-4"
                    >
                        Explore My Github
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
                <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                    <div className="px-6 py-4 flex flex-col gap-3">
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
                            href="https://github.com/Dhruv1242004"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary text-sm py-2 px-4 w-fit mt-1"
                        >
                            Explore My Github
                        </a>
                    </div>
                </div>
            )}
        </nav>
    );
}
