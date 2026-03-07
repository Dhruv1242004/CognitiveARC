export default function Footer() {
    return (
        <footer className="border-t border-[var(--border-subtle)] py-8">
            <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <a href="#" className="inline-flex items-center gap-2.5">
                    <img
                        src="/cognitiveARC.png"
                        alt="CognitiveARC"
                        className="h-8 md:h-9 w-auto object-contain opacity-95"
                    />
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                        CognitiveARC
                    </span>
                </a>
                <span className="text-xs text-[var(--text-muted)]">
                    © {new Date().getFullYear()} CognitiveARC. Built for demonstration purposes.
                </span>
            </div>
        </footer>
    );
}
