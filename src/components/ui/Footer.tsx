import { Link } from "react-router-dom";
import { Instagram, Linkedin } from "lucide-react";

const SOCIALS = {
    whatsapp: "https://chat.whatsapp.com/FZxZgnAoDdc2GpiXTW2ZWS",
    instagram: "https://www.instagram.com/seek_krr",
    linkedin: "https://www.linkedin.com/company/seekkrr",
    twitter: "https://x.com/seek_krr",
};

const socialBase =
    "p-2.5 rounded-full bg-neutral-100 text-neutral-600 transition-all duration-300 hover:text-white";

export function Footer() {
    return (
        <footer className="bg-white border-t border-neutral-200 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 md:gap-4">
                    {/* Left: branding + copyright */}
                    <div className="flex flex-col items-center md:items-start gap-1.5">
                        <span className="text-xl font-bold text-neutral-900 tracking-tight">SeekKrr</span>
                        <p className="text-sm text-neutral-500 text-center md:text-left">
                            {new Date().getFullYear()} <span className="mx-1">|</span> &copy; SOLOQUEST PRIVATE LIMITED{" "}
                            <span className="mx-1">|</span> All rights reserved.
                        </p>
                    </div>

                    {/* Center: informational links */}
                    <nav className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm text-neutral-600">
                        <Link to="/contact" className="hover:text-neutral-900 transition-colors">
                            Contact Us
                        </Link>
                        <Link to="/terms-and-conditions" className="hover:text-neutral-900 transition-colors">
                            Terms and Conditions
                        </Link>
                        <Link to="/privacy-policy" className="hover:text-neutral-900 transition-colors">
                            Privacy Policy
                        </Link>
                    </nav>

                    {/* Right: social icons */}
                    <div className="flex items-center gap-3">
                        <a
                            href={SOCIALS.whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="WhatsApp"
                            className={`${socialBase} hover:bg-[#25D366]`}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-[18px] h-[18px] fill-current">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                        </a>
                        <a
                            href={SOCIALS.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            className={`${socialBase} hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#e6683c] hover:to-[#bc1888]`}
                        >
                            <Instagram className="w-[18px] h-[18px]" />
                        </a>
                        <a
                            href={SOCIALS.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn"
                            className={`${socialBase} hover:bg-[#0077B5]`}
                        >
                            <Linkedin className="w-[18px] h-[18px]" />
                        </a>
                        <a
                            href={SOCIALS.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="X (Twitter)"
                            className={`${socialBase} hover:bg-black`}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-[18px] h-[18px] fill-current">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
