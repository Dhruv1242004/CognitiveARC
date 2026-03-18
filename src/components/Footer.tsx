import Image from "next/image";

export default function Footer() {
    return (
        <footer className="border-t border-[var(--border-muted)] py-8">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
                <a href="#" className="inline-flex items-center gap-2.5">
                    <Image
                        src="/cognitiveARC.png"
                        alt="CognitiveARC"
                        width={140}
                        height={36}
                        className="h-8 md:h-9 w-auto object-contain opacity-95"
                    />
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                        CognitiveARC
                    </span>
                </a>
                <span className="text-xs text-[var(--text-dim)]">
                    © {new Date().getFullYear()} CognitiveARC. Systems-first AI product engineering, retrieval visibility, and deployable architecture.
                </span>
            </div>
        </footer>
    );
}
