import { Link } from "wouter";
import { useConfig } from "@/contexts/ConfigContext";

export function Footer() {
  const { config } = useConfig();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
                {config.siteName.charAt(0)}
              </div>
              <span className="font-semibold">{config.siteName}</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              {config.tagline}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/packages" className="text-muted-foreground hover:text-foreground transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {config.contactEmail && (
                <li>
                  <a href={`mailto:${config.contactEmail}`} className="hover:text-foreground transition-colors">
                    {config.contactEmail}
                  </a>
                </li>
              )}
              {config.contactPhone && (
                <li>
                  <a href={`tel:${config.contactPhone}`} className="hover:text-foreground transition-colors">
                    {config.contactPhone}
                  </a>
                </li>
              )}
              {config.address && <li>{config.address}</li>}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} {config.siteName}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            White-label platform template
          </p>
        </div>
      </div>
    </footer>
  );
}
